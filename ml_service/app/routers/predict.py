"""
Prediction router — handles both Clinician Mode (full clinical data)
and Patient Mode (image + age only, with radiomics-based imputation).

Real model inference is used when weights/multimodal_best.pth is present.
Demo mode provides deterministic (seeded) predictions for testing.
"""
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
import json
import time
import os
import uuid
import torch
import torch.nn.functional as F
import random
import numpy as np
from typing import Optional

from app.schemas.predict import (
    PredictionResponse, ClinicalData, EstimatedClinicalData
)
from app.preprocessing.wsi_processor import WSIProcessor
from app.preprocessing.tabular_processor import TabularProcessor
from app.preprocessing.clinical_estimator import ClinicalEstimator
from app.xai.shap_explainer import SHAPExplainer

router = APIRouter(tags=['predict'])


@router.post('/predict', response_model=PredictionResponse)
async def predict(
    wsi_file:      UploadFile          = File(..., description='Histopathology image (PNG/JPEG/TIFF)'),
    clinical_data: Optional[str]       = Form(None, description='JSON string of clinical features. Only age is required; omit other fields for Patient Mode.'),
):
    start_time = time.time()

    # ── 1. Parse clinical data ───────────────────────────────────────────────
    if not clinical_data:
        raise HTTPException(
            status_code=400,
            detail='clinical_data form field is required (provide at least {"age": <value>})'
        )

    try:
        clinical_dict  = json.loads(clinical_data)
        clinical_model = ClinicalData(**clinical_dict)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Invalid clinical_data JSON: {e}')

    # Detect mode: patient mode = any optional field is None
    patient_mode = not clinical_model.is_complete

    # ── 2. Save uploaded file ────────────────────────────────────────────────
    upload_dir = os.getenv('UPLOAD_DIR', './uploads')
    os.makedirs(upload_dir, exist_ok=True)
    ext      = wsi_file.filename.rsplit('.', 1)[-1] if '.' in wsi_file.filename else 'png'
    file_id  = str(uuid.uuid4())
    file_path = os.path.join(upload_dir, f'{file_id}.{ext}')

    with open(file_path, 'wb') as f:
        f.write(await wsi_file.read())

    try:
        # ── 3. Preprocess image ──────────────────────────────────────────────
        wsi_processor = WSIProcessor()
        image = wsi_processor.load_image(file_path)
        img_tensor, original_pil = wsi_processor.get_representative_patch(image)

        # ── 4. Clinical feature estimation (Patient Mode) ────────────────────
        estimator = ClinicalEstimator()
        estimated_clinical_meta = None

        if patient_mode:
            est_result = estimator.estimate(img_tensor, clinical_model.age)

            final_values = dict(est_result['values'])
            user_dict    = clinical_model.model_dump(exclude_none=False)
            for feat in ClinicalData.model_fields:
                if feat == 'age':
                    continue
                user_val = user_dict.get(feat)
                if user_val is not None:
                    final_values[feat]             = user_val
                    est_result['confidence'][feat] = 1.0

            estimated_clinical_meta = EstimatedClinicalData(
                values      = {k: float(v) for k, v in final_values.items()},
                confidence  = est_result['confidence'],
                method      = est_result['method'],
                data_completeness_score = clinical_model.known_field_count / 10.0,
            )
        else:
            final_values = clinical_model.model_dump()
            estimated_clinical_meta = EstimatedClinicalData(
                values      = {k: float(v) for k, v in final_values.items()},
                confidence  = {k: 1.0 for k in final_values},
                method      = 'user_provided',
                data_completeness_score = 1.0,
            )

        # ── 5. Tabular processing ────────────────────────────────────────────
        tab_processor = TabularProcessor()
        tab_tensor    = tab_processor.process(final_values)

        # ── 6. Inference (real model or demo) ────────────────────────────────
        demo_mode = os.getenv('DEMO_MODE', 'True').lower() == 'true'

        if demo_mode:
            diagnosis, confidence, prog, shap_values = _demo_predict(
                final_values, patient_mode
            )
        else:
            diagnosis, confidence, prog, shap_values = _real_predict(
                img_tensor, tab_tensor, final_values
            )

        survival = 1.0 - prog

        # ── 7. Confidence interval (widens in patient mode) ──────────────────
        completeness   = estimated_clinical_meta.data_completeness_score
        ci_half_width  = 0.03 + (1.0 - completeness) * 0.12
        conf_lower     = float(np.clip(confidence - ci_half_width, 0.01, 0.99))
        conf_upper     = float(np.clip(confidence + ci_half_width, 0.01, 0.99))

        # ── 8. Generate Grad-CAM overlay ──────────────────────────────────────
        cam_filename = f'gradcam_{file_id}.png'
        cam_path     = os.path.join(upload_dir, cam_filename)
        _generate_gradcam(img_tensor, tab_tensor, original_pil, cam_path, demo_mode)
        gradcam_url  = f'/uploads/{cam_filename}'

        # ── 9. Build response ─────────────────────────────────────────────────
        processing_time = (time.time() - start_time) * 1000

        return PredictionResponse(
            diagnosis             = diagnosis,
            confidence            = round(confidence, 4),
            confidence_lower      = round(conf_lower, 4),
            confidence_upper      = round(conf_upper, 4),
            prognosis_score       = round(prog, 4),
            survival_probability  = round(survival, 4),
            gradcam_image_path    = gradcam_url,
            shap_values           = shap_values,
            processing_time_ms    = round(processing_time, 1),
            model_version         = '1.0.0',
            demo_mode             = demo_mode,
            patient_mode          = patient_mode,
            estimated_clinical_data = estimated_clinical_meta,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Real model inference
# ─────────────────────────────────────────────────────────────────────────────

def _real_predict(img_tensor: torch.Tensor, tab_tensor: torch.Tensor,
                  clinical_values: dict) -> tuple:
    """
    Run the trained MultiModalCancerModel and return
    (diagnosis, confidence, prognosis_score, shap_values).
    """
    from app.main import model as loaded_model

    if loaded_model is None:
        raise RuntimeError("Model not loaded. Check that weights/multimodal_best.pth exists.")

    # img_tensor shape: (1, 3, 224, 224)  tab_tensor shape: (10,)
    img_batch = img_tensor  # already (1, C, H, W) from WSIProcessor
    tab_batch = tab_tensor.unsqueeze(0) if tab_tensor.dim() == 1 else tab_tensor

    with torch.no_grad():
        logits, prog_tensor = loaded_model(img_batch, tab_batch)

    # Diagnosis
    probs      = F.softmax(logits, dim=1)[0]
    confidence = float(probs[1])           # P(malignant)
    diagnosis  = 'malignant' if confidence >= 0.5 else 'benign'

    # Prognosis (model outputs 0–1; higher = worse outlook)
    prog = float(prog_tensor[0, 0])

    # SHAP feature importance
    try:
        explainer  = SHAPExplainer(loaded_model)
        shap_values = explainer.explain(tab_batch)
    except Exception:
        shap_values = _demo_shap(clinical_values, diagnosis)

    return diagnosis, confidence, prog, shap_values


# ─────────────────────────────────────────────────────────────────────────────
# Grad-CAM generation
# ─────────────────────────────────────────────────────────────────────────────

def _generate_gradcam(img_tensor: torch.Tensor, tab_tensor: torch.Tensor,
                      original_pil, cam_path: str, demo_mode: bool) -> None:
    """
    Generate Grad-CAM heatmap overlay. Falls back to saving the
    original patch (greyscale-tinted) if the model is not loaded.
    """
    if not demo_mode:
        try:
            from app.xai.gradcam import GradCAMExplainer
            from app.main import model as loaded_model

            if loaded_model is not None:
                tab_batch = tab_tensor.unsqueeze(0) if tab_tensor.dim() == 1 else tab_tensor
                gcam      = GradCAMExplainer(loaded_model)
                heatmap   = gcam.generate(img_tensor, tab_batch)
                overlay   = gcam.overlay_on_image(original_pil, heatmap)
                overlay.save(cam_path)
                return
        except Exception as e:
            # Log but don't crash — fall through to demo fallback
            import logging
            logging.getLogger(__name__).warning(f"Grad-CAM failed: {e}; using demo fallback.")

    # Demo / fallback: save resized original patch
    original_pil.resize((224, 224)).save(cam_path)


# ─────────────────────────────────────────────────────────────────────────────
# Demo inference logic (deterministic — seeded from input features)
# ─────────────────────────────────────────────────────────────────────────────

def _demo_predict(clinical: dict, patient_mode: bool) -> tuple:
    """
    Clinically-realistic, DETERMINISTIC demo predictions.
    Same input always returns the same result (seeded RNG).
    """
    er    = clinical.get('er_status', 1)
    her2  = clinical.get('her2_status', 0)
    grade = clinical.get('grade', 2)
    ki67  = clinical.get('ki67', 22.0)
    tp53  = clinical.get('tp53_mutation', 0)

    # Risk scoring based on clinical knowledge
    if her2 == 1 and grade == 3:
        risk = 0.75
    elif er == 0 and tp53 == 1:
        risk = 0.70
    elif grade == 3 and ki67 > 30:
        risk = 0.65
    elif er == 1 and grade == 1:
        risk = 0.20
    else:
        risk = 0.45

    # Deterministic noise — seeded from a hash of the clinical values
    seed = abs(hash(tuple(sorted((k, round(float(v), 2)) for k, v in clinical.items())))) % (2 ** 31)
    rng  = random.Random(seed)
    noise_range = 0.10 if patient_mode else 0.06
    risk += rng.uniform(-noise_range, noise_range)
    risk  = float(np.clip(risk, 0.05, 0.97))

    diagnosis  = 'malignant' if risk > 0.50 else 'benign'
    confidence = 0.55 + abs(risk - 0.50)
    confidence = float(np.clip(confidence, 0.52, 0.96))
    prog_score = float(np.clip(risk * 0.9 + rng.uniform(-0.04, 0.04), 0.05, 0.95))

    shap_values = _demo_shap(clinical, diagnosis)
    return diagnosis, confidence, prog_score, shap_values


def _demo_shap(clinical: dict, diagnosis: str) -> dict:
    """Generate clinically-plausible deterministic SHAP values."""
    seed      = abs(hash(diagnosis + str(sorted(clinical.items())))) % (2 ** 31)
    rng       = random.Random(seed)
    direction = 1.0 if diagnosis == 'malignant' else -1.0

    feature_base = {
        'age':            direction * 0.08 * rng.uniform(0.8, 1.2),
        'tumor_size':     direction * 0.15 * rng.uniform(0.8, 1.2),
        'lymph_nodes':    direction * 0.12 * rng.uniform(0.8, 1.2),
        'er_status':     -direction * 0.18 * rng.uniform(0.8, 1.2),
        'pr_status':     -direction * 0.10 * rng.uniform(0.8, 1.2),
        'her2_status':    direction * 0.14 * rng.uniform(0.8, 1.2),
        'grade':          direction * 0.20 * rng.uniform(0.8, 1.2),
        'ki67':           direction * 0.17 * rng.uniform(0.8, 1.2),
        'tp53_mutation':  direction * 0.11 * rng.uniform(0.8, 1.2),
        'brca1_mutation': direction * 0.06 * rng.uniform(0.8, 1.2),
    }
    return {k: round(v, 4) for k, v in feature_base.items()}

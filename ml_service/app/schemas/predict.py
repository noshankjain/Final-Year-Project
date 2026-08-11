from pydantic import BaseModel, Field
from typing import Optional, Dict


# ── Request schemas ───────────────────────────────────────────────────────────

class ClinicalData(BaseModel):
    """
    Clinical/genomic features for the tabular branch.
    All fields except `age` are Optional to support Patient Mode,
    where only the image + age are provided and remaining features
    are estimated via radiomics-based cross-modal imputation.
    """
    age:             float
    # Optional fields — None triggers ClinicalEstimator
    tumor_size:      Optional[float] = None   # mm
    lymph_nodes:     Optional[int]   = None
    er_status:       Optional[int]   = None   # 0 or 1
    pr_status:       Optional[int]   = None
    her2_status:     Optional[int]   = None
    grade:           Optional[int]   = None   # 1, 2, or 3
    ki67:            Optional[float] = None   # percentage
    tp53_mutation:   Optional[int]   = None
    brca1_mutation:  Optional[int]   = None

    @property
    def is_complete(self) -> bool:
        """Returns True when all fields are provided (Clinician Mode)."""
        return all(v is not None for v in [
            self.tumor_size, self.lymph_nodes, self.er_status,
            self.pr_status, self.her2_status, self.grade,
            self.ki67, self.tp53_mutation, self.brca1_mutation,
        ])

    @property
    def known_field_count(self) -> int:
        """Count of fields explicitly provided by the user."""
        fields = [
            self.tumor_size, self.lymph_nodes, self.er_status,
            self.pr_status, self.her2_status, self.grade,
            self.ki67, self.tp53_mutation, self.brca1_mutation,
        ]
        return 1 + sum(1 for f in fields if f is not None)  # +1 for age


# ── Response schemas ──────────────────────────────────────────────────────────

class EstimatedClinicalData(BaseModel):
    """
    The final clinical values used by the model (user-provided + AI-estimated).
    Includes per-feature confidence so the UI can show 'AI-estimated' badges.
    """
    values:      Dict[str, float]   # {feature: value}
    confidence:  Dict[str, float]   # {feature: 0-1 confidence}
    method:      str                # 'user_provided' | 'radiomics_conditioned'
    data_completeness_score: float  # 0-1  (1.0 = all 10 features known)


class PredictionResponse(BaseModel):
    # ── Core diagnosis/prognosis outputs ──
    diagnosis:            str    # 'benign' | 'malignant'
    confidence:           float  # point estimate (0-1)
    confidence_lower:     float  # 95% CI lower bound
    confidence_upper:     float  # 95% CI upper bound
    prognosis_score:      float  # 0-1 (higher = worse prognosis)
    survival_probability: float  # 5-year survival probability

    # ── XAI outputs ──
    gradcam_image_path:   str
    shap_values:          dict

    # ── Metadata ──
    processing_time_ms:   float
    model_version:        str
    demo_mode:            bool

    # ── Patient-mode extras ──
    patient_mode:         bool   # True if clinical features were estimated
    estimated_clinical_data: Optional[EstimatedClinicalData] = None

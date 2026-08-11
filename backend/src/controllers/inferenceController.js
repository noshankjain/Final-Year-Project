const Case = require('../models/Case');
const InferenceResult = require('../models/InferenceResult');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

exports.analyzeCase = async (req, res, next) => {
  try {
    const caseItem = await Case.findById(req.params.id);
    
    if (!caseItem) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    if (req.user.role === 'physician' && caseItem.physicianId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this case' });
    }

    if (caseItem.status === 'processing') {
      return res.status(400).json({ success: false, message: 'Case is already being processed' });
    }

    caseItem.status = 'processing';
    await caseItem.save();

    // Async processing part - doesn't block request
    const processCase = async () => {
      try {
        const formData = new FormData();
        // 'wsi_file' must match FastAPI endpoint parameter name
        formData.append('wsi_file', fs.createReadStream(caseItem.wsiFilePath), {
          filename: caseItem.wsiOriginalName || 'image.png',
        });
        if (caseItem.clinicalData) {
          formData.append('clinical_data', JSON.stringify(caseItem.clinicalData));
        }

        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
        const startTime = Date.now();
        
        const response = await axios.post(`${mlServiceUrl}/api/v1/predict`, formData, {
          headers: {
            ...formData.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 120000, // 2 min timeout for large WSI files
        });

        const processingTimeMs = Date.now() - startTime;
        // ML service returns snake_case; map to our schema fields
        const r = response.data;

        await InferenceResult.create({
          caseId:                caseItem._id,
          diagnosis:             r.diagnosis || 'benign',
          confidence:            r.confidence ?? 0.5,
          confidenceLower:       r.confidence_lower ?? null,
          confidenceUpper:       r.confidence_upper ?? null,
          prognosisScore:        r.prognosis_score ?? 0.5,
          survivalProbability:   r.survival_probability ?? 0.5,
          gradcamImagePath:      r.gradcam_image_path || '',
          shapValues:            r.shap_values || {},
          processingTimeMs:      r.processing_time_ms || processingTimeMs,
          modelVersion:          r.model_version || '1.0.0',
          patientMode:           r.patient_mode ?? false,
          estimatedClinicalData: r.estimated_clinical_data || null,
          demoMode:              r.demo_mode ?? true,
        });

        caseItem.status = 'complete';
        await caseItem.save();

      } catch (err) {
        console.error('ML Service Error:', err.message);
        caseItem.status = 'failed';
        await caseItem.save();
      }
    };

    // Trigger async processing
    processCase();

    res.status(202).json({ success: true, message: 'Case analysis started', data: caseItem });
  } catch (error) {
    next(error);
  }
};

exports.getResult = async (req, res, next) => {
  try {
    const caseItem = await Case.findById(req.params.id);
    
    if (!caseItem) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    if (req.user.role === 'physician' && caseItem.physicianId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this case' });
    }

    const inferenceResult = await InferenceResult.findOne({ caseId: caseItem._id });
    
    if (!inferenceResult) {
      return res.status(404).json({ success: false, message: 'Result not found or not ready' });
    }

    res.status(200).json({ success: true, data: inferenceResult });
  } catch (error) {
    next(error);
  }
};

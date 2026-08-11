const mongoose = require('mongoose');

const inferenceResultSchema = new mongoose.Schema({
  caseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  diagnosis: {
    type: String,
    enum: ['benign', 'malignant'],
    required: true
  },
  confidence: {
    type: Number, min: 0, max: 1, required: true
  },
  // 95% Confidence Interval bounds (wider in patient mode)
  confidenceLower: {
    type: Number, min: 0, max: 1, default: null
  },
  confidenceUpper: {
    type: Number, min: 0, max: 1, default: null
  },
  prognosisScore: {
    type: Number, min: 0, max: 1
  },
  survivalProbability: {
    type: Number, min: 0, max: 1
  },
  gradcamImagePath:  { type: String },
  shapValues:        { type: mongoose.Schema.Types.Mixed },
  processingTimeMs:  { type: Number },
  modelVersion:      { type: String },

  // Patient Mode metadata
  patientMode:       { type: Boolean, default: false },
  estimatedClinicalData: { type: mongoose.Schema.Types.Mixed, default: null },
  demoMode:          { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('InferenceResult', inferenceResultSchema);

const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  patientUUID: {
    type: String,
    required: true,
    unique: true
  },
  physicianId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'complete', 'failed'],
    default: 'pending'
  },
  wsiFilePath: {
    type: String,
    required: true
  },
  wsiOriginalName: {
    type: String,
    required: true
  },
  clinicalData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('Case', caseSchema);

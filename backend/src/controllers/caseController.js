const Case = require('../models/Case');
const InferenceResult = require('../models/InferenceResult');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

exports.createCase = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'WSI file is required' });
    }

    let clinicalData = {};
    if (req.body.clinicalData) {
      try {
        clinicalData = JSON.parse(req.body.clinicalData);
      } catch (e) {
        clinicalData = req.body.clinicalData;
      }
    }

    const newCase = await Case.create({
      patientUUID: uuidv4(),
      physicianId: req.user._id,
      wsiFilePath: req.file.path,
      wsiOriginalName: req.file.originalname,
      clinicalData
    });

    res.status(201).json({ success: true, data: newCase });
  } catch (error) {
    next(error);
  }
};

exports.listCases = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (req.user.role === 'physician') {
      query.physicianId = req.user._id;
    }
    
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const cases = await Case.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .populate('physicianId', 'name email');
      
    const total = await Case.countDocuments(query);

    res.status(200).json({
      success: true,
      count: cases.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: cases
    });
  } catch (error) {
    next(error);
  }
};

exports.getCaseById = async (req, res, next) => {
  try {
    const caseItem = await Case.findById(req.params.id).populate('physicianId', 'name email');
    if (!caseItem) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    if (req.user.role === 'physician' && caseItem.physicianId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this case' });
    }

    const inferenceResult = await InferenceResult.findOne({ caseId: caseItem._id });
    
    const responseData = caseItem.toObject();
    responseData.inferenceResult = inferenceResult || null;

    res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    next(error);
  }
};

exports.deleteCase = async (req, res, next) => {
  try {
    const caseItem = await Case.findById(req.params.id);
    if (!caseItem) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    if (fs.existsSync(caseItem.wsiFilePath)) {
      fs.unlinkSync(caseItem.wsiFilePath);
    }

    await InferenceResult.deleteMany({ caseId: caseItem._id });
    await Case.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Case deleted successfully' });
  } catch (error) {
    next(error);
  }
};

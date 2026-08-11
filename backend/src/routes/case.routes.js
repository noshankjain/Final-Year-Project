const express = require('express');
const { createCase, listCases, getCaseById, deleteCase } = require('../controllers/caseController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/', auth, authorize('admin', 'physician'), upload.single('wsiFile'), createCase);
router.get('/', auth, listCases);
router.get('/:id', auth, getCaseById);
router.delete('/:id', auth, authorize('admin'), deleteCase);

module.exports = router;

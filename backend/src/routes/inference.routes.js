const express = require('express');
const { analyzeCase, getResult } = require('../controllers/inferenceController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

router.post('/:id/analyze', auth, authorize('admin', 'physician'), analyzeCase);
router.get('/:id/results', auth, getResult);

module.exports = router;

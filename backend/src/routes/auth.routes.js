const express = require('express');
const { register, login, logout, getMe } = require('../controllers/authController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate-limit login attempts: 10 per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});

router.post('/register', auth, authorize('admin'), register);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/me', auth, getMe);

module.exports = router;

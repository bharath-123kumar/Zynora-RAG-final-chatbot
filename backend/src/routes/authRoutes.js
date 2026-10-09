const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { validateRegistration, validateLogin } = require('../middleware/requestValidator');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, validateRegistration, authController.register);
router.post('/login', authLimiter, validateLogin, authController.login);
router.get('/me', verifyToken, authController.getMe);

module.exports = router;

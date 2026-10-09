const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { validateChatMessage } = require('../middleware/requestValidator');
const { apiLimiter } = require('../middleware/rateLimiter');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Invalid token provided explicitly
      return res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token provided.'
      });
    }
  }
  next();
}

router.post('/chat', apiLimiter, optionalAuth, validateChatMessage, chatController.handleChat);

module.exports = router;

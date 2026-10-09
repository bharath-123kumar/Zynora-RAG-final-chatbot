const jwt = require('jsonwebtoken');
const config = require('../config/env');
const logger = require('../utils/logger');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication token is required.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    logger.error({
      action: 'AUTH_VERIFICATION_FAIL',
      module: 'AUTH',
      errorCode: 'INVALID_TOKEN',
      traceId: req.traceId,
      error: err
    });

    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Session has expired or token is invalid. Please log in again.'
    });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    logger.error({
      action: 'ADMIN_ACCESS_DENIED',
      module: 'AUTH',
      errorCode: 'FORBIDDEN',
      userId: req.user?.id,
      traceId: req.traceId
    });

    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Administrator privileges are required to perform this action.'
    });
  }
  next();
}

module.exports = {
  verifyToken,
  requireAdmin
};

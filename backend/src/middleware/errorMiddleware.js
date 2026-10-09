const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error({
    action: 'UNHANDLED_EXCEPTION',
    module: 'HTTP',
    errorCode: err.code || 'INTERNAL_SERVER_ERROR',
    userId: req.user?.id || null,
    traceId: req.traceId || null,
    error: err,
    details: {
      url: req.originalUrl,
      method: req.method
    }
  });

  const statusCode = err.status || err.statusCode || 500;
  
  // Never expose raw stack traces in responses
  res.status(statusCode).json({
    success: false,
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message: statusCode === 500 ? 'An internal error occurred. Please try again later.' : err.message,
    traceId: req.traceId || null
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Resource not found: ${req.method} ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};

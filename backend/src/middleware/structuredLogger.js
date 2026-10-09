const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  req.traceId = req.headers['x-trace-id'] || uuidv4();
  res.setHeader('x-trace-id', req.traceId);
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      action: 'HTTP_REQUEST',
      module: 'HTTP',
      status: res.statusCode >= 400 ? 'WARN' : 'SUCCESS',
      userId: req.user?.id || null,
      traceId: req.traceId,
      details: {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
        ip: req.ip
      }
    });
  });

  next();
}

module.exports = requestLogger;

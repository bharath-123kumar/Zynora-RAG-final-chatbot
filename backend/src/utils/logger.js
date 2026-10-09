const fs = require('fs');
const path = require('path');

const logDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFilePath = path.join(logDir, 'app.log');

function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sensitiveKeys = ['password', 'password_hash', 'token', 'authorization', 'secret', 'jwt_secret', 'database_url'];
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function writeLog(entry) {
  const line = JSON.stringify(entry) + '\n';
  try {
    fs.appendFileSync(logFilePath, line);
  } catch (err) {
    console.error('Failed to write log to file:', err.message);
  }
  if (process.env.NODE_ENV !== 'production' || entry.status === 'ERROR') {
    const prefix = `[${entry.timestamp}] [${entry.module}] [${entry.status}]`;
    if (entry.status === 'ERROR') {
      console.error(prefix, entry.action, entry.errorCode ? `(${entry.errorCode})` : '', entry.message || '');
    } else {
      console.log(prefix, entry.action, entry.userId ? `[User: ${entry.userId}]` : '');
    }
  }
}

const logger = {
  info: ({ action, module = 'SYSTEM', status = 'SUCCESS', userId = null, traceId = null, details = null, message = null }) => {
    writeLog({
      timestamp: new Date().toISOString(),
      action,
      module,
      status,
      userId,
      traceId,
      message,
      details: sanitize(details)
    });
  },

  error: ({ action, module = 'SYSTEM', status = 'ERROR', errorCode = 'SERVER_ERROR', userId = null, traceId = null, error = null, details = null }) => {
    writeLog({
      timestamp: new Date().toISOString(),
      action,
      module,
      status,
      errorCode,
      userId,
      traceId,
      message: error?.message || 'An error occurred',
      details: sanitize(details)
    });
  },

  audit: async ({ db, userId, action, module, status, ipAddress = null, traceId = null, details = null }) => {
    logger.info({ action, module, status, userId, traceId, details });
    if (db) {
      try {
        const { v4: uuidv4 } = require('uuid');
        await db.query(
          `INSERT INTO audit_logs (id, user_id, action, module, status, ip_address, trace_id, details, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            uuidv4(),
            userId,
            action,
            module,
            status,
            ipAddress,
            traceId,
            details ? JSON.stringify(sanitize(details)) : null,
            new Date().toISOString()
          ]
        );
      } catch (err) {
        // Silently avoid breaking flow if audit insert fails
        console.error('Failed to persist audit log:', err.message);
      }
    }
  }
};

module.exports = logger;

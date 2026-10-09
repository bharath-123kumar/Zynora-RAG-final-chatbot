const db = require('../db/dbClient');
const config = require('../config/env');

const startTime = Date.now();

async function getHealth(req, res) {
  let dbStatus = 'healthy';
  let dbError = null;

  try {
    await db.query('SELECT 1');
  } catch (err) {
    dbStatus = 'unhealthy';
    dbError = err.message;
  }

  let ragStatus = 'ready';
  let activeDocsCount = 0;
  try {
    const docRes = await db.query(
      "SELECT COUNT(*) AS count FROM knowledge_documents WHERE status IN ('ACTIVE IN RAG', 'APPROVED')"
    );
    activeDocsCount = parseInt(docRes.rows[0]?.count || 0, 10);
  } catch (err) {
    ragStatus = 'error';
  }

  const isHealthy = dbStatus === 'healthy' && ragStatus !== 'error';

  const healthData = {
    status: isHealthy ? 'UP' : 'DOWN',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    version: config.APP_VERSION,
    environment: config.NODE_ENV,
    checks: {
      database: {
        status: dbStatus,
        engine: db.getEngine()
      },
      ragEngine: {
        status: ragStatus,
        activeDocuments: activeDocsCount
      }
    }
  };

  if (!isHealthy) {
    return res.status(503).json(healthData);
  }

  return res.status(200).json(healthData);
}

function getVersion(req, res) {
  return res.status(200).json({
    name: 'Zynora AI RAG Chatbot',
    version: config.APP_VERSION,
    environment: config.NODE_ENV,
    releaseDate: '2026-10-09',
    description: 'Zyngram Internal RAG Chatbot System'
  });
}

module.exports = {
  getHealth,
  getVersion
};

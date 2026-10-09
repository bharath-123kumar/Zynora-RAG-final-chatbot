const db = require('../db/dbClient');
const logger = require('../utils/logger');
const config = require('../config/env');

async function getMonitoringMetrics(req, res) {
  try {
    const { startDate, endDate } = req.query;

    let dateFilterEvaluations = '';
    let dateFilterConversations = '';
    const evalParams = [];
    const convParams = [];

    if (startDate) {
      evalParams.push(startDate);
      dateFilterEvaluations += ` AND created_at >= $${evalParams.length}`;
      convParams.push(startDate);
      dateFilterConversations += ` AND created_at >= $${convParams.length}`;
    }

    if (endDate) {
      evalParams.push(endDate);
      dateFilterEvaluations += ` AND created_at <= $${evalParams.length}`;
      convParams.push(endDate);
      dateFilterConversations += ` AND created_at <= $${convParams.length}`;
    }

    // 1. Total Conversations
    const convSql = `SELECT COUNT(*) AS total_conversations FROM conversations WHERE 1=1 ${dateFilterConversations}`;
    const convRes = await db.query(convSql, convParams);
    const totalConversations = parseInt(convRes.rows[0]?.total_conversations || 0, 10);

    // 2. Questions / Evaluations aggregations
    const evalSql = `
      SELECT 
        COUNT(*) AS total_questions,
        SUM(CASE WHEN retrieval_outcome = 'SUCCESS' THEN 1 ELSE 0 END) AS successful_answers,
        SUM(CASE WHEN retrieval_outcome = 'NO_ANSWER' THEN 1 ELSE 0 END) AS no_answers,
        SUM(CASE WHEN retrieval_outcome = 'FAILED' THEN 1 ELSE 0 END) AS retrieval_failures,
        AVG(response_time_ms) AS avg_response_time,
        AVG(confidence_score) AS avg_confidence
      FROM response_evaluations
      WHERE 1=1 ${dateFilterEvaluations}
    `;
    const evalRes = await db.query(evalSql, evalParams);
    const evalStats = evalRes.rows[0] || {};

    const totalQuestions = parseInt(evalStats.total_questions || 0, 10);
    const successfulAnswers = parseInt(evalStats.successful_answers || 0, 10);
    const noAnswerResponses = parseInt(evalStats.no_answers || 0, 10);
    const retrievalFailures = parseInt(evalStats.retrieval_failures || 0, 10);
    const avgResponseTime = Math.round(parseFloat(evalStats.avg_response_time || 0) * 10) / 10;
    const avgConfidence = Math.round(parseFloat(evalStats.avg_confidence || 0) * 100) / 100;

    // 3. Daily Questions (last 7 days or filtered window)
    const dailySql = `
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date_day, COUNT(*) AS count
      FROM response_evaluations
      WHERE 1=1 ${dateFilterEvaluations}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY date_day DESC
      LIMIT 14
    `;
    const dailyRes = await db.query(dailySql, evalParams);
    const dailyQuestions = dailyRes.rows.reverse();

    // 4. Frequently Asked Questions (actual questions grouped)
    const faqSql = `
      SELECT question, COUNT(*) AS ask_count, MAX(CASE WHEN grounded THEN 1 ELSE 0 END) AS was_grounded
      FROM response_evaluations
      WHERE 1=1 ${dateFilterEvaluations}
      GROUP BY question
      ORDER BY ask_count DESC
      LIMIT 5
    `;
    const faqRes = await db.query(faqSql, evalParams);
    const frequentlyAskedQuestions = faqRes.rows.map(r => ({
      question: r.question,
      count: parseInt(r.ask_count, 10),
      grounded: Boolean(r.was_grounded)
    }));

    // 5. Knowledge Categories distribution
    const catSql = `
      SELECT category, status, COUNT(*) AS doc_count
      FROM knowledge_documents
      GROUP BY category, status
    `;
    const catRes = await db.query(catSql);
    const knowledgeCategories = catRes.rows.map(r => ({
      category: r.category,
      status: r.status,
      count: parseInt(r.doc_count, 10)
    }));

    // 6. Error count from audit / evaluation logs
    const errorSql = `
      SELECT COUNT(*) AS error_count
      FROM audit_logs
      WHERE status IN ('ERROR', 'FAILED')
    `;
    const errorRes = await db.query(errorSql);
    const errorCount = parseInt(errorRes.rows[0]?.error_count || 0, 10) + retrievalFailures;

    // 7. AI/RAG Service Health checks
    let dbStatus = 'healthy';
    try {
      await db.query('SELECT 1');
    } catch (e) {
      dbStatus = 'degraded';
    }

    const activeDocsRes = await db.query(
      "SELECT COUNT(*) AS active_count FROM knowledge_documents WHERE status IN ('ACTIVE IN RAG', 'APPROVED')"
    );
    const activeDocCount = parseInt(activeDocsRes.rows[0]?.active_count || 0, 10);

    const serviceHealth = {
      status: (dbStatus === 'healthy' && activeDocCount > 0) ? 'HEALTHY' : 'DEGRADED',
      databaseEngine: db.getEngine(),
      databaseStatus: dbStatus,
      activeDocumentsIndexed: activeDocCount,
      ragPipelineStatus: activeDocCount > 0 ? 'OPERATIONAL' : 'NO_ACTIVE_INDEX'
    };

    return res.status(200).json({
      success: true,
      metrics: {
        totalConversations,
        totalQuestions,
        successfulAnswers,
        noAnswerResponses,
        retrievalFailures,
        averageResponseTimeMs: avgResponseTime,
        averageConfidence: avgConfidence,
        dailyQuestions,
        frequentlyAskedQuestions,
        knowledgeCategories,
        errorCount,
        serviceHealth
      }
    });
  } catch (err) {
    logger.error({
      action: 'FETCH_MONITORING_METRICS_FAIL',
      module: 'MONITORING',
      errorCode: 'METRICS_FAIL',
      error: err
    });
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to compute monitoring metrics.'
    });
  }
}

module.exports = {
  getMonitoringMetrics
};

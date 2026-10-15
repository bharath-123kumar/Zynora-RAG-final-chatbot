const { v4: uuidv4 } = require('uuid');
const db = require('../db/dbClient');
const vectorEngine = require('../rag/vectorEngine');
const { resolveContextualQuery } = require('../rag/contextResolver');
const { synthesize } = require('../rag/groundedSynthesizer');
const logger = require('../utils/logger');

async function handleChat(req, res) {
  const startTime = Date.now();
  const userId = req.user?.id || 'anonymous';
  const { message, conversationId } = req.body;

  let activeConvId = conversationId;
  let conversationHistory = [];

  try {
    // 1. Verify or create conversation if conversationId is provided
    if (activeConvId) {
      const convCheck = await db.query(
        'SELECT id, user_id FROM conversations WHERE id = $1',
        [activeConvId]
      );

      if (convCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Conversation not found.'
        });
      }

      // Check ownership
      if (req.user && convCheck.rows[0].user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Unauthorized access to this conversation.'
        });
      }

      // Load previous messages for context resolution
      const prevMsgs = await db.query(
        `SELECT role, content FROM messages 
         WHERE conversation_id = $1 
         ORDER BY created_at ASC 
         LIMIT 6`,
        [activeConvId]
      );
      conversationHistory = prevMsgs.rows;
    } else if (req.user) {
      // Auto-create new conversation for authenticated user
      activeConvId = uuidv4();
      const firstTitle = message.substring(0, 40) + (message.length > 40 ? '...' : '');
      const now = new Date().toISOString();
      await db.query(
        `INSERT INTO conversations (id, user_id, title, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [activeConvId, userId, firstTitle, now, now]
      );
    }

    // 2. Resolve contextual query for follow-up questions
    const resolvedQuery = resolveContextualQuery(message, conversationHistory);

    // 3. Retrieve chunks from approved knowledge base
    const retrievalResult = await vectorEngine.retrieve(resolvedQuery);
    const { chunks, maxScore } = retrievalResult;

    // 4. Grounded answer synthesis
    const synthesisResult = synthesize({
      query: resolvedQuery,
      chunks,
      maxScore
    });

    const responseTimeMs = Date.now() - startTime;
    const nowIso = new Date().toISOString();
    const userMsgId = uuidv4();
    const assistantMsgId = uuidv4();

    // 5. Persist user & assistant messages if in conversation
    if (activeConvId) {
      // User message
      await db.query(
        `INSERT INTO messages (id, conversation_id, role, content, grounded, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userMsgId, activeConvId, 'user', message, false, nowIso]
      );

      // Assistant message
      await db.query(
        `INSERT INTO messages (id, conversation_id, role, content, grounded, confidence_score, response_time_ms, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          assistantMsgId,
          activeConvId,
          'assistant',
          synthesisResult.answer,
          synthesisResult.grounded,
          synthesisResult.confidenceScore,
          responseTimeMs,
          nowIso
        ]
      );

      // Save source references
      if (synthesisResult.sources.length > 0) {
        for (const src of synthesisResult.sources) {
          const srcId = uuidv4();
          await db.query(
            `INSERT INTO source_references (id, message_id, document_id, chunk_id, document_title, category, section, version, relevance_score, source, snippet, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              srcId,
              assistantMsgId,
              src.documentId,
              src.chunkId || null,
              src.documentTitle,
              src.category,
              src.section,
              src.version,
              src.relevanceScore,
              src.source,
              src.snippet || null,
              nowIso
            ]
          );
        }
      }

      // Update conversation updated_at
      await db.query('UPDATE conversations SET updated_at = $1 WHERE id = $2', [nowIso, activeConvId]);
    }

    // 6. Record quality evaluation metric
    const evalId = uuidv4();
    await db.query(
      `INSERT INTO response_evaluations (id, user_id, conversation_id, question, answer, grounded, confidence_score, retrieval_outcome, response_time_ms, retrieved_chunk_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        evalId,
        userId,
        activeConvId,
        message,
        synthesisResult.answer,
        synthesisResult.grounded,
        synthesisResult.confidenceScore,
        synthesisResult.retrievalOutcome,
        responseTimeMs,
        chunks.length,
        nowIso
      ]
    );

    // 7. Structured log
    logger.info({
      action: 'CHAT_RESPONSE_GENERATED',
      module: 'RAG_CHAT',
      status: 'SUCCESS',
      userId,
      traceId: req.traceId,
      details: {
        conversationId: activeConvId,
        grounded: synthesisResult.grounded,
        retrievalOutcome: synthesisResult.retrievalOutcome,
        confidence: synthesisResult.confidenceScore,
        chunkCount: chunks.length,
        responseTimeMs
      }
    });

    // 8. Safely validate and normalize sources
    const normalizedSources = (synthesisResult.sources || []).map(src => ({
      documentId: src.documentId || src.document_id || '',
      chunkId: src.chunkId || src.chunk_id || '',
      documentTitle: src.documentTitle || src.document_title || 'Zyngram Document',
      category: src.category || 'Knowledge Base',
      section: src.section || 'General',
      version: src.version || '1.0',
      source: src.source || '',
      relevanceScore: typeof src.relevanceScore === 'number' ? src.relevanceScore : (parseFloat(src.relevance_score) || 0),
      snippet: src.snippet || ''
    }));

    return res.status(200).json({
      success: true,
      answer: synthesisResult.answer,
      sources: normalizedSources,
      grounded: Boolean(synthesisResult.grounded),
      retrievedChunks: chunks.map(c => ({
        chunkId: c.chunkId || c.chunk_id,
        documentTitle: c.documentTitle || c.document_title,
        category: c.category,
        section: c.section,
        score: c.score
      })),
      relevanceScores: chunks.map(c => c.score),
      responseTimeMs,
      confidenceIndicator: synthesisResult.confidenceScore,
      conversationId: activeConvId,
      messageId: assistantMsgId
    });
  } catch (err) {
    logger.error({
      action: 'CHAT_PROCESSING_FAIL',
      module: 'RAG_CHAT',
      errorCode: 'CHAT_FAILED',
      userId,
      traceId: req.traceId,
      error: err
    });

    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to process chat query.'
    });
  }
}

module.exports = {
  handleChat
};

const { v4: uuidv4 } = require('uuid');
const db = require('../db/dbClient');
const logger = require('../utils/logger');

async function createConversation(req, res) {
  const userId = req.user.id;
  const { title } = req.body;
  const convId = uuidv4();
  const convTitle = (title && typeof title === 'string' && title.trim()) ? title.trim().substring(0, 100) : 'New Conversation';
  const now = new Date().toISOString();

  try {
    await db.query(
      `INSERT INTO conversations (id, user_id, title, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [convId, userId, convTitle, now, now]
    );

    logger.info({
      action: 'CONVERSATION_CREATE',
      module: 'CHAT',
      status: 'SUCCESS',
      userId,
      traceId: req.traceId,
      details: { conversationId: convId, title: convTitle }
    });

    return res.status(201).json({
      success: true,
      conversation: {
        id: convId,
        userId,
        title: convTitle,
        createdAt: now,
        updatedAt: now
      }
    });
  } catch (err) {
    logger.error({
      action: 'CONVERSATION_CREATE_FAIL',
      module: 'CHAT',
      errorCode: 'CREATE_FAILED',
      userId,
      traceId: req.traceId,
      error: err
    });
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to create conversation.'
    });
  }
}

async function listConversations(req, res) {
  const userId = req.user.id;

  try {
    const result = await db.query(
      `SELECT c.id, c.title, c.created_at, c.updated_at,
              COUNT(m.id) AS message_count
       FROM conversations c
       LEFT JOIN messages m ON c.id = m.conversation_id
       WHERE c.user_id = $1
       GROUP BY c.id, c.title, c.created_at, c.updated_at
       ORDER BY c.updated_at DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      conversations: result.rows.map(r => ({
        id: r.id,
        title: r.title,
        messageCount: parseInt(r.message_count || 0, 10),
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }))
    });
  } catch (err) {
    logger.error({
      action: 'CONVERSATION_LIST_FAIL',
      module: 'CHAT',
      errorCode: 'LIST_FAILED',
      userId,
      traceId: req.traceId,
      error: err
    });
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to list conversations.'
    });
  }
}

async function getConversation(req, res) {
  const userId = req.user.id;
  const conversationId = req.params.id;

  try {
    // Enforce ownership
    const convRes = await db.query(
      'SELECT * FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (convRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Conversation not found or access denied.'
      });
    }

    const conversation = convRes.rows[0];

    // Load messages
    const msgRes = await db.query(
      `SELECT id, role, content, grounded, confidence_score, response_time_ms, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    );

    // Load sources for each message
    const messages = [];
    for (const msg of msgRes.rows) {
      const sourceRes = await db.query(
        `SELECT id, document_id, chunk_id, document_title, category, section, version, relevance_score, source, snippet
         FROM source_references
         WHERE message_id = $1`,
        [msg.id]
      );

      messages.push({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        grounded: msg.grounded,
        confidenceScore: msg.confidence_score,
        responseTimeMs: msg.response_time_ms,
        createdAt: msg.created_at,
        sources: sourceRes.rows
      });
    }

    return res.status(200).json({
      success: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
        messages
      }
    });
  } catch (err) {
    logger.error({
      action: 'CONVERSATION_GET_FAIL',
      module: 'CHAT',
      errorCode: 'FETCH_FAILED',
      userId,
      traceId: req.traceId,
      error: err
    });
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to retrieve conversation details.'
    });
  }
}

async function renameConversation(req, res) {
  const userId = req.user.id;
  const conversationId = req.params.id;
  const { title } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'A valid title is required.'
    });
  }

  try {
    const existing = await db.query(
      'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Conversation not found or access denied.'
      });
    }

    const newTitle = title.trim().substring(0, 100);
    const now = new Date().toISOString();

    await db.query(
      'UPDATE conversations SET title = $1, updated_at = $2 WHERE id = $3 AND user_id = $4',
      [newTitle, now, conversationId, userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Conversation renamed successfully.',
      title: newTitle
    });
  } catch (err) {
    logger.error({
      action: 'CONVERSATION_RENAME_FAIL',
      module: 'CHAT',
      errorCode: 'RENAME_FAILED',
      userId,
      traceId: req.traceId,
      error: err
    });
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to rename conversation.'
    });
  }
}

async function deleteConversation(req, res) {
  const userId = req.user.id;
  const conversationId = req.params.id;

  try {
    const existing = await db.query(
      'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Conversation not found or access denied.'
      });
    }

    await db.query('DELETE FROM conversations WHERE id = $1 AND user_id = $2', [conversationId, userId]);

    logger.info({
      action: 'CONVERSATION_DELETE',
      module: 'CHAT',
      status: 'SUCCESS',
      userId,
      traceId: req.traceId,
      details: { conversationId }
    });

    return res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully.'
    });
  } catch (err) {
    logger.error({
      action: 'CONVERSATION_DELETE_FAIL',
      module: 'CHAT',
      errorCode: 'DELETE_FAILED',
      userId,
      traceId: req.traceId,
      error: err
    });
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to delete conversation.'
    });
  }
}

async function clearConversationMessages(req, res) {
  const userId = req.user.id;
  const conversationId = req.params.id;

  try {
    const existing = await db.query(
      'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Conversation not found or access denied.'
      });
    }

    await db.query('DELETE FROM messages WHERE conversation_id = $1', [conversationId]);
    await db.query('UPDATE conversations SET updated_at = $1 WHERE id = $2', [new Date().toISOString(), conversationId]);

    return res.status(200).json({
      success: true,
      message: 'Conversation messages cleared successfully.'
    });
  } catch (err) {
    logger.error({
      action: 'CONVERSATION_CLEAR_FAIL',
      module: 'CHAT',
      errorCode: 'CLEAR_FAILED',
      userId,
      traceId: req.traceId,
      error: err
    });
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to clear conversation messages.'
    });
  }
}

module.exports = {
  createConversation,
  listConversations,
  getConversation,
  renameConversation,
  deleteConversation,
  clearConversationMessages
};

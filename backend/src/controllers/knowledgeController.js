const { v4: uuidv4 } = require('uuid');
const db = require('../db/dbClient');
const { splitDocument } = require('../rag/textSplitter');
const { cleanText } = require('../rag/textCleaner');
const { ingestAllApprovedKnowledge } = require('../rag/documentIngestor');
const logger = require('../utils/logger');

const VALID_STATUSES = ['DRAFT', 'APPROVED', 'ACTIVE IN RAG', 'ARCHIVED'];
const VALID_CATEGORIES = [
  'Zyngram Company Overview',
  'Services',
  'Franchise Structure',
  'Policies',
  'Frequently Asked Questions',
  'General'
];

async function listDocuments(req, res) {
  try {
    const { status, category } = req.query;
    let sql = `
      SELECT d.id, d.title, d.category, d.source, d.version, d.status, d.created_at, d.updated_at,
             COUNT(c.id) AS chunk_count
      FROM knowledge_documents d
      LEFT JOIN knowledge_chunks c ON d.id = c.document_id
    `;
    const params = [];
    const conditions = [];

    if (status) {
      params.push(status);
      conditions.push(`d.status = $${params.length}`);
    }
    if (category) {
      params.push(category);
      conditions.push(`d.category = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' GROUP BY d.id, d.title, d.category, d.source, d.version, d.status, d.created_at, d.updated_at ORDER BY d.updated_at DESC';

    const result = await db.query(sql, params);

    return res.status(200).json({
      success: true,
      documents: result.rows.map(r => ({
        id: r.id,
        title: r.title,
        category: r.category,
        source: r.source,
        version: r.version,
        status: r.status,
        chunkCount: parseInt(r.chunk_count || 0, 10),
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }))
    });
  } catch (err) {
    logger.error({
      action: 'LIST_DOCUMENTS_FAIL',
      module: 'KNOWLEDGE',
      errorCode: 'LIST_FAIL',
      error: err
    });
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to retrieve documents.'
    });
  }
}

async function createDocument(req, res) {
  const { title, category, content, version = '1.0', status = 'DRAFT' } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Title and content are required.'
    });
  }

  const assignedStatus = VALID_STATUSES.includes(status) ? status : 'DRAFT';
  const assignedCategory = VALID_CATEGORIES.includes(category) ? category : 'General';
  const docId = uuidv4();
  const now = new Date().toISOString();
  const source = `manual_upload://${title.toLowerCase().replace(/\s+/g, '_')}`;

  try {
    await db.query(
      `INSERT INTO knowledge_documents (id, title, category, content, source, version, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [docId, title.trim(), assignedCategory, cleanText(content), source, version, assignedStatus, now, now]
    );

    // Split and save chunks
    const chunks = splitDocument(content);
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const chunkId = uuidv4();
      const metadata = JSON.stringify({
        documentId: docId,
        documentTitle: title,
        category: assignedCategory,
        section: c.section,
        version,
        source,
        status: assignedStatus
      });

      await db.query(
        `INSERT INTO knowledge_chunks (id, document_id, chunk_index, section, content, token_count, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [chunkId, docId, i, c.section, c.content, c.tokenCount, metadata, now]
      );
    }

    await logger.audit({
      db,
      userId: req.user.id,
      action: 'DOCUMENT_CREATE',
      module: 'KNOWLEDGE',
      status: 'SUCCESS',
      traceId: req.traceId,
      details: { docId, title, status: assignedStatus, chunksCreated: chunks.length }
    });

    return res.status(201).json({
      success: true,
      message: 'Document created successfully.',
      document: {
        id: docId,
        title,
        category: assignedCategory,
        status: assignedStatus,
        chunkCount: chunks.length,
        version
      }
    });
  } catch (err) {
    logger.error({
      action: 'CREATE_DOCUMENT_FAIL',
      module: 'KNOWLEDGE',
      errorCode: 'CREATE_FAIL',
      error: err
    });
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to create document.'
    });
  }
}

async function updateDocumentStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_STATUS',
      message: `Status must be one of: ${VALID_STATUSES.join(', ')}`
    });
  }

  try {
    const existing = await db.query('SELECT * FROM knowledge_documents WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Document not found.'
      });
    }

    const now = new Date().toISOString();
    await db.query(
      'UPDATE knowledge_documents SET status = $1, updated_at = $2 WHERE id = $3',
      [status, now, id]
    );

    await logger.audit({
      db,
      userId: req.user.id,
      action: 'DOCUMENT_STATUS_CHANGE',
      module: 'KNOWLEDGE',
      status: 'SUCCESS',
      traceId: req.traceId,
      details: { docId: id, oldStatus: existing.rows[0].status, newStatus: status }
    });

    return res.status(200).json({
      success: true,
      message: `Document status updated to ${status}.`,
      documentId: id,
      newStatus: status
    });
  } catch (err) {
    logger.error({
      action: 'UPDATE_STATUS_FAIL',
      module: 'KNOWLEDGE',
      errorCode: 'STATUS_FAIL',
      error: err
    });
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to update document status.'
    });
  }
}

async function reindexKnowledge(req, res) {
  try {
    const results = await ingestAllApprovedKnowledge();

    await logger.audit({
      db,
      userId: req.user.id,
      action: 'REINDEX_KNOWLEDGE_BASE',
      module: 'KNOWLEDGE',
      status: 'SUCCESS',
      traceId: req.traceId,
      details: { processedDocs: results.length }
    });

    return res.status(200).json({
      success: true,
      message: 'Knowledge base re-indexed successfully.',
      documentsIndexed: results.length
    });
  } catch (err) {
    logger.error({
      action: 'REINDEX_FAIL',
      module: 'KNOWLEDGE',
      errorCode: 'REINDEX_ERROR',
      error: err
    });
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to reindex knowledge base.'
    });
  }
}

async function deleteDocument(req, res) {
  const { id } = req.params;

  try {
    const existing = await db.query('SELECT title FROM knowledge_documents WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Document not found.'
      });
    }

    await db.query('DELETE FROM knowledge_documents WHERE id = $1', [id]);

    await logger.audit({
      db,
      userId: req.user.id,
      action: 'DOCUMENT_DELETE',
      module: 'KNOWLEDGE',
      status: 'SUCCESS',
      traceId: req.traceId,
      details: { docId: id, title: existing.rows[0].title }
    });

    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to delete document.'
    });
  }
}

module.exports = {
  listDocuments,
  createDocument,
  updateDocumentStatus,
  reindexKnowledge,
  deleteDocument
};

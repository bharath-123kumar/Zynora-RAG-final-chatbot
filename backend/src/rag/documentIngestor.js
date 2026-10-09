/**
 * documentIngestor.js
 * Ingests TXT, Markdown, and JSON files, splits into chunks, and persists in database.
 */
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/dbClient');
const { splitDocument } = require('./textSplitter');
const { cleanText } = require('./textCleaner');
const logger = require('../utils/logger');
const config = require('../config/env');

async function ingestFile(filePath, defaultStatus = null) {
  const ext = path.extname(filePath).toLowerCase();
  const filename = path.basename(filePath);
  const rawContent = fs.readFileSync(filePath, 'utf-8');

  let title = filename.replace(ext, '').replace(/_/g, ' ');
  let category = 'General';
  let version = '1.0';
  let status = defaultStatus || 'ACTIVE IN RAG';
  let content = rawContent;
  let customChunks = null;

  if (ext === '.json') {
    try {
      const parsed = JSON.parse(rawContent);
      title = parsed.title || title;
      category = parsed.category || 'Frequently Asked Questions';
      version = parsed.version || '1.0';
      status = parsed.status || status;

      if (parsed.faqs && Array.isArray(parsed.faqs)) {
        customChunks = parsed.faqs.map((faq, index) => ({
          section: `FAQ: ${faq.question}`,
          content: `Question: ${faq.question}\nAnswer: ${faq.answer}`,
          tokenCount: Math.ceil((faq.question.length + faq.answer.length) / 3.5)
        }));
        content = JSON.stringify(parsed, null, 2);
      }
    } catch (e) {
      logger.error({
        action: 'PARSE_JSON_INGEST_FAIL',
        module: 'RAG_INGEST',
        error: e,
        details: { filePath }
      });
    }
  } else if (ext === '.md' || ext === '.txt') {
    // Extract title from first H1 if available
    const h1Match = rawContent.match(/^#\s+(.+)$/m);
    if (h1Match) {
      title = h1Match[1].trim();
    }
    
    // Categorization logic based on title or path
    if (filePath.includes('overview')) {
      category = 'Zyngram Company Overview';
    } else if (filePath.includes('franchise') || filePath.includes('structure')) {
      category = 'Franchise Structure';
    } else if (filePath.includes('services')) {
      category = 'Services';
    } else if (filePath.includes('policies')) {
      category = 'Policies';
    } else if (filePath.includes('drafts')) {
      category = 'Draft Sample Guidelines';
      status = 'DRAFT';
    } else if (filePath.includes('archived')) {
      category = 'Archived Historical Records';
      status = 'ARCHIVED';
    }
  }

  // Check if document already exists
  const existingDoc = await db.query(
    'SELECT id FROM knowledge_documents WHERE source = $1',
    [filePath]
  );

  let docId;
  const now = new Date().toISOString();

  if (existingDoc.rows.length > 0) {
    docId = existingDoc.rows[0].id;
    await db.query(
      `UPDATE knowledge_documents 
       SET title = $1, category = $2, content = $3, version = $4, status = $5, updated_at = $6
       WHERE id = $7`,
      [title, category, cleanText(content), version, status, now, docId]
    );
    // Delete existing chunks to refresh
    await db.query('DELETE FROM knowledge_chunks WHERE document_id = $1', [docId]);
  } else {
    docId = uuidv4();
    await db.query(
      `INSERT INTO knowledge_documents (id, title, category, content, source, version, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [docId, title, category, cleanText(content), filePath, version, status, now, now]
    );
  }

  // Create chunks
  const chunks = customChunks || splitDocument(content);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkId = uuidv4();
    const metadata = JSON.stringify({
      documentId: docId,
      documentTitle: title,
      category,
      section: chunk.section,
      version,
      source: filePath,
      status
    });

    await db.query(
      `INSERT INTO knowledge_chunks (id, document_id, chunk_index, section, content, token_count, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [chunkId, docId, i, chunk.section, chunk.content, chunk.tokenCount, metadata, now]
    );
  }

  logger.info({
    action: 'INGEST_FILE_SUCCESS',
    module: 'RAG_INGEST',
    status: 'SUCCESS',
    details: { docId, title, category, chunkCount: chunks.length, status }
  });

  return { docId, title, category, chunkCount: chunks.length, status };
}

async function ingestAllApprovedKnowledge() {
  const baseDir = config.KNOWLEDGE_BASE_DIR;
  const approvedDir = path.join(baseDir, 'approved');
  const draftsDir = path.join(baseDir, 'drafts');
  const archivedDir = path.join(baseDir, 'archived');

  const results = [];

  const processDir = async (dir, defaultStatus) => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isFile()) {
          const res = await ingestFile(fullPath, defaultStatus);
          results.push(res);
        }
      }
    }
  };

  await processDir(approvedDir, 'ACTIVE IN RAG');
  await processDir(draftsDir, 'DRAFT');
  await processDir(archivedDir, 'ARCHIVED');

  return results;
}

module.exports = {
  ingestFile,
  ingestAllApprovedKnowledge
};

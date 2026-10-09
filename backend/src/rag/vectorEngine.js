/**
 * vectorEngine.js
 * Local Hybrid Retrieval Engine (BM25 + Cosine Vector Similarity)
 * Zero external API dependencies. Strictly queries APPROVED / ACTIVE IN RAG documents.
 * Indexes document title, category, section, and chunk content.
 */
const db = require('../db/dbClient');
const config = require('../config/env');
const logger = require('../utils/logger');

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'does',
  'do', 'can', 'could', 'would', 'should', 'about', 'tell', 'me', 'please', 'explain',
  'give', 'find', 'show', 'much', 'all'
]);

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous\s+)?instructions/i,
  /disregard\s+(your\s+)?knowledge/i,
  /system\s+prompt/i,
  /internal\s+instructions/i,
  /search\s+google/i,
  /competitor\s+(pricing|rates)/i,
  /system\s+override/i,
  /reveal\s+(administrative\s+)?(credentials|passwords|secrets)/i,
  /unapproved\s+draft/i,
  /make\s+up\s+a/i
];

function isAdversarialOrInjection(query) {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(query)) return true;
  }
  return false;
}

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

function generateVector(text) {
  const tokens = tokenize(text);
  const vector = new Map();
  
  tokens.forEach(tok => {
    vector.set(`w:${tok}`, (vector.get(`w:${tok}`) || 0) + 1.5);
  });

  const raw = text.toLowerCase().replace(/[^a-z0-9]/g, ' ');
  for (let i = 0; i <= raw.length - 3; i++) {
    const gram = raw.substring(i, i + 3).trim();
    if (gram.length === 3) {
      vector.set(`g:${gram}`, (vector.get(`g:${gram}`) || 0) + 0.5);
    }
  }

  return vector;
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const val of vecA.values()) {
    normA += val * val;
  }
  for (const val of vecB.values()) {
    normB += val * val;
  }

  if (normA === 0 || normB === 0) return 0;

  for (const [key, valA] of vecA.entries()) {
    if (vecB.has(key)) {
      dotProduct += valA * vecB.get(key);
    }
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateBM25(queryTokens, docTokens, avgDocLength, docCount, docFrequencyMap, k1 = 1.5, b = 0.75) {
  let score = 0;
  const docLen = docTokens.length;
  const tfMap = new Map();
  
  docTokens.forEach(t => tfMap.set(t, (tfMap.get(t) || 0) + 1));

  for (const token of queryTokens) {
    const tf = tfMap.get(token) || 0;
    if (tf === 0) continue;

    const df = docFrequencyMap.get(token) || 1;
    const idf = Math.log(1 + (docCount - df + 0.5) / (df + 0.5));
    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + b * (docLen / (avgDocLength || 1)));

    score += idf * (numerator / denominator);
  }

  return Math.max(0, score);
}

class VectorEngine {
  async retrieve(query, options = {}) {
    const limit = options.limit || config.RAG_MAX_CHUNKS;
    const similarityThreshold = options.threshold !== undefined ? options.threshold : 0.22;

    if (isAdversarialOrInjection(query)) {
      logger.info({
        action: 'INJECTION_ATTEMPT_DEFLECTED',
        module: 'RAG_SECURITY',
        status: 'DEFLECTED',
        details: { query }
      });
      return {
        chunks: [],
        maxScore: 0,
        queryTokens: tokenize(query)
      };
    }

    const sql = `
      SELECT 
        c.id AS chunk_id,
        c.document_id,
        c.section,
        c.content,
        c.token_count,
        c.metadata,
        d.title AS document_title,
        d.category,
        d.version,
        d.source,
        d.status
      FROM knowledge_chunks c
      JOIN knowledge_documents d ON c.document_id = d.id
      WHERE d.status IN ('ACTIVE IN RAG', 'APPROVED')
    `;

    const res = await db.query(sql);
    const candidateChunks = res.rows;

    if (!candidateChunks || candidateChunks.length === 0) {
      return {
        chunks: [],
        maxScore: 0,
        queryTokens: tokenize(query)
      };
    }

    const queryTokens = tokenize(query);
    const uniqueQueryTokens = [...new Set(queryTokens)];

    if (uniqueQueryTokens.length === 0) {
      return {
        chunks: [],
        maxScore: 0,
        queryTokens: []
      };
    }

    const queryVector = generateVector(query);

    const docFrequencyMap = new Map();
    let totalTokens = 0;
    const chunkTokensMap = new Map();
    const chunkTextMap = new Map();

    for (const chunk of candidateChunks) {
      const fullSearchable = `${chunk.document_title} ${chunk.section} ${chunk.content}`;
      chunkTextMap.set(chunk.chunk_id, fullSearchable);

      const tokens = tokenize(fullSearchable);
      chunkTokensMap.set(chunk.chunk_id, tokens);
      totalTokens += tokens.length;

      const uniqueTokens = new Set(tokens);
      for (const tok of uniqueTokens) {
        docFrequencyMap.set(tok, (docFrequencyMap.get(tok) || 0) + 1);
      }
    }

    const avgDocLength = totalTokens / candidateChunks.length;
    const scoredChunks = [];

    for (const chunk of candidateChunks) {
      const docTokens = chunkTokensMap.get(chunk.chunk_id);
      const docTokensSet = new Set(docTokens);
      const fullSearchable = chunkTextMap.get(chunk.chunk_id);
      const chunkVector = generateVector(fullSearchable);

      let matchedUnique = 0;
      for (const tok of uniqueQueryTokens) {
        if (docTokensSet.has(tok)) matchedUnique++;
      }

      const termCoverage = matchedUnique / uniqueQueryTokens.length;

      const bm25 = calculateBM25(uniqueQueryTokens, docTokens, avgDocLength, candidateChunks.length, docFrequencyMap);
      const cosine = cosineSimilarity(queryVector, chunkVector);
      const bm25Norm = Math.min(1.0, bm25 / 4.0);

      // Section and term exact boosts
      let boost = 0;
      const lowerSection = (chunk.section || '').toLowerCase();
      const lowerContent = chunk.content.toLowerCase();

      for (const tok of uniqueQueryTokens) {
        if (lowerSection.includes(tok)) {
          boost += 0.20;
        }
        // Direct definition match boost for hierarchy tiers
        if (['point', 'center', 'hub', 'command', 'hq', 'node', 'zone', 'territory', 'region', 'nation'].includes(tok)) {
          if (lowerContent.includes(`**${tok}**`) || lowerContent.includes(`**${tok} (`)) {
            boost += 0.45;
          }
        }
      }

      const hybridScore = Math.min(1.0, (0.40 * bm25Norm) + (0.40 * cosine) + boost);

      if (termCoverage >= 0.30 && hybridScore >= similarityThreshold) {
        scoredChunks.push({
          chunkId: chunk.chunk_id,
          documentId: chunk.document_id,
          documentTitle: chunk.document_title,
          category: chunk.category,
          section: chunk.section,
          version: chunk.version,
          source: chunk.source,
          status: chunk.status,
          content: chunk.content,
          termCoverage: Math.round(termCoverage * 100) / 100,
          score: Math.round(hybridScore * 1000) / 1000,
          bm25Score: Math.round(bm25 * 1000) / 1000,
          cosineScore: Math.round(cosine * 1000) / 1000
        });
      }
    }

    scoredChunks.sort((a, b) => b.score - a.score);

    const topChunks = scoredChunks.slice(0, limit);
    const maxScore = topChunks.length > 0 ? topChunks[0].score : 0;

    return {
      chunks: topChunks,
      maxScore,
      queryTokens
    };
  }
}

module.exports = new VectorEngine();

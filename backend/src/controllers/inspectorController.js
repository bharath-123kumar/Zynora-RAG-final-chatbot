/**
 * inspectorController.js
 * Day 18 Admin Improvement: Live RAG Query Inspector
 * Exposes the full RAG pipeline internals to admin for debugging and demonstration.
 * Admin-only endpoint — never accessible to regular users.
 */
const vectorEngine = require('../rag/vectorEngine');
const groundedSynthesizer = require('../rag/groundedSynthesizer');
const logger = require('../utils/logger');

async function inspectQuery(req, res) {
  const { question } = req.body;

  if (!question || typeof question !== 'string' || question.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_INPUT',
      message: 'A valid question string (min 2 chars) is required.'
    });
  }

  const trimmedQuestion = question.trim();

  try {
    const startTime = Date.now();

    // Step 1: Run the retrieval engine — get raw scored chunks
    const retrievalResult = await vectorEngine.retrieve(trimmedQuestion, { limit: 10, threshold: 0.10 });

    const retrievalTimeMs = Date.now() - startTime;

    // Step 2: Run the synthesis step — get grounded answer
    const synthStart = Date.now();
    const synthesisResult = await groundedSynthesizer.synthesize({
      query: trimmedQuestion,
      chunks: retrievalResult.chunks || [],
      maxScore: retrievalResult.maxScore || 0
    });
    const synthesisTimeMs = Date.now() - synthStart;

    const totalTimeMs = Date.now() - startTime;

    // Build the inspector report
    const chunks = (retrievalResult.chunks || []).map((c, idx) => ({
      rank: idx + 1,
      chunkId: c.chunkId,
      documentTitle: c.documentTitle,
      category: c.category,
      section: c.section,
      version: c.version,
      status: c.status,
      termCoverage: c.termCoverage,
      bm25Score: c.bm25Score,
      cosineScore: c.cosineScore,
      hybridScore: c.score,
      passedThreshold: c.score >= 0.22,
      contentPreview: (c.content || '').substring(0, 300)
    }));

    const report = {
      query: trimmedQuestion,
      queryTokens: retrievalResult.queryTokens || [],
      totalChunksRetrieved: chunks.length,
      maxHybridScore: retrievalResult.maxScore || 0,
      retrievalTimeMs,
      synthesisTimeMs,
      totalTimeMs,
      isGrounded: synthesisResult.grounded === true,
      isFallback: synthesisResult.grounded !== true,
      answer: synthesisResult.answer,
      citedSources: (synthesisResult.sources || []).map(s => ({
        documentTitle: s.documentTitle,
        section: s.section,
        relevanceScore: s.relevanceScore,
        chunkId: s.chunkId
      })),
      chunks
    };

    logger.info({
      action: 'RAG_INSPECT_SUCCESS',
      module: 'INSPECTOR',
      status: 'SUCCESS',
      details: {
        query: trimmedQuestion,
        chunksFound: chunks.length,
        isGrounded: synthesisResult.isGrounded,
        totalTimeMs
      },
      userId: req.user?.id || 'admin'
    });

    return res.status(200).json({ success: true, report });

  } catch (err) {
    logger.error({
      action: 'RAG_INSPECT_FAIL',
      module: 'INSPECTOR',
      errorCode: 'INSPECT_ERROR',
      error: err,
      userId: req.user?.id || 'admin'
    });
    return res.status(500).json({
      success: false,
      error: 'INSPECT_ERROR',
      message: 'RAG inspection failed. Check server logs.'
    });
  }
}

module.exports = { inspectQuery };

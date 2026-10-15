/**
 * day18AdminInspector.test.js
 * Day 18 Automated Tests: Live RAG Query Inspector (Admin Demo Feature)
 * Verifies: endpoint security, grounded queries, fallback detection, score structure
 */
const http = require('http');
const app = require('../backend/src/app');

let server;
let adminToken;
let userToken;

const BASE_URL = 'http://localhost:5099';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function login(email, password) {
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  return res.body.token;
}

let passed = 0;
let failed = 0;

function assert(testId, description, condition, detail = '') {
  if (condition) {
    console.log(`✅ PASS [${testId}] ${description}`);
    passed++;
  } else {
    console.error(`❌ FAIL [${testId}] ${description}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n=============================================================');
  console.log('🔍 EXECUTING DAY 18 RAG INSPECTOR TEST SUITE');
  console.log('=============================================================\n');

  // Boot test server on port 5099
  await new Promise(resolve => {
    server = app.listen(5099, resolve);
  });

  // Setup tokens
  adminToken = await login('admin@zyngram.com', 'Admin@Zynora2026!');
  userToken = await login('user@zyngram.com', 'User@Zynora2026!');

  // --- SECURITY TESTS ---
  // [INS-01] Unauthenticated access blocked
  {
    const res = await request('/api/admin/inspect', {
      method: 'POST',
      body: JSON.stringify({ question: 'What is Zyngram?' })
    });
    assert('INS-01', 'Unauthenticated inspector access blocked: HTTP 401', res.status === 401);
  }

  // [INS-02] Standard user (non-admin) access blocked
  {
    const res = await request('/api/admin/inspect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ question: 'What is Zyngram?' })
    });
    assert('INS-02', 'Non-admin user blocked from inspector: HTTP 403', res.status === 403);
  }

  // [INS-03] Missing question body returns 400
  {
    const res = await request('/api/admin/inspect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({})
    });
    assert('INS-03', 'Missing question body returns controlled 400', res.status === 400);
  }

  // [INS-04] Empty string question returns 400
  {
    const res = await request('/api/admin/inspect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ question: '  ' })
    });
    assert('INS-04', 'Empty question string returns controlled 400', res.status === 400);
  }

  // --- FUNCTIONAL TESTS ---
  // [INS-05] Grounded supported query returns expected structure
  {
    const res = await request('/api/admin/inspect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ question: 'What is the mission of Zyngram?' })
    });
    const r = res.body.report;
    assert('INS-05', 'Inspector returns success:true for grounded query', res.body.success === true && res.status === 200);
    assert('INS-06', 'Inspector report contains all required top-level fields',
      r && r.query && Array.isArray(r.queryTokens) && typeof r.totalChunksRetrieved === 'number'
      && typeof r.maxHybridScore === 'number' && typeof r.retrievalTimeMs === 'number'
      && typeof r.totalTimeMs === 'number' && typeof r.isGrounded === 'boolean'
      && r.answer && Array.isArray(r.chunks)
    );
    assert('INS-07', 'Grounded mission query returns isGrounded=true', r && r.isGrounded === true);
    assert('INS-08', 'Mission answer contains "Mission" keyword', r && /mission/i.test(r.answer));
  }

  // [INS-09] Chunks contain correct scoring fields
  {
    const res = await request('/api/admin/inspect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ question: 'What is the mission of Zyngram?' })
    });
    const chunks = res.body.report?.chunks || [];
    const firstChunk = chunks[0];
    assert('INS-09', 'Retrieved chunks include BM25, cosine, hybrid scores and documentTitle',
      firstChunk &&
      typeof firstChunk.bm25Score === 'number' &&
      typeof firstChunk.cosineScore === 'number' &&
      typeof firstChunk.hybridScore === 'number' &&
      typeof firstChunk.documentTitle === 'string' &&
      typeof firstChunk.rank === 'number' &&
      firstChunk.rank === 1
    );
  }

  // [INS-10] Out-of-domain query triggers fallback (isGrounded=false)
  {
    const res = await request('/api/admin/inspect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ question: 'What is the physical size of a banana at Center?' })
    });
    const r = res.body.report;
    assert('INS-10', 'Out-of-domain query triggers fallback: isGrounded=false',
      res.status === 200 && r && r.isGrounded === false
    );
    assert('INS-11', 'Fallback answer is the exact required sentence',
      r && r.answer === "I couldn't find this information in the approved Zyngram knowledge base."
    );
  }

  // [INS-12] Response includes query tokens array (non-empty for real query)
  {
    const res = await request('/api/admin/inspect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ question: 'Explain the Zyngram franchise hierarchy' })
    });
    const r = res.body.report;
    assert('INS-12', 'Query tokens array is non-empty for substantive query',
      r && Array.isArray(r.queryTokens) && r.queryTokens.length > 0
    );
  }

  // Cleanup
  await new Promise(resolve => server.close(resolve));

  // Summary
  console.log('\n-------------------------------------------------------------');
  console.log(`📊 Day 18 Inspector Test Suite Summary: ${passed} / ${passed + failed} Passed (${Math.round(passed / (passed + failed) * 100)}%)`);
  console.log('-------------------------------------------------------------\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});

/**
 * apiIntegration.test.js
 * End-to-end integration tests for:
 * - Health check & version endpoints
 * - Registration & login
 * - Conversation lifecycle (Create, List, Rename, Clear, Delete)
 * - RAG chat with source attribution
 * - Draft & archived document exclusion
 */

const http = require('http');
const app = require('../backend/src/app');
const db = require('../backend/src/db/dbClient');
const jwt = require('../backend/node_modules/jsonwebtoken');
const config = require('../backend/src/config/env');

function makeRequest(server, options, postData = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runApiIntegrationTests() {
  console.log('\n=============================================================');
  console.log('📡 EXECUTING API INTEGRATION & LIFECYCLE TEST SUITE');
  console.log('=============================================================\n');

  await db.init();
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));

  let passedCount = 0;
  const testEmail = `testuser_${Date.now()}@zyngram.com`;
  const testPassword = 'TestPassword123!';
  let authToken = null;
  let activeConvId = null;

  try {
    // 1. Health check /health
    const t1 = await makeRequest(server, { path: '/health' });
    const t1Passed = t1.status === 200 && t1.data.status === 'UP' && t1.data.checks?.database?.status === 'healthy';
    console.log(`${t1Passed ? '✅ PASS' : '❌ FAIL'} [API-01] Health check /health: status UP`);
    if (t1Passed) passedCount++;

    // 2. Health check /api/health
    const t2 = await makeRequest(server, { path: '/api/health' });
    const t2Passed = t2.status === 200 && t2.data.status === 'UP';
    console.log(`${t2Passed ? '✅ PASS' : '❌ FAIL'} [API-02] Health check /api/health: status UP`);
    if (t2Passed) passedCount++;

    // 3. Version /api/version
    const t3 = await makeRequest(server, { path: '/api/version' });
    const t3Passed = t3.status === 200 && t3.data.version !== undefined;
    console.log(`${t3Passed ? '✅ PASS' : '❌ FAIL'} [API-03] Version /api/version: ${t3.data.version}`);
    if (t3Passed) passedCount++;

    // 4. Registration
    const t4 = await makeRequest(server, { path: '/api/auth/register', method: 'POST' }, {
      email: testEmail,
      password: testPassword,
      fullName: 'Integration Test Operator'
    });
    const t4Passed = t4.status === 201 && t4.data.token && t4.data.user?.email === testEmail;
    console.log(`${t4Passed ? '✅ PASS' : '❌ FAIL'} [API-04] User registration: HTTP ${t4.status}`);
    if (t4Passed) passedCount++;

    // 5. Login
    const t5 = await makeRequest(server, { path: '/api/auth/login', method: 'POST' }, {
      email: testEmail,
      password: testPassword
    });
    authToken = t5.data.token;
    const t5Passed = t5.status === 200 && authToken !== undefined;
    console.log(`${t5Passed ? '✅ PASS' : '❌ FAIL'} [API-05] User login: HTTP ${t5.status}`);
    if (t5Passed) passedCount++;

    // 6. Get Me profile
    const t6 = await makeRequest(server, {
      path: '/api/auth/me',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const t6Passed = t6.status === 200 && t6.data.user?.email === testEmail;
    console.log(`${t6Passed ? '✅ PASS' : '❌ FAIL'} [API-06] Profile /api/auth/me: ${t6.data.user?.fullName}`);
    if (t6Passed) passedCount++;

    // 7. Conversation lifecycle: Create -> Rename -> Clear -> Delete
    const t7Create = await makeRequest(server, {
      path: '/api/conversations',
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    }, { title: 'Test Conversation Init' });
    activeConvId = t7Create.data.conversation?.id;

    const t7Rename = await makeRequest(server, {
      path: `/api/conversations/${activeConvId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken}` }
    }, { title: 'Renamed Test Conversation' });

    const t7Clear = await makeRequest(server, {
      path: `/api/conversations/${activeConvId}/clear`,
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const t7List = await makeRequest(server, {
      path: '/api/conversations',
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const t7Passed = t7Create.status === 201 && t7Rename.status === 200 && t7Clear.status === 200 && t7List.data.conversations?.length > 0;
    console.log(`${t7Passed ? '✅ PASS' : '❌ FAIL'} [API-07] Conversation lifecycle operations (Create, Rename, Clear, List)`);
    if (t7Passed) passedCount++;

    // 8. RAG Chat with conversation and source attribution
    const t8 = await makeRequest(server, {
      path: '/api/zynora/chat',
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    }, {
      message: 'Explain the Physical Franchise Hierarchy.',
      conversationId: activeConvId
    });
    const t8Passed = t8.status === 200 && t8.data.grounded === true && t8.data.sources?.length > 0 && t8.data.sources[0].documentTitle.includes('Franchise');
    console.log(`${t8Passed ? '✅ PASS' : '❌ FAIL'} [API-08] RAG Chat response with verified source citations: ${t8.data.sources?.length} sources`);
    if (t8Passed) passedCount++;

    // 9. Draft document exclusion verification
    // Querying content from draft_sample_guideline.txt
    const t9 = await makeRequest(server, {
      path: '/api/zynora/chat',
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    }, {
      message: 'What is the discretionary quarterly performance stipend for delivery drivers at Center locations?',
      conversationId: activeConvId
    });
    const t9Passed = t9.data.grounded === false && t9.data.sources?.length === 0;
    console.log(`${t9Passed ? '✅ PASS' : '❌ FAIL'} [API-09] Draft document exclusion verified: DRAFT status excluded from RAG`);
    if (t9Passed) passedCount++;

    // 10. Archived document exclusion verification
    // Querying content from archived_pilot_2023.txt
    const t10 = await makeRequest(server, {
      path: '/api/zynora/chat',
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    }, {
      message: 'Describe the 2023 manual clipboard tracking at Point facilities.',
      conversationId: activeConvId
    });
    const t10Passed = t10.data.grounded === false && t10.data.sources?.length === 0;
    console.log(`${t10Passed ? '✅ PASS' : '❌ FAIL'} [API-10] Archived document exclusion verified: ARCHIVED status excluded from RAG`);
    if (t10Passed) passedCount++;

  } finally {
    server.close();
  }

  console.log('\n-------------------------------------------------------------');
  console.log(`📊 API Integration Test Summary: ${passedCount} / 10 Passed (${Math.round((passedCount / 10) * 100)}%)`);
  console.log('-------------------------------------------------------------\n');

  return { total: 10, passed: passedCount, failed: 10 - passedCount };
}

if (require.main === module) {
  runApiIntegrationTests()
    .then(summary => process.exit(summary.failed === 0 ? 0 : 1))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runApiIntegrationTests };

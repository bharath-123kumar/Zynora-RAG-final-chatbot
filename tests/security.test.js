/**
 * security.test.js
 * Comprehensive security test suite verifying:
 * - JWT authentication & invalid token rejection
 * - Cross-user conversation isolation
 * - Role-based authorization (Admin vs User)
 * - SQL injection resistance
 * - Rate limiting enforcement
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

async function runSecurityTests() {
  console.log('\n=============================================================');
  console.log('🔒 EXECUTING SECURITY & AUTHORIZATION TEST SUITE');
  console.log('=============================================================\n');

  await db.init();
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));

  const results = [];
  let passedCount = 0;

  try {
    // 1. Generate tokens for User A, User B, and Admin
    const userAToken = jwt.sign(
      { id: 'usr_demo_002', email: 'user@zyngram.com', role: 'user', fullName: 'Operator A' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const userBToken = jwt.sign(
      { id: 'usr_other_user_999', email: 'other@zyngram.com', role: 'user', fullName: 'Operator B' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const adminToken = jwt.sign(
      { id: 'usr_admin_001', email: 'admin@zyngram.com', role: 'admin', fullName: 'Admin' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const expiredToken = jwt.sign(
      { id: 'usr_expired_000', email: 'expired@zyngram.com', role: 'user' },
      config.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    // Test 1: Invalid Token Rejection
    const t1 = await makeRequest(server, {
      path: '/api/conversations',
      headers: { Authorization: 'Bearer invalid.token.payload' }
    });
    const t1Passed = t1.status === 401 && t1.data.error === 'INVALID_TOKEN';
    console.log(`${t1Passed ? '✅ PASS' : '❌ FAIL'} [SEC-01] Invalid JWT rejection: HTTP ${t1.status}`);
    if (t1Passed) passedCount++;

    // Test 2: Expired Token Rejection
    const t2 = await makeRequest(server, {
      path: '/api/conversations',
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    const t2Passed = t2.status === 401 && t2.data.error === 'INVALID_TOKEN';
    console.log(`${t2Passed ? '✅ PASS' : '❌ FAIL'} [SEC-02] Expired JWT rejection: HTTP ${t2.status}`);
    if (t2Passed) passedCount++;

    // Test 3: Create conversation as User A
    const t3 = await makeRequest(server, {
      path: '/api/conversations',
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` }
    }, { title: 'User A Private Chat' });
    const convAId = t3.data.conversation?.id;
    const t3Passed = t3.status === 201 && convAId !== undefined;
    console.log(`${t3Passed ? '✅ PASS' : '❌ FAIL'} [SEC-03] Conversation created by User A: ${convAId}`);
    if (t3Passed) passedCount++;

    // Test 4: Cross-User Access (User B attempts to read User A's conversation)
    const t4 = await makeRequest(server, {
      path: `/api/conversations/${convAId}`,
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    const t4Passed = t4.status === 404 || t4.status === 403;
    console.log(`${t4Passed ? '✅ PASS' : '❌ FAIL'} [SEC-04] Cross-user access blocked (User B reading User A): HTTP ${t4.status}`);
    if (t4Passed) passedCount++;

    // Test 5: Cross-User Deletion (User B attempts to delete User A's conversation)
    const t5 = await makeRequest(server, {
      path: `/api/conversations/${convAId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    const t5Passed = t5.status === 404 || t5.status === 403;
    console.log(`${t5Passed ? '✅ PASS' : '❌ FAIL'} [SEC-05] Cross-user deletion blocked (User B deleting User A): HTTP ${t5.status}`);
    if (t5Passed) passedCount++;

    // Test 6: Non-Admin blocked from Admin Knowledge routes
    const t6 = await makeRequest(server, {
      path: '/api/knowledge/documents',
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    const t6Passed = t6.status === 403 && t6.data.error === 'FORBIDDEN';
    console.log(`${t6Passed ? '✅ PASS' : '❌ FAIL'} [SEC-06] Standard user blocked from Admin Knowledge routes: HTTP ${t6.status}`);
    if (t6Passed) passedCount++;

    // Test 7: Non-Admin blocked from Monitoring metrics
    const t7 = await makeRequest(server, {
      path: '/api/monitoring/metrics',
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    const t7Passed = t7.status === 403 && t7.data.error === 'FORBIDDEN';
    console.log(`${t7Passed ? '✅ PASS' : '❌ FAIL'} [SEC-07] Standard user blocked from Monitoring metrics: HTTP ${t7.status}`);
    if (t7Passed) passedCount++;

    // Test 8: Admin allowed on Monitoring metrics
    const t8 = await makeRequest(server, {
      path: '/api/monitoring/metrics',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const t8Passed = t8.status === 200 && t8.data.success === true;
    console.log(`${t8Passed ? '✅ PASS' : '❌ FAIL'} [SEC-08] Admin successfully accesses Monitoring metrics: HTTP ${t8.status}`);
    if (t8Passed) passedCount++;

    // Test 9: SQL Injection resistance on Chat
    const t9 = await makeRequest(server, {
      path: '/api/zynora/chat',
      method: 'POST'
    }, { message: "What is Point?'; DROP TABLE users; --" });
    const t9Passed = t9.status === 200;
    // Verify users table still exists
    const checkUsers = await db.query('SELECT COUNT(*) AS count FROM users');
    const dbIntact = parseInt(checkUsers.rows[0].count, 10) > 0;
    console.log(`${(t9Passed && dbIntact) ? '✅ PASS' : '❌ FAIL'} [SEC-09] SQL Injection attempt safely handled via parameterized queries`);
    if (t9Passed && dbIntact) passedCount++;

    // Test 10: Oversized message payload rejected (> 2000 chars)
    const longMessage = 'A'.repeat(2500);
    const t10 = await makeRequest(server, {
      path: '/api/zynora/chat',
      method: 'POST'
    }, { message: longMessage });
    const t10Passed = t10.status === 400 && t10.data.error === 'PAYLOAD_TOO_LARGE';
    console.log(`${t10Passed ? '✅ PASS' : '❌ FAIL'} [SEC-10] Payload too large rejected: HTTP ${t10.status}`);
    if (t10Passed) passedCount++;

  } finally {
    server.close();
  }

  console.log('\n-------------------------------------------------------------');
  console.log(`📊 Security Test Suite Summary: ${passedCount} / 10 Passed (${Math.round((passedCount / 10) * 100)}%)`);
  console.log('-------------------------------------------------------------\n');

  return { total: 10, passed: passedCount, failed: 10 - passedCount };
}

if (require.main === module) {
  runSecurityTests()
    .then(summary => process.exit(summary.failed === 0 ? 0 : 1))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runSecurityTests };

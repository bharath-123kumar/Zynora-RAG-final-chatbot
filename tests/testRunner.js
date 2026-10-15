/**
 * testRunner.js
 * Master automated test runner executing:
 * 1. 40-case RAG Evaluation & Quality Test Suite
 * 2. 10-case Security & Authorization Test Suite
 * 3. 10-case API Integration & Lifecycle Test Suite
 * Total: 60 comprehensive test cases.
 */

const { runRAGSuite } = require('./ragEvaluationSuite');
const { runSecurityTests } = require('./security.test');
const { runApiIntegrationTests } = require('./apiIntegration.test');
const { runDay17Tests } = require('./day17Improvements.test');
const { runDay18Tests } = require('./day18Improvements.test');

async function runAllTests() {
  const startTime = Date.now();
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       ZYNORA AI RAG CHATBOT — AUTOMATED TEST RUNNER        ║');
  console.log('║   Day 11, 12, 13, 14, 17, 18 Specification Compliance Suite║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  // 1. RAG Evaluation Suite
  try {
    const ragResults = await runRAGSuite();
    totalTests += ragResults.total;
    totalPassed += ragResults.passed;
    totalFailed += ragResults.failed;
  } catch (err) {
    console.error('Fatal error in RAG Suite:', err);
    totalFailed += 40;
  }

  // 2. Security Suite
  try {
    const secResults = await runSecurityTests();
    totalTests += secResults.total;
    totalPassed += secResults.passed;
    totalFailed += secResults.failed;
  } catch (err) {
    console.error('Fatal error in Security Suite:', err);
    totalFailed += 10;
  }

  // 3. API Integration Suite
  try {
    const apiResults = await runApiIntegrationTests();
    totalTests += apiResults.total;
    totalPassed += apiResults.passed;
    totalFailed += apiResults.failed;
  } catch (err) {
    console.error('Fatal error in API Integration Suite:', err);
    totalFailed += 10;
  }

  // 4. Day 17 Improvements Suite
  try {
    const day17Results = await runDay17Tests();
    totalTests += day17Results.total;
    totalPassed += day17Results.passed;
    totalFailed += day17Results.failed;
  } catch (err) {
    console.error('Fatal error in Day 17 Suite:', err);
    totalFailed += 10;
  }

  // 5. Day 18 Improvements Suite
  try {
    const day18Results = await runDay18Tests();
    totalTests += day18Results.total;
    totalPassed += day18Results.passed;
    totalFailed += day18Results.failed;
  } catch (err) {
    console.error('Fatal error in Day 18 Suite:', err);
    totalFailed += 10;
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const passRate = Math.round((totalPassed / totalTests) * 100);

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                  FINAL CONSOLIDATED SUMMARY                ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Total Test Cases Executed: ${totalTests.toString().padEnd(31)} ║`);
  console.log(`║ Passed Tests:             ${totalPassed.toString().padEnd(32)} ║`);
  console.log(`║ Failed Tests:             ${totalFailed.toString().padEnd(32)} ║`);
  console.log(`║ Success Rate:             ${`${passRate}%`.padEnd(32)} ║`);
  console.log(`║ Execution Time:           ${`${durationSec} seconds`.padEnd(32)} ║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (totalFailed > 0) {
    console.error(`❌ TEST SUITE FAILED: ${totalFailed} defect(s) detected.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${totalTests} TESTS PASSED SUCCESSFULLY WITH ZERO DEFECTS!`);
    process.exit(0);
  }
}

if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };

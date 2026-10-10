/**
 * run_dev.js
 * Launches both backend and frontend concurrently with structured logging.
 */
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Zynora AI RAG Chatbot (Backend & Frontend)...');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// 1. Backend Process
const backendProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.resolve(__dirname, '../backend'),
  stdio: 'inherit',
  shell: true
});

// 2. Frontend Process
const frontendProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.resolve(__dirname, '../frontend'),
  stdio: 'inherit',
  shell: true
});

const { execSync } = require('child_process');

function killProcess(proc) {
  if (!proc || !proc.pid) return;
  try {
    if (isWindows) {
      execSync(`taskkill /PID ${proc.pid} /T /F 2>nul`, { stdio: 'ignore' });
    } else {
      proc.kill('SIGTERM');
    }
  } catch (e) {
    // Process already exited
  }
}

function cleanup() {
  console.log('\n🛑 Shutting down backend and frontend services...');
  killProcess(backendProcess);
  killProcess(frontendProcess);
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

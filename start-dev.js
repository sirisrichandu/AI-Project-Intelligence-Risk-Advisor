#!/usr/bin/env node
import { spawn } from 'child_process';
import http from 'http';
import process from 'process';

const FASTAPI_PORT = process.env.FASTAPI_PORT || 8001;
const VITE_PORT = process.env.PORT || 3000;
let backendProcess = null;
let frontendProcess = null;

function checkHealth(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function waitForBackend(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const ok = await checkHealth(`http://127.0.0.1:${FASTAPI_PORT}/api/health-check`);
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function startBackend() {
  console.log(`[start-dev] Starting FastAPI backend on port ${FASTAPI_PORT}...`);
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  backendProcess = spawn(
    pythonCmd,
    ['-m', 'uvicorn', 'backend.main:app', '--host', '0.0.0.0', '--port', String(FASTAPI_PORT)],
    { stdio: 'inherit' }
  );

  backendProcess.on('error', (err) => {
    console.error(`[start-dev] Failed to spawn Python backend (${pythonCmd}):`, err.message);
  });
}

function startFrontend() {
  console.log(`[start-dev] Starting Vite frontend on port ${VITE_PORT}...`);
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  frontendProcess = spawn(
    npxCmd,
    ['vite', '--port', String(VITE_PORT), '--host', '0.0.0.0'],
    { stdio: 'inherit' }
  );

  frontendProcess.on('error', (err) => {
    console.error(`[start-dev] Failed to spawn Vite frontend:`, err.message);
  });
}

async function main() {
  const alreadyRunning = await checkHealth(`http://127.0.0.1:${FASTAPI_PORT}/api/health-check`);
  if (alreadyRunning) {
    console.log(`[start-dev] FastAPI backend is already running on port ${FASTAPI_PORT}.`);
  } else {
    startBackend();
    const ready = await waitForBackend();
    if (ready) {
      console.log(`[start-dev] FastAPI backend is ready.`);
    } else {
      console.warn(`[start-dev] FastAPI health-check did not respond in time, proceeding to start frontend...`);
    }
  }

  startFrontend();

  const shutdown = () => {
    console.log('\n[start-dev] Shutting down processes...');
    if (frontendProcess) frontendProcess.kill();
    if (backendProcess) backendProcess.kill();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[start-dev] Error:', err);
  process.exit(1);
});

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
  console.log(`[start-dev] Starting backend service on port ${FASTAPI_PORT}...`);
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

  // Try spawning Python backend first; if python fails or uvicorn is missing, spawn tsx server.ts
  backendProcess = spawn(
    pythonCmd,
    ['-m', 'uvicorn', 'backend.main:app', '--host', '0.0.0.0', '--port', String(FASTAPI_PORT)],
    { stdio: 'inherit' }
  );

  backendProcess.on('error', (err) => {
    console.warn(`[start-dev] Python backend unavailable (${err.message}). Starting full-stack TypeScript backend server...`);
    spawnTsxBackend();
  });

  backendProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.warn(`[start-dev] Python backend exited with code ${code}. Starting full-stack TypeScript backend server on port ${FASTAPI_PORT}...`);
      spawnTsxBackend();
    }
  });
}

function spawnTsxBackend() {
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  backendProcess = spawn(
    npxCmd,
    ['tsx', 'server.ts'],
    {
      stdio: 'inherit',
      env: { ...process.env, PORT: String(FASTAPI_PORT) },
    }
  );
  backendProcess.on('error', (err) => {
    console.error('[start-dev] Failed to spawn TypeScript backend server:', err.message);
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

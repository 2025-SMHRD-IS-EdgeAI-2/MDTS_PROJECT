#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = dirname(fileURLToPath(import.meta.url));
const NODE_PATH = process.platform === 'win32' ? 'node.exe' : 'node';
const PYTHON_CMD = process.env.MDTS_AI_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const FRONTEND_PORT = process.env.MDTS_FRONTEND_PORT || '5174';

const paths = [];
if (process.platform === 'win32') {
  paths.push(resolve(ROOT_DIR, 'ai_backend'));
  paths.push(resolve(ROOT_DIR, 'ai_backend', 'M_MEDIC_v2', '04_integrated_system'));
} else {
  paths.push(resolve(ROOT_DIR, 'ai_backend'));
  paths.push(resolve(ROOT_DIR, 'ai_backend', 'M_MEDIC_v2', '04_integrated_system'));
}
const pyPath = [paths[0], paths[1], process.env.PYTHONPATH].filter(Boolean).join(process.platform === 'win32' ? ';' : ':');

const children = [];

function spawnManaged(command, args, cwd, extraEnv = {}) {
  const child = spawn(command, args, {
    cwd,
    shell: false,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...extraEnv,
      PYTHONPATH: pyPath,
    },
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[STOP] ${command} terminated by ${signal}`);
      return;
    }
    if (code !== 0) {
      console.error(`[ERROR] ${command} exited with code ${code}`);
    }
  });

  children.push(child);
  return child;
}

function killChildren() {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
}

process.on('SIGINT', () => {
  console.log('SIGINT received. shutting down all services...');
  killChildren();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. shutting down all services...');
  killChildren();
  process.exit(0);
});

console.log('[START] MDTS dashboard API');
spawnManaged(NODE_PATH, [resolve(ROOT_DIR, 'server', 'index.js')], ROOT_DIR, {});

console.log('[START] MDTS AI backend (FastAPI)');
spawnManaged(NODE_PATH, [resolve(ROOT_DIR, 'start_ai_backend.mjs')], ROOT_DIR, {
  PYTHONPATH: pyPath,
});

console.log('[START] MDTS Frontend (Vite)');
spawnManaged(NODE_PATH, [
  resolve(ROOT_DIR, 'node_modules', 'vite', 'bin', 'vite.js'),
  '--host',
  '0.0.0.0',
  '--port',
  FRONTEND_PORT,
], ROOT_DIR, {});

console.log('MDTS stack is running:');
console.log(`- Frontend: http://localhost:${FRONTEND_PORT}`);
console.log('- Dashboard API: http://localhost:4000');
console.log('- AI API: http://localhost:8000');

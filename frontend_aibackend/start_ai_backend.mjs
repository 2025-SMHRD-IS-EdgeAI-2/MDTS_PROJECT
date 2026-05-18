#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = dirname(fileURLToPath(import.meta.url));
const PYTHON_CMD = process.env.MDTS_AI_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const pyPath = [
  resolve(ROOT_DIR, 'ai_backend'),
  resolve(ROOT_DIR, 'ai_backend', 'M_MEDIC_v2', '04_integrated_system'),
  process.env.PYTHONPATH,
].filter(Boolean).join(process.platform === 'win32' ? ';' : ':');

spawn(PYTHON_CMD, [resolve(ROOT_DIR, 'ai_backend', 'm_medic_server.py')], {
  cwd: ROOT_DIR,
  stdio: 'inherit',
  shell: false,
  env: {
    ...process.env,
    PYTHONPATH: pyPath,
  },
});
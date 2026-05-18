import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ── DB 연결 풀 ──
const pool = mysql.createPool({
  host: 'YOUR_REMOTE_DB_HOST',
  port: 3307,
  user: 'MDTS',
  password: 'YOUR_DB_PASSWORD',
  database: 'MDTS',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
});

const localSensorPool = mysql.createPool({
  host: 'YOUR_RPI_HOST',
  port: 3306,
  user: 'mdts',
  password: 'YOUR_DB_PASSWORD',
  database: 'MDTS',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
});

const SENSOR_SERVER_BASE = 'http://YOUR_RPI_HOST:5000';
const OLLAMA_BASE = process.env.MDTS_OLLAMA_BASE || 'http://127.0.0.1:11434';
const REMOTE_TRAUMA_STARTER = path.join(PROJECT_ROOT, 'tools', 'start_remote_trauma_stack.py');
const JETSON_HOST = process.env.MDTS_JETSON_HOST || 'YOUR_JETSON_HOST';
const JETSON_USER = process.env.MDTS_JETSON_USER || 'jetson';
const JETSON_PASSWORD = process.env.MDTS_JETSON_PASSWORD || 'YOUR_JETSON_PASSWORD';

let patientHistoryTableReady = false;

const toNullableText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
};

const toIntValue = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.round(numberValue) : 0;
};

const toFloatValue = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Number(numberValue.toFixed(2)) : 0;
};

const stringifyList = (value) => {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value === undefined || value === null || value === '') return JSON.stringify([]);
  return JSON.stringify([String(value)]);
};

const listSummary = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return toNullableText(value) || '';
};

const truncateText = (value, maxLength) => {
  const text = toNullableText(value);
  if (!text) return null;
  return text.length > maxLength ? text.slice(0, maxLength) : text;
};

async function sensorRequest(path, options = {}) {
  const { timeoutMs = 2500, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${SENSOR_SERVER_BASE}${path}`, {
      ...fetchOptions,
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Sensor API ${response.status}: ${text || response.statusText}`);
    }
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timeout);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkOllamaHealth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-store' },
    });
    const text = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        connected: false,
        status: 'down',
        reason: `Ollama API ${response.status}`,
        detail: text || response.statusText,
      };
    }

    const payload = text ? JSON.parse(text) : {};
    const models = Array.isArray(payload.models) ? payload.models.map((model) => model.name || model.model).filter(Boolean) : [];
    return {
      ok: true,
      connected: true,
      status: 'online',
      base: OLLAMA_BASE,
      models,
      model_count: models.length,
      checked_at: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      connected: false,
      status: 'down',
      base: OLLAMA_BASE,
      reason: error.message,
      checked_at: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function runRemoteTraumaStarter() {
  return new Promise((resolve, reject) => {
    const pythonExecutable = process.env.MDTS_PYTHON || process.env.PYTHON || 'python';
    execFile(
      pythonExecutable,
      [REMOTE_TRAUMA_STARTER],
      {
        cwd: PROJECT_ROOT,
        timeout: 30000,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
        env: process.env,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`remote starter failed: ${error.message}${stderr ? ` / ${stderr}` : ''}`));
          return;
        }
        resolve(stdout ? stdout.trim() : '');
      }
    );
  });
}

function runJetsonOllamaCommand(action) {
  return new Promise((resolve, reject) => {
    const allowedActions = new Set(['start', 'stop', 'restart']);
    if (!allowedActions.has(action)) {
      reject(new Error(`Unsupported Ollama action: ${action}`));
      return;
    }

    const pythonExecutable = process.env.MDTS_PYTHON || process.env.PYTHON || 'python';
    const script = `
import paramiko
import sys

host = ${JSON.stringify(JETSON_HOST)}
user = ${JSON.stringify(JETSON_USER)}
password = ${JSON.stringify(JETSON_PASSWORD)}
action = ${JSON.stringify(action)}

cmd = f"""
set -u
printf '%s\\n' {password!r} | sudo -S systemctl {action} ollama
sleep 2
systemctl is-active ollama 2>/dev/null || true
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(host, username=user, password=password, timeout=8, auth_timeout=8, banner_timeout=8)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=20)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    code = stdout.channel.recv_exit_status()
    if out:
        print(out)
    if err:
        print(err, file=sys.stderr)
    raise SystemExit(code)
finally:
    client.close()
`;

    execFile(
      pythonExecutable,
      ['-c', script],
      {
        cwd: PROJECT_ROOT,
        timeout: 30000,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
        env: process.env,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Jetson Ollama ${action} failed: ${error.message}${stderr ? ` / ${stderr}` : ''}`));
          return;
        }
        resolve({
          action,
          stdout: stdout ? stdout.trim() : '',
          stderr: stderr ? stderr.trim() : '',
        });
      }
    );
  });
}

async function startPyqtTraumaWithFallback() {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    timeoutMs: 5000,
  };

  try {
    return await sensorRequest('/trauma/start', requestOptions);
  } catch (firstError) {
    console.warn('[trauma] PyQt5 start request failed. Trying remote auto-start:', firstError.message);
    const starterOutput = await runRemoteTraumaStarter();
    await delay(4500);
    try {
      const result = await sensorRequest('/trauma/start', requestOptions);
      return {
        ...(result || { ok: true, action: 'trauma_start' }),
        autostart: true,
        starter_output: starterOutput,
      };
    } catch (secondError) {
      throw new Error(`PyQt5 auto-start completed but trauma start still failed. first=${firstError.message}; second=${secondError.message}; starter=${starterOutput}`);
    }
  }
}

function normalizeSensorPayload(vitals = {}, recording = {}, crew = {}) {
  const sbp = toIntValue(vitals.SBP);
  const dbp = toIntValue(vitals.DBP);
  const crewId = toIntValue(crew.crew_id || vitals.crew_id || recording.crew_id);
  return {
    status: 'success',
    source: 'pyqt5_sensor_server',
    crew_id: crewId > 0 ? crewId : null,
    recording_enabled: Boolean(vitals.recording_enabled || recording.recording_enabled),
    heart_rate: toIntValue(vitals.HR),
    spo2: toIntValue(vitals.SpO2),
    respiration_rate: toIntValue(vitals.RESP),
    blood_pressure: sbp > 0 && dbp > 0 ? `${sbp}/${dbp}` : '0',
    temperature: toFloatValue(vitals.TEMP),
    measured_at: new Date().toISOString(),
    manual: vitals.manual || recording.manual || {},
  };
}

async function ensurePatientHistoryTable() {
  if (patientHistoryTableReady) return;

  await localSensorPool.query(`
    CREATE TABLE IF NOT EXISTS tb_patient_history (
      history_id INT AUTO_INCREMENT PRIMARY KEY,
      crew_id INT NULL,
      patient_id VARCHAR(20) NULL,
      name VARCHAR(50) NOT NULL,
      doctor_id VARCHAR(20) NULL,
      doctor_name VARCHAR(50) NULL,
      occurrence_time VARCHAR(30) NULL,
      last_meal_time VARCHAR(50) NULL,
      main_complaint VARCHAR(255) NULL,
      location VARCHAR(255) NULL,
      pain_areas TEXT NULL,
      selected_symptoms TEXT NULL,
      prescribed_meds TEXT NULL,
      other_actions TEXT NULL,
      diagnosis VARCHAR(255) NULL,
      treatment_guide TEXT NULL,
      recommended_meds TEXT NULL,
      blood_pressure VARCHAR(20) NULL,
      heart_rate INT DEFAULT 0,
      spo2 INT DEFAULT 0,
      respiration_rate INT DEFAULT 0,
      temperature DECIMAL(5,2) DEFAULT 0.00,
      notes TEXT NULL,
      is_emergency TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_crew_created (crew_id, created_at),
      INDEX idx_name_created (name, created_at)
    )
  `);

  const [columns] = await localSensorPool.query('SHOW COLUMNS FROM tb_patient_history');
  const existingColumns = new Set(columns.map((column) => column.Field));
  const requiredColumns = {
    crew_id: 'INT NULL',
    patient_id: 'VARCHAR(20) NULL',
    doctor_id: 'VARCHAR(20) NULL',
    doctor_name: 'VARCHAR(50) NULL',
    occurrence_time: 'VARCHAR(30) NULL',
    last_meal_time: 'VARCHAR(50) NULL',
    main_complaint: 'VARCHAR(255) NULL',
    location: 'VARCHAR(255) NULL',
    pain_areas: 'TEXT NULL',
    selected_symptoms: 'TEXT NULL',
    prescribed_meds: 'TEXT NULL',
    other_actions: 'TEXT NULL',
    treatment_guide: 'TEXT NULL',
    recommended_meds: 'TEXT NULL',
    spo2: 'INT DEFAULT 0',
    respiration_rate: 'INT DEFAULT 0',
    temperature: 'DECIMAL(5,2) DEFAULT 0.00',
    is_emergency: 'TINYINT(1) DEFAULT 0',
  };

  for (const [columnName, definition] of Object.entries(requiredColumns)) {
    if (!existingColumns.has(columnName)) {
      await localSensorPool.query(`ALTER TABLE tb_patient_history ADD COLUMN ${columnName} ${definition}`);
      existingColumns.add(columnName);
    }
  }

  const diagnosisColumn = columns.find((column) => column.Field === 'diagnosis');
  if (diagnosisColumn && !String(diagnosisColumn.Type).toLowerCase().includes('varchar(255)')) {
    await localSensorPool.query('ALTER TABLE tb_patient_history MODIFY diagnosis VARCHAR(255) NULL');
  }

  patientHistoryTableReady = true;
}

function normalizePatientHistoryPayload(body = {}) {
  const vitals = body.vitals || {};
  const painAreaSummary = listSummary(body.painAreas || body.pain_areas);
  const symptomSummary = listSummary(body.selectedSymptoms || body.selected_symptoms);
  const medSummary = listSummary(body.prescribedMeds || body.prescribed_meds);
  const guideSummary = listSummary(body.treatmentGuide || body.treatment_guide);
  const recommendedMedSummary = listSummary(body.recommendedMeds || body.recommended_meds);
  const detailedNote = toNullableText(body.detailedNote || body.detailed_note);
  const otherActions = toNullableText(body.otherActions || body.other_actions);
  const aiBriefing = toNullableText(body.aiBriefing || body.ai_briefing);
  const diagnosis = truncateText(body.diagnosis || body.mainComplaint || body.main_complaint || symptomSummary || '경과 관찰 중', 255);

  const notes = [
    painAreaSummary ? `Pain areas: ${painAreaSummary}` : '',
    symptomSummary ? `Symptoms: ${symptomSummary}` : '',
    detailedNote ? `Detail: ${detailedNote}` : '',
    medSummary ? `Medications/actions: ${medSummary}` : '',
    otherActions ? `Other actions: ${otherActions}` : '',
    aiBriefing ? `AI briefing: ${aiBriefing}` : '',
    guideSummary ? `Treatment guide: ${guideSummary}` : '',
    recommendedMedSummary ? `Recommended meds: ${recommendedMedSummary}` : '',
  ].filter(Boolean).join('\n');

  const crewId = toIntValue(body.crew_id || body.crewId);

  return {
    crew_id: crewId > 0 ? crewId : null,
    patient_id: toNullableText(body.patientId || body.patient_id),
    name: toNullableText(body.patientName || body.name),
    doctor_id: toNullableText(body.doctorId || body.doctor_id),
    doctor_name: toNullableText(body.doctorName || body.doctor_name),
    occurrence_time: toNullableText(body.occurrenceTime || body.occurrence_time),
    last_meal_time: toNullableText(body.lastMealTime || body.last_meal_time),
    main_complaint: toNullableText(body.mainComplaint || body.main_complaint),
    location: toNullableText(body.location),
    pain_areas: stringifyList(body.painAreas || body.pain_areas),
    selected_symptoms: stringifyList(body.selectedSymptoms || body.selected_symptoms),
    prescribed_meds: stringifyList(body.prescribedMeds || body.prescribed_meds),
    other_actions: otherActions,
    diagnosis,
    treatment_guide: stringifyList(body.treatmentGuide || body.treatment_guide),
    recommended_meds: stringifyList(body.recommendedMeds || body.recommended_meds),
    blood_pressure: toNullableText(vitals.bp || body.blood_pressure),
    heart_rate: toIntValue(vitals.hr || body.heart_rate),
    spo2: toIntValue(vitals.spo2 || body.spo2),
    respiration_rate: toIntValue(vitals.rr || body.respiration_rate),
    temperature: toFloatValue(vitals.temp || body.temperature),
    notes,
    is_emergency: body.isEmergency || body.is_emergency ? 1 : 0,
  };
}

// ── 선원 전체 조회 ──
app.get('/api/crew', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM tb_crew ORDER BY crew_id');
  res.json(rows);
});

// ── 선원 단일 조회 ──
app.get('/api/crew/:id', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM tb_crew WHERE crew_id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// ── 최신 바이탈 조회 (선원별) ──
app.get('/api/vital/latest/:crewId', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM tb_vital WHERE crew_id = ? ORDER BY measured_at DESC LIMIT 1',
    [req.params.crewId]
  );
  res.json(rows[0] || null);
});

// ── 전체 선원 최신 바이탈 한번에 조회 ──
app.get('/api/vital/latest', async (req, res) => {
  const [rows] = await pool.query(`
    SELECT v.* FROM tb_vital v
    INNER JOIN (
      SELECT crew_id, MAX(measured_at) AS max_at
      FROM tb_vital GROUP BY crew_id
    ) latest ON v.crew_id = latest.crew_id AND v.measured_at = latest.max_at
    ORDER BY v.crew_id
  `);
  res.json(rows);
});

app.get('/api/db/status', async (_req, res) => {
  const checks = { remote_mdts: false, local_pi: false };

  try {
    const remoteConn = await pool.getConnection();
    await remoteConn.ping();
    checks.remote_mdts = true;
    remoteConn.release();
  } catch {
    checks.remote_mdts = false;
  }

  try {
    const localConn = await localSensorPool.getConnection();
    await localConn.ping();
    checks.local_pi = true;
    localConn.release();
  } catch {
    checks.local_pi = false;
  }

  res.json({
    status: checks.remote_mdts || checks.local_pi ? 'partial' : 'down',
    details: checks,
  });
});

app.get('/api/ai/ollama-health', async (_req, res) => {
  const health = await checkOllamaHealth();
  res.status(health.connected ? 200 : 503).json(health);
});

app.post('/api/ai/ollama-toggle', async (req, res) => {
  const requestedAction = String(req.body?.action || '').trim().toLowerCase();
  const currentHealth = await checkOllamaHealth();
  const action = requestedAction || (currentHealth.connected ? 'stop' : 'start');

  try {
    const commandResult = await runJetsonOllamaCommand(action);
    await delay(1200);
    const nextHealth = await checkOllamaHealth();
    res.json({
      ok: true,
      action,
      command: commandResult,
      health: nextHealth,
    });
  } catch (error) {
    const nextHealth = await checkOllamaHealth();
    res.status(503).json({
      ok: false,
      action,
      error: error.message,
      health: nextHealth,
    });
  }
});

app.get('/api/sensor/live', async (_req, res) => {
  try {
    const [vitalsResult, recordingResult, crewResult] = await Promise.allSettled([
      sensorRequest('/vitals'),
      sensorRequest('/recording'),
      sensorRequest('/crew'),
    ]);

    if (vitalsResult.status !== 'fulfilled') {
      return res.status(503).json({ status: 'error', error: vitalsResult.reason?.message || 'Sensor server unavailable' });
    }

    res.json(normalizeSensorPayload(
      vitalsResult.value || {},
      recordingResult.status === 'fulfilled' ? recordingResult.value || {} : {},
      crewResult.status === 'fulfilled' ? crewResult.value || {} : {}
    ));
  } catch (error) {
    res.status(503).json({ status: 'error', error: error.message });
  }
});

app.get('/api/sensor/crew', async (_req, res) => {
  try {
    const crew = await sensorRequest('/crew');
    res.json(crew || { ok: false, crew_id: null });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.post('/api/sensor/crew', async (req, res) => {
  const crewId = toIntValue(req.body?.crew_id || req.body?.crewId);
  if (crewId <= 0) {
    return res.status(400).json({ ok: false, reason: 'Invalid crew_id' });
  }

  try {
    const result = await sensorRequest('/crew', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crew_id: crewId }),
    });
    res.json(result || { ok: true, crew_id: crewId });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.get('/api/sensor/crew/focus', async (_req, res) => {
  try {
    const result = await sensorRequest('/crew/focus');
    res.json(result || { ok: true, focused_crew_ids: [] });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.post('/api/sensor/crew/focus', async (req, res) => {
  const body = req.body || {};
  const payload = {
    source: body.source || 'web',
  };

  if (Array.isArray(body.crew_ids)) {
    payload.crew_ids = body.crew_ids.map(toIntValue).filter((crewId) => crewId > 0);
  } else {
    const crewId = toIntValue(body.crew_id || body.crewId);
    if (crewId <= 0) {
      return res.status(400).json({ ok: false, reason: 'Invalid crew_id' });
    }
    payload.crew_id = crewId;
    payload.focused = Boolean(body.focused ?? body.isEmergency ?? true);
  }

  try {
    const result = await sensorRequest('/crew/focus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    res.json(result || { ok: true, focused_crew_ids: payload.crew_ids || [] });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

// ── Jetson Nano PyQt5 외상 촬영 연동 ──
app.post('/api/trauma/pyqt5/start', async (_req, res) => {
  try {
    const result = await startPyqtTraumaWithFallback();
    res.json(result || { ok: true, action: 'trauma_start' });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.post('/api/trauma/pyqt5/capture', async (_req, res) => {
  try {
    const result = await sensorRequest('/trauma/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      timeoutMs: 5000,
    });
    res.json(result || { ok: true, action: 'trauma_capture' });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.post('/api/trauma/pyqt5/reset', async (_req, res) => {
  try {
    const result = await sensorRequest('/trauma/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      timeoutMs: 5000,
    });
    res.json(result || { ok: true, action: 'trauma_reset' });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.get('/api/trauma/pyqt5/frame.jpg', async (_req, res) => {
  try {
    let lastResponse = null;
    let lastBody = null;

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      try {
        const response = await fetch(`${SENSOR_SERVER_BASE}/trauma/frame.jpg`, {
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-store' },
        });
        const body = Buffer.from(await response.arrayBuffer());
        lastResponse = response;
        lastBody = body;

        if (response.ok) {
          res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
          return res.send(body);
        }

        if (response.status !== 503 || attempt === 5) {
          break;
        }
      } finally {
        clearTimeout(timeout);
      }

      await new Promise((resolve) => setTimeout(resolve, 140));
    }

    const text = lastBody ? lastBody.toString('utf8') : JSON.stringify({ ok: false });
    return res.status(lastResponse?.status || 503).type('application/json').send(text || JSON.stringify({ ok: false }));
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.get('/api/trauma/pyqt5/stream.mjpg', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Pragma: 'no-cache',
    Connection: 'close',
    'Access-Control-Allow-Origin': '*',
  });

  let closed = false;
  req.on('close', () => {
    closed = true;
  });

  while (!closed) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch(`${SENSOR_SERVER_BASE}/trauma/frame.jpg`, {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-store' },
      });

      if (response.ok) {
        const body = Buffer.from(await response.arrayBuffer());
        if (!closed && !res.destroyed) {
          res.write('--frame\r\n');
          res.write('Content-Type: image/jpeg\r\n');
          res.write(`Content-Length: ${body.length}\r\n\r\n`);
          res.write(body);
          res.write('\r\n');
        }
      }
    } catch {
      // 스트림은 일시적인 프레임 실패를 끊지 않고 다음 프레임을 기다린다.
    } finally {
      clearTimeout(timeout);
    }

      await new Promise((resolve) => setTimeout(resolve, 250));
  }

  if (!res.writableEnded) {
    res.end();
  }
});

app.get('/api/trauma/pyqt5/result', async (_req, res) => {
  try {
    const result = await sensorRequest('/trauma/result', { timeoutMs: 5000 });
    res.json(result || { ok: false, reason: 'empty_trauma_result' });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.post('/api/trauma/pyqt5/stop', async (_req, res) => {
  try {
    const result = await sensorRequest('/trauma/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      timeoutMs: 5000,
    });
    res.json(result || { ok: true, action: 'trauma_stop' });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.post('/api/trauma/pyqt5/guide', async (req, res) => {
  try {
    const result = await sensorRequest('/trauma/guide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
      timeoutMs: 5000,
    });
    res.json(result || { ok: true, action: 'trauma_guide' });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

// ── 로컬 활동 로그 저장 (라즈베리파이 MariaDB 전용) ──
app.post('/api/activity-log', async (req, res) => {
  const {
    event_type,
    serial_number,
    device_number,
    ship_number,
    crew_id,
    question_text,
    answer_summary,
    action_detail,
    vital_snapshot,
  } = req.body || {};

  if (!event_type) {
    return res.status(400).json({ error: 'event_type is required' });
  }

  const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;

  try {
    const [result] = await localSensorPool.query(
      `INSERT INTO tb_activity_log
        (event_type, serial_number, device_number, ship_number, crew_id, question_text,
         answer_summary, action_detail, vital_snapshot, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event_type,
        serial_number || null,
        device_number || null,
        ship_number || null,
        crew_id || null,
        question_text || null,
        answer_summary || null,
        action_detail || null,
        vital_snapshot ? JSON.stringify(vital_snapshot) : null,
        ipAddress,
        userAgent,
      ]
    );
    res.json({ activity_id: result.insertId });
  } catch (error) {
    console.error('[activity-log] local insert failed:', error.message);
    res.status(503).json({ error: 'Failed to write local activity log' });
  }
});

const parseHistoryList = (value) => {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const mapPatientHistoryRow = (row) => ({
  id: row.id || row.history_id,
  patientId: row.patient_id || (row.crew_id ? `S26-${String(row.crew_id).padStart(3, '0')}` : null),
  patientName: row.name || '',
  crewId: row.crew_id || null,
  doctorId: row.doctor_id || null,
  doctorName: row.doctor_name || '',
  timestamp: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  occurrenceTime: row.occurrence_time || '',
  lastMealTime: row.last_meal_time || '기록 없음',
  mainComplaint: row.main_complaint || '',
  location: row.location || '',
  painAreas: parseHistoryList(row.pain_areas),
  selectedSymptoms: parseHistoryList(row.selected_symptoms),
  detailedNote: row.notes || '',
  prescribedMeds: parseHistoryList(row.prescribed_meds),
  otherActions: row.other_actions || '',
  diagnosis: row.diagnosis || '',
  treatmentGuide: parseHistoryList(row.treatment_guide),
  recommendedMeds: parseHistoryList(row.recommended_meds),
  vitals: {
    bp: row.blood_pressure || '-',
    hr: row.heart_rate ?? '-',
    spo2: row.spo2 ?? '-',
    rr: row.respiration_rate ?? '-',
    temp: row.temperature ?? '-',
  },
  isEmergency: Boolean(row.is_emergency),
});

// ── 환자 차트 기록 조회 (라즈베리파이 MariaDB 전용) ──
app.get('/api/patient-history/:crewId', async (req, res) => {
  const crewId = Number(req.params.crewId);
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

  if (!Number.isFinite(crewId) || crewId <= 0) {
    return res.status(400).json({ error: 'valid crewId is required' });
  }

  try {
    const [rows] = await localSensorPool.query(
      'SELECT * FROM tb_patient_history WHERE crew_id = ? ORDER BY created_at DESC LIMIT ?',
      [Math.trunc(crewId), limit]
    );

    res.json(rows.map(mapPatientHistoryRow));
  } catch (error) {
    console.error('[patient-history] local select failed:', error.message);
    res.status(503).json({ error: 'Failed to read patient history' });
  }
});

// ── 바이탈 이력 조회 ──
app.get('/api/vital/history/:crewId', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const [rows] = await pool.query(
    'SELECT * FROM tb_vital WHERE crew_id = ? ORDER BY measured_at DESC LIMIT ?',
    [req.params.crewId, limit]
  );
  res.json(rows);
});

// ── 바이탈 데이터 저장 (단건) ──
app.post('/api/vital', async (req, res) => {
  const { crew_id, heart_rate, spo2, respiration_rate, blood_pressure, temperature } = req.body;
  const [result] = await pool.query(
    `INSERT INTO tb_vital (crew_id, heart_rate, spo2, respiration_rate, blood_pressure, temperature)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [crew_id, heart_rate || 0, spo2 || 0, respiration_rate || 0, blood_pressure || '0', temperature || 0]
  );
  res.json({ vital_id: result.insertId });
});

// ── 환자 차트 기록 저장 (라즈베리파이 MariaDB 전용) ──
app.post('/api/patient-history', async (req, res) => {
  const record = normalizePatientHistoryPayload(req.body || {});

  if (!record.name) {
    return res.status(400).json({ error: 'patientName is required' });
  }

  try {
    await ensurePatientHistoryTable();

    try {
      const [result] = await localSensorPool.query(
        `INSERT INTO tb_patient_history
          (crew_id, patient_id, name, doctor_id, doctor_name, occurrence_time, last_meal_time,
           main_complaint, location, pain_areas, selected_symptoms, prescribed_meds, other_actions,
           diagnosis, treatment_guide, recommended_meds, blood_pressure, heart_rate, spo2,
           respiration_rate, temperature, notes, is_emergency)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.crew_id,
          record.patient_id,
          record.name,
          record.doctor_id,
          record.doctor_name,
          record.occurrence_time,
          record.last_meal_time,
          record.main_complaint,
          record.location,
          record.pain_areas,
          record.selected_symptoms,
          record.prescribed_meds,
          record.other_actions,
          record.diagnosis,
          record.treatment_guide,
          record.recommended_meds,
          record.blood_pressure,
          record.heart_rate,
          record.spo2,
          record.respiration_rate,
          record.temperature,
          record.notes,
          record.is_emergency,
        ]
      );

      return res.json({ history_id: result.insertId, mode: 'full' });
    } catch (insertError) {
      if (insertError.code !== 'ER_BAD_FIELD_ERROR' && insertError.errno !== 1054) {
        throw insertError;
      }

      const [fallbackResult] = await localSensorPool.query(
        `INSERT INTO tb_patient_history
          (name, diagnosis, blood_pressure, heart_rate, respiration_rate, temperature, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          record.name,
          record.diagnosis,
          record.blood_pressure,
          record.heart_rate,
          record.respiration_rate,
          record.temperature,
          record.notes,
        ]
      );

      return res.json({ history_id: fallbackResult.insertId, mode: 'minimal' });
    }
  } catch (error) {
    console.error('[patient-history] local insert failed:', error.message);
    res.status(503).json({ error: 'Failed to write patient history' });
  }
});

// ── 바이탈 데이터 일괄 저장 (라즈베리파이 동기화용) ──
app.post('/api/vital/bulk', async (req, res) => {
  const records = req.body;
  if (!Array.isArray(records) || !records.length) {
    return res.status(400).json({ error: 'Array of records required' });
  }
  const values = records.map(r => [
    r.crew_id, r.heart_rate || 0, r.spo2 || 0,
    r.respiration_rate || 0, r.blood_pressure || '0', r.temperature || 0,
    r.measured_at || null
  ]);
  const [result] = await pool.query(
    `INSERT INTO tb_vital (crew_id, heart_rate, spo2, respiration_rate, blood_pressure, temperature, measured_at)
     VALUES ?`,
    [values]
  );
  res.json({ inserted: result.affectedRows });
});

// ── 분석 결과 조회 ──
app.get('/api/analysis/:crewId', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM tb_analysis WHERE crew_id = ? ORDER BY analyzed_at DESC LIMIT 10',
    [req.params.crewId]
  );
  res.json(rows);
});

// ── 분석 결과 저장 ──
app.post('/api/analysis', async (req, res) => {
  const { vital_id, crew_id, analysis_result, diagnosis, file_name, file_size, file_ext, risk_level } = req.body;
  const [result] = await pool.query(
    `INSERT INTO tb_analysis (vital_id, crew_id, analysis_result, diagnosis, file_name, file_size, file_ext, risk_level)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [vital_id, crew_id, analysis_result, diagnosis, file_name, file_size, file_ext, risk_level]
  );
  res.json({ analysis_id: result.insertId });
});

// ── 응급처치 기록 조회 ──
app.get('/api/firstaid/:crewId', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM tb_firstaid WHERE crew_id = ? ORDER BY created_at DESC',
    [req.params.crewId]
  );
  res.json(rows);
});

// ── 응급처치 기록 저장 ──
app.post('/api/firstaid', async (req, res) => {
  const { analysis_id, crew_id, guide_text, action_taken } = req.body;
  const [result] = await pool.query(
    `INSERT INTO tb_firstaid (analysis_id, crew_id, guide_text, action_taken) VALUES (?, ?, ?, ?)`,
    [analysis_id, crew_id, guide_text, action_taken]
  );
  res.json({ firstaid_id: result.insertId });
});

// ── 서버 시작 ──
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`MDTS API server running on http://localhost:${PORT}`);
});

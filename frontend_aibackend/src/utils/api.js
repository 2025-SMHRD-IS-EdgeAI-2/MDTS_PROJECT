import { resolveAvatarUrl } from './avatar'

const getEnvValue = (key) => {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key]
  }
  return undefined
}

const getBaseHost = () => {
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    return window.location.hostname
  }
  return "localhost"
}

const normalizeBase = (base) => base.replace(/\/+$/, "")

const HOST = getBaseHost()
const API_BASE = normalizeBase(getEnvValue("VITE_LEGACY_API_BASE") || `http://${HOST}:4000/api`)
const AI_API_BASE = normalizeBase(getEnvValue("VITE_AI_API_BASE") || `http://${HOST}:8000`)
const SENSOR_API_BASE = normalizeBase(getEnvValue("VITE_SENSOR_API_BASE") || `http://YOUR_RPI_HOST:5000`)

async function requestJson(url, options = {}) {
  const response = await fetch(url, options)
  const text = await response.text()

  if (!response.ok) {
    throw new Error(`API ERROR [${response.status}] ${url}: ${text || response.statusText}`)
  }

  if (!text) return null

  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`Invalid JSON from ${url}: ${error.message}`)
  }
}

function toIntValue(value) {
  if (value === null || value === undefined) return 0
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n) : 0
}

function toFloatValue(value) {
  if (value === null || value === undefined) return 0
  const n = Number(value)
  return Number.isFinite(n) ? Number(n.toFixed(1)) : 0
}

function isNonZero(value) {
  const n = Number(value)
  return Number.isFinite(n) && n !== 0
}

function safeDisplayInt(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n === 0) return "-"
  return Math.round(n).toString()
}

function safeDisplayFloat(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n === 0) return "-"
  return n.toFixed(1)
}

function rawDisplayInt(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return "-"
  return Math.round(n).toString()
}

function rawDisplayFloat(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return "-"
  return n.toFixed(1)
}

function isValidBloodPressure(value) {
  if (!value) return false
  const asString = String(value).trim()
  if (!asString || asString === "-" || asString === "0" || asString === "0/0" || asString.startsWith("--")) {
    return false
  }
  return true
}

export function getCrewNumericId(target) {
  if (!target) return null
  if (typeof target === "number" && Number.isFinite(target)) return Math.trunc(target)

  const explicitCrewId = typeof target === "object" && target.crewDbId ? target.crewDbId : null
  const parsedFromExplicit = Number(explicitCrewId)
  if (Number.isFinite(parsedFromExplicit) && parsedFromExplicit > 0) return Math.trunc(parsedFromExplicit)

  const sourceId = typeof target === "object" ? target.id : target
  const match = typeof sourceId === "string" ? sourceId.split("-").pop() : ""
  const parsed = Number(match)
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null
}

function normalizeAiVitalToLegacy(aiVital) {
  return {
    heart_rate: toIntValue(aiVital?.hr),
    spo2: toIntValue(aiVital?.spo2),
    blood_pressure: isValidBloodPressure(aiVital?.bp) ? String(aiVital.bp) : "0",
    respiration_rate: toIntValue(aiVital?.rr),
    temperature: toFloatValue(aiVital?.temp),
    measured_at: aiVital?.measured_at || null,
  }
}

function hasMeaningfulVital(vital) {
  if (!vital) return false
  return Boolean(
    isNonZero(vital.heart_rate) ||
    isNonZero(vital.spo2) ||
    isNonZero(vital.respiration_rate) ||
    isNonZero(vital.temperature) ||
    isValidBloodPressure(vital.blood_pressure)
  )
}

export async function fetchCrew() {
  return requestJson(`${API_BASE}/crew`)
}

export async function fetchCrewById(crewId) {
  return requestJson(`${API_BASE}/crew/${crewId}`)
}

export async function fetchLatestVitalFromLive(crewId = null) {
  const resolvedCrewId = getCrewNumericId(crewId)
  const query = resolvedCrewId ? `?crew_id=${encodeURIComponent(resolvedCrewId)}` : ""
  const data = await requestJson(`${AI_API_BASE}/vitals/live${query}`)
  if (!data || data.status !== "success") return null
  return normalizeAiVitalToLegacy(data)
}

export async function fetchLatestVitals() {
  return requestJson(`${API_BASE}/vital/latest`)
}

export async function fetchPyqtSensorVital(crewId = null) {
  const normalizedCrewId = getCrewNumericId(crewId)
  const data = await requestJson(`${API_BASE}/sensor/live`)
  if (!data || data.status !== "success") return null

  const activeCrewId = getCrewNumericId(data.crew_id || data.active_crew_id)
  if (normalizedCrewId && activeCrewId !== normalizedCrewId) return null

  const vital = {
    vital_id: `sensor-${data.measured_at || Date.now()}`,
    crew_id: activeCrewId,
    heart_rate: toIntValue(data.heart_rate),
    spo2: toIntValue(data.spo2),
    respiration_rate: toIntValue(data.respiration_rate),
    blood_pressure: isValidBloodPressure(data.blood_pressure) ? String(data.blood_pressure) : "0",
    temperature: toFloatValue(data.temperature),
    measured_at: data.measured_at || new Date().toISOString(),
    source: "pyqt5_sensor",
    recording_enabled: Boolean(data.recording_enabled),
  }

  return vital
}

export async function fetchLatestVital(crewId) {
  const normalizedCrewId = getCrewNumericId(crewId)

  try {
    const liveSensor = await fetchPyqtSensorVital(normalizedCrewId)
    if (liveSensor) return liveSensor
  } catch (error) {
    console.warn("[mdts-api] pyqt sensor live fetch failed, fallback to db:", error.message)
  }

  if (normalizedCrewId) {
    try {
      const legacy = await requestJson(`${API_BASE}/vital/latest/${normalizedCrewId}`)
      if (legacy) return legacy
    } catch (error) {
      console.warn("[mdts-api] legacy latest vital fetch failed, fallback to live:", error.message)
    }
  }

  return fetchLatestVitalFromLive(normalizedCrewId)
}

export async function fetchVitalHistory(crewId, limit = 50) {
  const normalizedCrewId = getCrewNumericId(crewId)
  return requestJson(`${API_BASE}/vital/history/${normalizedCrewId}?limit=${limit}`)
}

export async function fetchAnalysis(crewId) {
  const normalizedCrewId = getCrewNumericId(crewId)
  return requestJson(`${API_BASE}/analysis/${normalizedCrewId}`)
}

export async function savePatientHistory(record) {
  const normalizedCrewId = getCrewNumericId(record?.crewId || record?.crew_id || record?.patientId || record?.patient_id)
  return requestJson(`${API_BASE}/patient-history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...record, crew_id: normalizedCrewId }),
  })
}

export async function fetchPatientHistory(crewId, limit = 50) {
  const normalizedCrewId = getCrewNumericId(crewId)
  if (!normalizedCrewId) return []
  return requestJson(`${API_BASE}/patient-history/${normalizedCrewId}?limit=${encodeURIComponent(limit)}`)
}

export async function startPyqtTraumaCapture() {
  return requestJson(`${API_BASE}/trauma/pyqt5/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })
}

export async function triggerPyqtTraumaAnalysis() {
  return requestJson(`${API_BASE}/trauma/pyqt5/capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })
}

export async function resetPyqtTraumaCapture() {
  return requestJson(`${API_BASE}/trauma/pyqt5/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })
}

export async function fetchPyqtTraumaResult() {
  return requestJson(`${API_BASE}/trauma/pyqt5/result`)
}

export async function openPyqtTraumaGuide(result = {}) {
  return requestJson(`${API_BASE}/trauma/pyqt5/guide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result || {}),
  })
}

export async function stopPyqtTraumaStream() {
  return requestJson(`${API_BASE}/trauma/pyqt5/stop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })
}

export function getPyqtTraumaFrameUrl(cacheKey = Date.now()) {
  return `${API_BASE}/trauma/pyqt5/frame.jpg?t=${encodeURIComponent(cacheKey)}`
}

export function getPyqtTraumaStreamUrl(cacheKey = Date.now()) {
  return `${API_BASE}/trauma/pyqt5/stream.mjpg?session=${encodeURIComponent(cacheKey)}`
}

function getDefaultCrewPhotoName(crewId) {
  const numericCrewId = Number(crewId)
  if (!Number.isFinite(numericCrewId) || numericCrewId <= 0) return ""

  const paddedId = String(Math.trunc(numericCrewId)).padStart(3, "0")
  return paddedId === "003" ? "003.jpeg" : `${paddedId}.png`
}

function resolveCrewAvatar(dbCrew) {
  const explicitPhotoPath = typeof dbCrew?.photo_path === "string" ? dbCrew.photo_path.trim() : ""
  if (explicitPhotoPath) return resolveAvatarUrl(explicitPhotoPath)

  const fallbackPhotoName = getDefaultCrewPhotoName(dbCrew?.crew_id)
  return fallbackPhotoName ? resolveAvatarUrl(fallbackPhotoName) : null
}

export function mapCrewToFrontend(dbCrew) {
  if (!dbCrew) return null

  const birthDate = dbCrew.birthdate ? new Date(dbCrew.birthdate) : null
  const today = new Date()
  const age = birthDate && Number.isFinite(birthDate.getTime())
    ? today.getFullYear() - birthDate.getFullYear()
    : null

  return {
    id: `S26-${String(dbCrew.crew_id).padStart(3, "0")}`,
    crewDbId: dbCrew.crew_id,
    name: dbCrew.name,
    age,
    role: dbCrew.position,
    dept: dbCrew.department,
    blood: dbCrew.bloodtype,
    chronic: dbCrew.underlying_disease || "없음",
    allergies: dbCrew.allergy || "없음",
    contact: dbCrew.phone || "",
    emergencyName: dbCrew.guardian_name || "",
    emergency: dbCrew.emergency_contact || "",
    avatar: resolveCrewAvatar(dbCrew),
    isEmergency: false,
    height: dbCrew.height ? Number(dbCrew.height) : null,
    weight: dbCrew.weight ? Number(dbCrew.weight) : null,
    boardingDate: dbCrew.joined_at ? new Date(dbCrew.joined_at).toISOString().split("T")[0] : "",
    location: "",
    pastHistory: dbCrew.medical_history || "",
    dob: birthDate && Number.isFinite(birthDate.getTime()) ? birthDate.toISOString().split("T")[0] : "",
    gender: dbCrew.gender === "M" ? "남" : "여",
    lastMed: dbCrew.recent_medication || "",
    note: "",
  }
}

export function mapVitalToFrontend(dbVital) {
  if (!dbVital) return { hr: "-", spo2: "-", temp: "-", bp: "-", rr: "-" }

  if (dbVital.source === "pyqt5_sensor") {
    return {
      hr: rawDisplayInt(dbVital.heart_rate),
      spo2: rawDisplayInt(dbVital.spo2),
      temp: rawDisplayFloat(dbVital.temperature),
      bp: isValidBloodPressure(dbVital.blood_pressure) ? String(dbVital.blood_pressure) : "-",
      rr: rawDisplayInt(dbVital.respiration_rate),
    }
  }

  const isLivePayload = "hr" in dbVital || "spo2" in dbVital || "bp" in dbVital || "rr" in dbVital || "temp" in dbVital
  if (isLivePayload) {
    return {
      hr: safeDisplayInt(dbVital.hr),
      spo2: safeDisplayInt(dbVital.spo2),
      temp: safeDisplayFloat(dbVital.temp),
      bp: isValidBloodPressure(dbVital.bp) ? String(dbVital.bp) : "-",
      rr: safeDisplayInt(dbVital.rr),
    }
  }

  return {
    hr: safeDisplayInt(dbVital.heart_rate),
    spo2: safeDisplayInt(dbVital.spo2),
    temp: safeDisplayFloat(dbVital.temperature),
    bp: isValidBloodPressure(dbVital.blood_pressure) ? String(dbVital.blood_pressure) : "-",
    rr: safeDisplayInt(dbVital.respiration_rate),
  }
}

export async function analyzeChat({ query, patientData, vitals }) {
  const formData = new FormData()
  formData.append("query", query)
  formData.append("patient_data", JSON.stringify(patientData || {}))
  formData.append("vitals", JSON.stringify(vitals || {}))

  return requestJson(`${AI_API_BASE}/analyze/chat`, {
    method: "POST",
    body: formData,
  })
}

export async function fetchOllamaHealth() {
  return requestJson(`${API_BASE}/ai/ollama-health`, {
    method: "GET",
    headers: { "Cache-Control": "no-store" },
  })
}

export async function toggleOllama(action = "") {
  return requestJson(`${API_BASE}/ai/ollama-toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action ? { action } : {}),
  })
}

export async function logActivity(payload) {
  return requestJson(`${API_BASE}/activity-log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  })
}

export async function fetchSensorCrew() {
  return requestJson(`${API_BASE}/sensor/crew`)
}

export async function fetchFocusedCrewState() {
  return requestJson(`${API_BASE}/sensor/crew/focus`)
}

export async function syncFocusedCrewState(crewIds = [], source = "web") {
  const normalizedCrewIds = Array.from(new Set(
    crewIds
      .map((crewId) => getCrewNumericId(crewId))
      .filter((crewId) => Number.isFinite(crewId) && crewId > 0)
  ))

  return requestJson(`${API_BASE}/sensor/crew/focus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ crew_ids: normalizedCrewIds, source }),
  })
}

export async function setFocusedCrew(crewId, focused = true, source = "web") {
  const normalizedCrewId = getCrewNumericId(crewId)
  if (!normalizedCrewId) return { ok: false, reason: "Invalid crewId" }

  return requestJson(`${API_BASE}/sensor/crew/focus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ crew_id: normalizedCrewId, focused: Boolean(focused), source }),
  })
}

export async function setMonitorCrew(crewId, sensorBase = null) {
  const normalizedCrewId = getCrewNumericId(crewId)
  if (!normalizedCrewId) return { ok: false, reason: "Invalid crewId" }

  try {
    const url = sensorBase ? `${normalizeBase(sensorBase)}/crew` : `${API_BASE}/sensor/crew`
    return await requestJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crew_id: normalizedCrewId }),
    })
  } catch (error) {
    console.warn("[mdts-api] sensor /crew update failed:", error.message)
    return { ok: false, reason: error.message }
  }
}

export async function updateVital(crewId, vitalData) {
  const normalizedCrewId = getCrewNumericId(crewId)
  return requestJson(`${API_BASE}/vital`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ crew_id: normalizedCrewId, ...vitalData }),
  })
}


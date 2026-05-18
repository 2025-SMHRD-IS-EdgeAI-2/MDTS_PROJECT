import { useState, useEffect, useRef } from 'react'
import DashboardView from './Main/components/DashboardView'
import MainTutorial from './Main/components/MainTutorial'
import { fetchLatestVital, fetchPatientHistory, mapVitalToFrontend, analyzeChat, fetchOllamaHealth, toggleOllama, getCrewNumericId, startPyqtTraumaCapture, triggerPyqtTraumaAnalysis, resetPyqtTraumaCapture, fetchPyqtTraumaResult, openPyqtTraumaGuide, stopPyqtTraumaStream } from '../utils/api'

const VITAL_CHANGE_LIMITS = {
  hr: 20,
  spo2: 4,
  rr: 6,
  temp: 0.8,
  systolic: 20,
  diastolic: 15,
}

const AI_OFFLINE_MESSAGE = 'AI가 동작하고 있지 않습니다.\nJetson Nano의 Ollama를 실행한 뒤 다시 질문하세요.'

function formatTimelineTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function parseVitalNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function parseBloodPressure(value) {
  const parts = String(value || '').replace(/\s/g, '').split('/')
  if (parts.length !== 2) return { systolic: 0, diastolic: 0 }
  return {
    systolic: parseInt(parts[0], 10) || 0,
    diastolic: parseInt(parts[1], 10) || 0,
  }
}

function normalizeDbVital(raw) {
  if (!raw) return null
  const bloodPressure = raw.blood_pressure || raw.bp || '-'
  const { systolic, diastolic } = parseBloodPressure(bloodPressure)
  const snapshot = {
    hr: parseVitalNumber(raw.heart_rate ?? raw.hr),
    spo2: parseVitalNumber(raw.spo2),
    rr: parseVitalNumber(raw.respiration_rate ?? raw.rr),
    bp: bloodPressure,
    systolic,
    diastolic,
    temp: parseVitalNumber(raw.temperature ?? raw.temp),
    measuredAt: raw.measured_at || null,
    vitalId: raw.vital_id || null,
  }

  const hasAnyValue = snapshot.hr || snapshot.spo2 || snapshot.rr || snapshot.systolic || snapshot.diastolic || snapshot.temp
  return hasAnyValue ? snapshot : null
}

function formatVitalSnapshot(snapshot) {
  return `HR ${snapshot.hr || '-'} bpm · SpO2 ${snapshot.spo2 || '-'}% · RR ${snapshot.rr || '-'} · BP ${snapshot.bp || '-'} · BT ${snapshot.temp || '-'}°C`
}

function buildVitalChangeDetails(prev, next) {
  if (!prev || !next) return []
  const details = []

  const pushNumericChange = (key, label, unit, limit) => {
    const before = parseVitalNumber(prev[key])
    const after = parseVitalNumber(next[key])
    if (!before || !after) return
    const diff = after - before
    if (Math.abs(diff) >= limit) {
      const sign = diff > 0 ? '+' : ''
      details.push(`${label}: ${before} -> ${after} (${sign}${Number(diff.toFixed(1))}${unit})`)
    }
  }

  pushNumericChange('hr', '심박수', ' bpm', VITAL_CHANGE_LIMITS.hr)
  pushNumericChange('spo2', '산소포화도', '%', VITAL_CHANGE_LIMITS.spo2)
  pushNumericChange('rr', '호흡수', '회/분', VITAL_CHANGE_LIMITS.rr)
  pushNumericChange('temp', '체온', '°C', VITAL_CHANGE_LIMITS.temp)
  pushNumericChange('systolic', '수축기혈압', ' mmHg', VITAL_CHANGE_LIMITS.systolic)
  pushNumericChange('diastolic', '이완기혈압', ' mmHg', VITAL_CHANGE_LIMITS.diastolic)

  return details
}

function makeTimelineEvent(title, detail, color = '#38bdf8', timeValue = new Date()) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    time: formatTimelineTime(timeValue),
    title,
    color,
    detail,
  }
}

function buildPatientChartTimelineEvent(record) {
  if (!record?.timestamp) return null

  const symptomList = Array.isArray(record.selectedSymptoms) && record.selectedSymptoms.length
    ? record.selectedSymptoms.join(', ')
    : '미기록'
  const painAreaList = Array.isArray(record.painAreas) && record.painAreas.length
    ? record.painAreas.join(', ')
    : '미기록'
  const locationText = String(record.location || '').trim() || '미기록'
  const detailedText = String(record.detailedNote || '').trim() || '미기록'
  const lastMealText = record.lastMealTime && record.lastMealTime !== '기록 없음'
    ? record.lastMealTime
    : '미기록'

  return makeTimelineEvent(
    '환자 차트 상태 기록 저장',
    [
      `• 대상자: ${record.patientName || '-'}`,
      `• 사고/증상 시각: ${record.occurrenceTime || '미기록'}`,
      `• 사고 장소: ${locationText}`,
      `• 최종 취식 시각: ${lastMealText}`,
      `• 상세 증상: ${detailedText}`,
      `• 통증 부위: ${painAreaList}`,
      `• 관찰 증상: ${symptomList}`,
    ].join('\n'),
    record.isEmergency ? '#f43f5e' : '#38bdf8',
    record.timestamp
  )
}

function buildPatientChartAssistantMessage(record) {
  if (!record?.timestamp) return null

  const symptomList = Array.isArray(record.selectedSymptoms) && record.selectedSymptoms.length
    ? record.selectedSymptoms.join(', ')
    : '미기록'
  const painAreaList = Array.isArray(record.painAreas) && record.painAreas.length
    ? record.painAreas.join(', ')
    : '미기록'
  const locationText = String(record.location || '').trim() || '미기록'
  const detailedText = String(record.detailedNote || '').trim() || '미기록'
  const lastMealText = record.lastMealTime && record.lastMealTime !== '기록 없음'
    ? record.lastMealTime
    : '미기록'

  return {
    role: 'ai',
    text: [
      '환자 차트 상태 기록이 저장되었습니다.',
      '',
      `대상자: ${record.patientName || '-'}`,
      `사고/증상 시각: ${record.occurrenceTime || '미기록'}`,
      `사고 장소: ${locationText}`,
      `최종 취식 시각: ${lastMealText}`,
      `상세 증상: ${detailedText}`,
      `통증 부위: ${painAreaList}`,
      `관찰 증상: ${symptomList}`,
    ].join('\n')
  }
}

function getTimelineActor(auth) {
  if (!auth) return '미확인 사용자'
  const device = auth.device || auth.deviceNo || ''
  const serial = auth.serial || auth.serialNo || ''
  const ship = auth.ship || auth.shipNo || ''
  const parts = [ship, device, serial].filter(Boolean)
  return parts.length ? parts.join(' / ') : '미확인 사용자'
}

function extractImportantAiReply(reply) {
  if (!reply) return '중요 답변 내용 없음'

  const blockedPatterns = [
    /\[결론\]/,
    /\[상태\]/,
    /\[현재 바이탈\]/,
    /\[과거 이력\]/,
    /\[RAG 근거\]/,
    /대상자/,
    /심박수/,
    /산소포화도/,
    /호흡수/,
    /혈압/,
    /체온/,
    /HR\s/i,
    /SpO2/i,
    /BP\s/i,
    /BT\s/i,
  ]

  const lines = String(reply)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !blockedPatterns.some(pattern => pattern.test(line)))

  const importantLines = lines
    .map(line => line.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 4)

  if (!importantLines.length) return '중요 답변 내용 없음'
  return importantLines.map(line => `• ${line}`).join('\n')
}

export default function Main({ patient, crewList = [], auth, onNavigate, onSwitchPatient, historicalRecord, tutorialShown, setTutorialShown }) {
  // ─── 튜토리얼 상태 ───
  const [showTutorial, setShowTutorial] = useState(false)
  const [traumaNudgeActive, setTraumaNudgeActive] = useState(false)

  useEffect(() => {
    if (!tutorialShown) {
      const t = setTimeout(() => setShowTutorial(true), 600)
      return () => clearTimeout(t)
    }
  }, [tutorialShown])

  useEffect(() => {
    if (!historicalRecord?.timestamp) return
    setTraumaNudgeActive(true)
    const timer = setTimeout(() => setTraumaNudgeActive(false), 12000)
    return () => clearTimeout(timer)
  }, [historicalRecord?.timestamp])

  const finishTutorial = () => {
    setTutorialShown(true)
    setShowTutorial(false)
  }

  // ─── 바이탈 데이터 상태 ───
  const [hr, setHr] = useState('-')
  const [spo2, setSpo2] = useState('-')
  const [rr, setRr] = useState('-')
  const [bp, setBp] = useState('-')
  const [bt, setBt] = useState('-')

  // ─── AI 어시스턴트 상태 ───
  const [prompt, setPrompt] = useState('')
  const [chat, setChat] = useState([])
  const [timelineEvents, setTimelineEvents] = useState([])
  const [aiConnectionState, setAiConnectionState] = useState({ connected: false, status: 'checking' })
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [isAiToggling, setIsAiToggling] = useState(false)
  const lastDbVitalRef = useRef(null)
  const lastDbVitalSignatureRef = useRef('')
  const aiConnectedRef = useRef(false)

  const checkAiConnection = async () => {
    try {
      const health = await fetchOllamaHealth()
      const connected = Boolean(health?.connected)
      aiConnectedRef.current = connected
      setAiConnectionState({
        connected,
        status: connected ? 'online' : 'offline',
        checkedAt: health?.checked_at || new Date().toISOString(),
      })
      return connected
    } catch {
      aiConnectedRef.current = false
      setAiConnectionState({
        connected: false,
        status: 'offline',
        checkedAt: new Date().toISOString(),
      })
      return false
    }
  }

  useEffect(() => {
    let cancelled = false

    const pollAiConnection = async () => {
      try {
        const health = await fetchOllamaHealth()
        if (cancelled) return
        const connected = Boolean(health?.connected)
        aiConnectedRef.current = connected
        setAiConnectionState({
          connected,
          status: connected ? 'online' : 'offline',
          checkedAt: health?.checked_at || new Date().toISOString(),
        })
      } catch {
        if (cancelled) return
        aiConnectedRef.current = false
        setAiConnectionState({
          connected: false,
          status: 'offline',
          checkedAt: new Date().toISOString(),
        })
      }
    }

    pollAiConnection()
    const timer = window.setInterval(pollAiConnection, 5000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const handleAiToggle = async () => {
    if (isAiToggling) return

    const requestedAction = aiConnectedRef.current ? 'stop' : 'start'
    setIsAiToggling(true)
    setAiConnectionState(prev => ({
      ...prev,
      status: requestedAction === 'start' ? 'starting' : 'stopping',
    }))

    try {
      const result = await toggleOllama(requestedAction)
      const connected = Boolean(result?.health?.connected)
      aiConnectedRef.current = connected
      setAiConnectionState({
        connected,
        status: connected ? 'online' : 'offline',
        checkedAt: result?.health?.checked_at || new Date().toISOString(),
      })
    } catch (error) {
      console.warn('[ai] ollama toggle failed:', error.message)
      await checkAiConnection()
    } finally {
      setIsAiToggling(false)
    }
  }

  const addTimelineEvent = (event) => {
    setTimelineEvents(prev => {
      const next = [event, ...prev]
      return next.slice(0, 80)
    })
  }

  const handleDbVitalTimeline = (rawVital) => {
    const snapshot = normalizeDbVital(rawVital)
    if (!snapshot) return

    const signature = `${snapshot.vitalId || ''}-${snapshot.measuredAt || ''}-${snapshot.hr}-${snapshot.spo2}-${snapshot.rr}-${snapshot.bp}-${snapshot.temp}`
    if (signature === lastDbVitalSignatureRef.current) return
    lastDbVitalSignatureRef.current = signature

    if (!lastDbVitalRef.current) {
      lastDbVitalRef.current = snapshot
      addTimelineEvent(makeTimelineEvent(
        rawVital?.source === 'pyqt5_sensor' ? 'PyQt5 실시간 바이탈 수신' : 'DB 바이탈 기록 시작',
        `• 최초 기록 시각: ${snapshot.measuredAt || '현재 수신 시각'}\n• ${formatVitalSnapshot(snapshot)}`,
        '#38bdf8',
        snapshot.measuredAt || new Date()
      ))
      return
    }

    const changes = buildVitalChangeDetails(lastDbVitalRef.current, snapshot)
    lastDbVitalRef.current = snapshot

    if (!changes.length) return

    addTimelineEvent(makeTimelineEvent(
      'DB 바이탈 큰폭 변화',
      changes.map(change => `• ${change}`).join('\n'),
      changes.length >= 2 ? '#f43f5e' : '#facc15',
      snapshot.measuredAt || new Date()
    ))
  }

  const toSafeAiNumber = (value) => {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }

  const buildAiVitals = (v) => ({
    hr: toSafeAiNumber(v.hr),
    spo2: toSafeAiNumber(v.spo2),
    rr: toSafeAiNumber(v.rr),
    bp: v.bp || '-',
    temp: toSafeAiNumber(v.temp),
  })

  const applyVitalsToState = (data) => {
    if (!data) return
    const v = mapVitalToFrontend(data)
    setHr(v.hr)
    setSpo2(v.spo2)
    setRr(v.rr)
    setBp(v.bp)
    setBt(v.temp)
  }

  const loadLatestVital = async (patientContext) => {
    const crewId = getCrewNumericId(patientContext)
    const latest = await fetchLatestVital(crewId)
    applyVitalsToState(latest)
    handleDbVitalTimeline(latest)
    return latest
  }

  // ─── 데이터 동기화 ───
  useEffect(() => {
    if (!patient) return

    const isDefaultPatient = patient.id === 'S26-003'
    setHr(isDefaultPatient ? String(patient.hr || 95) : '-')
    setSpo2(isDefaultPatient ? String(patient.spo2 || 97) : '-')
    setRr(isDefaultPatient ? String(patient.rr || 18) : '-')
    setBp(isDefaultPatient ? (patient.bp || '142/88') : '-')
    setBt(isDefaultPatient ? String(patient.temp || 37.2) : '-')

    const chartAssistantMessage = buildPatientChartAssistantMessage(historicalRecord)
    setChat(chartAssistantMessage ? [chartAssistantMessage, ...getInitialChat(patient)] : getInitialChat(patient))
    setPrompt('')
    let pendingMainTimelineEvent = null
    try {
      const rawPendingEvent = window.sessionStorage.getItem('mdts_pending_main_timeline_event')
      if (rawPendingEvent) {
        const parsedEvent = JSON.parse(rawPendingEvent)
        pendingMainTimelineEvent = {
          id: parsedEvent.id || `pending-main-${Date.now()}`,
          time: parsedEvent.time || formatTimelineTime(parsedEvent.timestamp || new Date()),
          title: parsedEvent.title || '응급처치 처리 결과',
          detail: parsedEvent.detail || '• 처리 결과 요약 없음',
          color: parsedEvent.color || '#22c55e',
        }
        window.sessionStorage.removeItem('mdts_pending_main_timeline_event')
      }
    } catch {
      window.sessionStorage.removeItem('mdts_pending_main_timeline_event')
    }

    const chartRecordEvent = pendingMainTimelineEvent ? null : buildPatientChartTimelineEvent(historicalRecord)
    const lookupEvent = makeTimelineEvent(
      '메인 선원 조회',
      `• 조회자: ${getTimelineActor(auth)}\n• 조회 선원: ${patient.name || '-'} (${patient.role || '-'})\n• 선원 ID: ${patient.id || '-'}`,
      '#38bdf8'
    )

    setTimelineEvents([pendingMainTimelineEvent, chartRecordEvent, lookupEvent].filter(Boolean))
    lastDbVitalRef.current = null
    lastDbVitalSignatureRef.current = ''

    loadLatestVital(patient).catch(() => {})
  }, [patient?.id, historicalRecord?.timestamp, auth?.ship, auth?.device, auth?.serial])

  // 실시간 바이탈 폴링
  useEffect(() => {
    if (!patient) return

    const poll = setInterval(() => {
      loadLatestVital(patient).catch(() => {})
    }, 2000)
    return () => clearInterval(poll);
  }, [patient?.id])

  // 렌더링 시점에 환자 정보 확장 (최근 기록 주입)
  const getActivePatientWithHistory = () => {
    if (!patient) return null
    try {
      const records = JSON.parse(localStorage.getItem('mdts_patient_records') || '[]')
      const latestRecord = records.find(r => r.patientId === patient.id)
      if (latestRecord) {
        return {
          ...patient,
          recentHistory: {
            date: new Date(latestRecord.timestamp).toLocaleDateString('ko-KR'),
            title: latestRecord.mainComplaint || '진료 기록',
            detail: `• 증상: ${(latestRecord.selectedSymptoms || []).join(', ') || '없음'}\n• 처치: ${(latestRecord.prescribedMeds || []).join(', ') || '없음'}\n• 특이: ${latestRecord.otherActions || '없음'}`
          }
        }
      }
    } catch (e) {}
    return patient
  }

  const activePatientWithHistory = getActivePatientWithHistory()

  // ─── 외상 분석 상태 ───
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanStatus, setScanStatus] = useState(null) // 'scanning' | 'success' | 'error' | 'refer'
  const [scanError, setScanError] = useState(null)
  const [scanResult, setScanResult] = useState(null) // { label: '절상', labelEn: 'Laceration', confidence: 98 }
  const [lowConfidencePopup, setLowConfidencePopup] = useState(false)
  const isScanningRef = useRef(false)
  const scanTimerRef = useRef(null)
  const lastPyqtScanEventRef = useRef(0)
  const lastPyqtTerminalEventRef = useRef(0)
  const pyqtSyncBusyRef = useRef(false)
  const ignoredPyqtTerminalEventRef = useRef(
    typeof window !== 'undefined'
      ? Number(window.sessionStorage.getItem('mdts_ignored_pyqt_trauma_event') || 0)
      : 0
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '2' && isScanningRef.current) {
        e.preventDefault()
        if (scanTimerRef.current) {
          clearInterval(scanTimerRef.current)
          scanTimerRef.current = null
        }
        isScanningRef.current = false
        setIsScanning(false)
        setScanStatus(null)
        setLowConfidencePopup(true)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])



  // ─── AI 분석 실행 ───
  const handlePromptAnalysis = async () => {
    if (!prompt.trim()) return
    const userMsg = { role: 'user', text: prompt }
    setChat(prev => [...prev, userMsg])
    const q = prompt
    setPrompt('')
    setIsAiThinking(true)
    addTimelineEvent(makeTimelineEvent(
      'AI 질문 요청',
      `• 질문: ${q}`,
      '#a78bfa'
    ))

    const aiAvailable = await checkAiConnection()
    if (!aiAvailable) {
      setChat(prev => [...prev, { role: 'ai', text: AI_OFFLINE_MESSAGE }])
      setIsAiThinking(false)
      addTimelineEvent(makeTimelineEvent(
        'AI 응답 불가',
        '• AI가 동작하고 있지 않아 질문을 처리하지 못했습니다.',
        '#f43f5e'
      ))
      return
    }

    const currentVitals = mapVitalToFrontend({
      heart_rate: toSafeAiNumber(hr),
      spo2: toSafeAiNumber(spo2),
      respiration_rate: toSafeAiNumber(rr),
      blood_pressure: bp,
      temperature: toSafeAiNumber(bt),
    })
    let latest = currentVitals

    try {
      const latestVitalRaw = await loadLatestVital(patient)
      if (latestVitalRaw) {
        latest = mapVitalToFrontend(latestVitalRaw)
      }
    } catch {}

    const patientForModel = {
      name: patient?.name,
      role: patient?.role,
      dept: patient?.dept,
      age: patient?.age,
      chronic: patient?.chronic,
      allergies: patient?.allergies,
      blood: patient?.blood,
      note: patient?.note,
      id: patient?.id,
      crew_id: getCrewNumericId(patient),
    }

    try {
      const result = await analyzeChat({
        query: q,
        patientData: patientForModel,
        vitals: buildAiVitals(latest),
      })
      const aiReply = result?.reply || 'AI 응답 생성 실패'
      setChat(prev => [...prev, { role: 'ai', text: aiReply }])
      setIsAiThinking(false)
      addTimelineEvent(makeTimelineEvent(
        'AI 답변 완료',
        extractImportantAiReply(aiReply),
        '#22c55e'
      ))
    } catch (error) {
      const reply = `${AI_OFFLINE_MESSAGE}\n\n오류: ${error.message}`
      setChat(prev => [...prev, { role: 'ai', text: reply }])
      setIsAiThinking(false)
      addTimelineEvent(makeTimelineEvent(
        'AI 응답 불가',
        `• AI 연동 오류: ${error.message}`,
        '#f43f5e'
      ))
    }
  }

  // ─── 응급 처치 액션 시작 ───
  const startEmergencyAction = (type) => {
    onNavigate && onNavigate('emergency', { type })
  }

  // ─── 외상 촬영 및 분석 ───
  const handleTraumaAnalysis = async () => {
    isScanningRef.current = true
    setIsScanning(true)
    setScanStatus('pyqt5_connecting')
    setScanProgress(15)
    setScanError(null)

    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current)
      scanTimerRef.current = null
    }

    try {
      const result = await startPyqtTraumaCapture()
      if (!result?.ok) {
        throw new Error(result?.reason || result?.error || 'Jetson PyQt5 외상 촬영 시작 실패')
      }
      setScanProgress(0)
      setScanStatus('camera_ready')
    } catch (error) {
      setScanProgress(0)
      setScanStatus('error')
      setScanError(`Jetson Nano PyQt5 외상 촬영 연결 실패: ${error.message}`)
    }
  }

  const normalizeTraumaConfidence = (value) => {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue) || numericValue <= 0) return 0
    const percentage = numericValue <= 1 ? numericValue * 100 : numericValue
    return Math.max(0, Math.min(100, Number(percentage.toFixed(1))))
  }

  const normalizeTraumaResult = (resultPayload) => {
    const result = resultPayload?.result || resultPayload
    if (!result) return null

    const labelMap = {
      abrasion: '찰과상',
      contusion: '타박상',
      burn: '화상',
      incision: '절상',
      laceration: '열상',
      puncture: '자창'
    }
    const labelEnMap = {
      abrasion: 'Abrasion',
      contusion: 'Contusion',
      burn: 'Burn',
      incision: 'Incision',
      laceration: 'Laceration',
      puncture: 'Puncture',
      '찰과상': 'Abrasion',
      '타박상': 'Contusion',
      '화상': 'Burn',
      '절상': 'Incision',
      '열상': 'Laceration',
      '자창': 'Puncture'
    }

    const rawDiagnosis =
      result.diagnosis ||
      result.diagnosis_name ||
      result.class_name ||
      result.predicted_class ||
      result.wound_type ||
      result.name ||
      result.label_ko ||
      result.label ||
      null
    const normalizedKey = String(result.key || result.class_key || result.predicted_key || '').trim().toLowerCase()
    const normalizedDiagnosisKey = String(rawDiagnosis || '').trim().toLowerCase()
    const label = labelMap[normalizedDiagnosisKey] || labelMap[normalizedKey] || rawDiagnosis || labelMap[result.key] || null
    if (!label) return null

    const confidence = normalizeTraumaConfidence(
      result.confidence ??
      result.confidence_percent ??
      result.accuracy ??
      result.probability ??
      result.score ??
      0
    )

    return {
      key: normalizedKey || result.key || null,
      label,
      diagnosis: label,
      labelEn: result.labelEn || result.label_en || result.diagnosis_en || labelEnMap[normalizedKey] || labelEnMap[result.key] || labelEnMap[label] || label,
      confidence,
      confidenceText: confidence ? `${confidence}%` : '확인 필요',
      desc: result.desc || result.description || '',
      actions: Array.isArray(result.actions) ? result.actions : [],
      raw: result,
      source: 'pyqt5'
    }
  }

  const waitForPyqtTraumaResult = async (timeoutMs = 9000) => {
    const startedAt = Date.now()
    let lastPayload = null

    while (Date.now() - startedAt < timeoutMs) {
      try {
        const payload = await fetchPyqtTraumaResult()
        lastPayload = payload

        const normalized = normalizeTraumaResult(payload)
        if (normalized) return normalized

        if (payload?.error?.mode === 'error' || payload?.error?.mode === 'no_wound') {
          throw new Error(payload.error.message || 'PyQt5 외상 분석 결과 없음')
        }
      } catch (error) {
        if (Date.now() - startedAt >= timeoutMs - 1200) {
          throw error
        }
      }

      await new Promise(resolve => setTimeout(resolve, 700))
    }

    throw new Error(lastPayload?.error?.message || 'PyQt5 외상 분석 결과 수신 시간 초과')
  }

  const getIgnoredPyqtTraumaEventId = () => {
    if (typeof window === 'undefined') return ignoredPyqtTerminalEventRef.current
    const storedEventId = Number(window.sessionStorage.getItem('mdts_ignored_pyqt_trauma_event') || 0)
    if (storedEventId > ignoredPyqtTerminalEventRef.current) {
      ignoredPyqtTerminalEventRef.current = storedEventId
    }
    return ignoredPyqtTerminalEventRef.current
  }

  const markPyqtTraumaEventHandled = (eventId = lastPyqtTerminalEventRef.current) => {
    const normalizedEventId = Number(eventId || 0)
    if (normalizedEventId <= 0) return
    ignoredPyqtTerminalEventRef.current = Math.max(ignoredPyqtTerminalEventRef.current, normalizedEventId)
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('mdts_ignored_pyqt_trauma_event', String(ignoredPyqtTerminalEventRef.current))
    }
  }

  const stopPyqtTraumaOverlay = async () => {
    markPyqtTraumaEventHandled(Math.max(lastPyqtScanEventRef.current, lastPyqtTerminalEventRef.current))
    isScanningRef.current = false
    setIsScanning(false)
    setScanStatus(null)
    setScanProgress(0)
    setScanError(null)
    setScanResult(null)

    try {
      await stopPyqtTraumaStream()
    } catch (error) {
      console.warn('[trauma] PyQt5 stop request failed:', error.message)
    }
  }

  useEffect(() => {
    let cancelled = false

    const syncPyqtTraumaState = async () => {
      if (pyqtSyncBusyRef.current) return
      pyqtSyncBusyRef.current = true

      try {
        const payload = await fetchPyqtTraumaResult()
        if (cancelled || !payload?.ok) return

        const phase = payload.phase
        const eventId = Number(payload.scan_event_id || 0)
        if (eventId > 0 && eventId <= getIgnoredPyqtTraumaEventId()) return
        const hasNewEvent = eventId > lastPyqtScanEventRef.current

        if (phase === 'scanning' && eventId > 0) {
          if (hasNewEvent) {
            setScanResult(null)
            setScanError(null)
          }
          lastPyqtScanEventRef.current = eventId
          isScanningRef.current = true
          setIsScanning(true)
          setScanStatus('scanning')
          setScanProgress(Math.max(0, Math.min(99, Number(payload.progress || 0))))
          return
        }

        if (phase === 'result' && eventId > 0) {
          if (eventId <= lastPyqtTerminalEventRef.current) return
          const normalized = normalizeTraumaResult(payload)
          if (!normalized) return

          lastPyqtScanEventRef.current = eventId
          lastPyqtTerminalEventRef.current = eventId
          isScanningRef.current = true
          setIsScanning(true)
          setScanProgress(100)
          setScanResult(normalized)
          setScanError(null)
          setScanStatus('success')
          return
        }

        if (payload.error && eventId > 0 && eventId > lastPyqtTerminalEventRef.current) {
          lastPyqtScanEventRef.current = eventId
          lastPyqtTerminalEventRef.current = eventId
          isScanningRef.current = true
          setIsScanning(true)
          setScanProgress(0)
          setScanResult(null)
          setScanStatus('error')
          setScanError(payload.error.message || 'PyQt5 외상 촬영 결과를 확인할 수 없습니다.')
          return
        }

        if (phase === 'camera' && isScanningRef.current) {
          setIsScanning(true)
          setScanProgress(0)
          setScanResult(null)
          setScanError(null)
          setScanStatus('camera_ready')
        }
      } catch {
        // PyQt5가 실행 중이지 않은 경우 기존 웹 화면을 유지한다.
      } finally {
        pyqtSyncBusyRef.current = false
      }
    }

    syncPyqtTraumaState()
    const timer = window.setInterval(syncPyqtTraumaState, 900)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const handlePyqtCaptureStart = async () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current)
      scanTimerRef.current = null
    }

    isScanningRef.current = true
    setIsScanning(true)
    setScanStatus('scanning')
    setScanProgress(0)
    setScanError(null)

    try {
      await triggerPyqtTraumaAnalysis()
    } catch (error) {
      console.warn('[trauma] pyqt capture trigger failed:', error.message)
    }

    let p = 0
    scanTimerRef.current = setInterval(() => {
      p = Math.min(92, p + 4)
      setScanProgress(p)
    }, 120)

    try {
      const pyqtResult = await waitForPyqtTraumaResult()
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current)
        scanTimerRef.current = null
      }
      setScanProgress(100)
      setScanResult(pyqtResult)
      setScanStatus('success')
    } catch (error) {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current)
        scanTimerRef.current = null
      }
      setScanProgress(0)
      setScanStatus('error')
      setScanError(`PyQt5 외상 분석 결과 수신 실패: ${error.message}`)
    }
  }

  const handlePyqtRetakeReady = async () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current)
      scanTimerRef.current = null
    }

    markPyqtTraumaEventHandled(Math.max(lastPyqtScanEventRef.current, lastPyqtTerminalEventRef.current))
    isScanningRef.current = true
    setIsScanning(true)
    setScanProgress(0)
    setScanResult(null)
    setScanError(null)
    setScanStatus('pyqt5_connecting')

    try {
      await resetPyqtTraumaCapture()
      setScanStatus('camera_ready')
    } catch (error) {
      console.warn('[trauma] pyqt retake reset failed:', error.message)
      try {
        await startPyqtTraumaCapture()
        setScanStatus('camera_ready')
      } catch (fallbackError) {
        setScanStatus('error')
        setScanError(`재촬영 준비 실패: ${fallbackError.message}`)
      }
    }
  }

  const confirmTraumaAnalysis = async () => {
    isScanningRef.current = false
    setIsScanning(false)
    setScanStatus(null)
    markPyqtTraumaEventHandled(Math.max(lastPyqtScanEventRef.current, lastPyqtTerminalEventRef.current))

    const crewId = getCrewNumericId(activePatientWithHistory || patient)
    let latestVital = null
    let patientHistory = []

    try {
      latestVital = crewId ? await fetchLatestVital(crewId) : null
    } catch (error) {
      console.warn('[trauma] latest vital load failed:', error.message)
    }

    try {
      patientHistory = crewId ? await fetchPatientHistory(crewId, 10) : []
    } catch (error) {
      console.warn('[trauma] patient history load failed:', error.message)
    }

    try {
      await openPyqtTraumaGuide({
        label: scanResult?.label || '',
        labelEn: scanResult?.labelEn || '',
        diagnosis: scanResult?.diagnosis || scanResult?.label || '',
        confidence: scanResult?.confidence || 0,
        key: scanResult?.key || '',
        traumaType: scanResult?.label || scanResult?.labelEn || 'TRAUMA',
      })
    } catch (error) {
      console.warn('[trauma] pyqt guide open failed:', error.message)
    }

    onNavigate && onNavigate('emergency', {
      type: scanResult?.label || scanResult?.labelEn || 'TRAUMA',
      traumaType: scanResult?.label || scanResult?.labelEn || 'TRAUMA',
      traumaResult: scanResult || null,
      crewId,
      latestVital,
      patientHistory,
      patientSnapshot: activePatientWithHistory || patient,
    })
  }

  return (
    <>
      <DashboardView
        activePatient={activePatientWithHistory}
        crewList={crewList}
        hr={hr}
        spo2={spo2}
        rr={rr}
        bp={bp}
        bt={bt}
        chat={chat}
        prompt={prompt}
        setPrompt={setPrompt}
        handlePromptAnalysis={handlePromptAnalysis}
        startEmergencyAction={startEmergencyAction}
        handleTraumaAnalysis={handleTraumaAnalysis}
        handlePyqtCaptureStart={handlePyqtCaptureStart}
        handlePyqtRetakeReady={handlePyqtRetakeReady}
        isScanning={isScanning}
        setIsScanning={(v) => { isScanningRef.current = v; setIsScanning(v) }}
        scanProgress={scanProgress}
        scanStatus={scanStatus}
        setScanStatus={setScanStatus}
        scanError={scanError}
        setScanError={setScanError}
        scanResult={scanResult}
        confirmTraumaAnalysis={confirmTraumaAnalysis}
        onLowConfidenceAlert={() => setLowConfidencePopup(true)}
        setBp={setBp}
        setBt={setBt}
        onSwitchPatient={onSwitchPatient}
        timelineEvents={timelineEvents}
        traumaNudgeActive={traumaNudgeActive}
        handlePyqtTraumaStop={stopPyqtTraumaOverlay}
        aiConnectionState={aiConnectionState}
        onAiToggle={handleAiToggle}
        isAiToggling={isAiToggling}
        isAiThinking={isAiThinking}
      />
      {showTutorial && <MainTutorial onFinish={finishTutorial} />}


      {lowConfidencePopup && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99998,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'rgba(2, 15, 25, 0.98)', border: '2px solid rgba(139,92,246,0.4)',
            borderRadius: 32, padding: '52px 56px', maxWidth: 520, width: '90%',
            boxShadow: '0 0 80px rgba(139,92,246,0.2)', textAlign: 'center',
            animation: 'fadeInUp 0.3s ease-out'
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(139,92,246,0.1)', border: '2px solid #8b5cf6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 28px', fontSize: 36
            }}>🩺</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.5, marginBottom: 20 }}>
              정확한 판단을 위해<br/>의료진 확인이 필요한 상태입니다.
            </div>
            <div style={{ fontSize: 17, color: '#94a3b8', lineHeight: 1.8, fontWeight: 600 }}>
              현재 상태는 AI 분석만으로는<br/>판단이 조심스러운 단계입니다.
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── 초기 채팅 생성 ───
function getInitialChat(patient) {
  if (!patient) return []

  const chronic = patient.chronic || '없음'
  const allergies = patient.allergies || '없음'
  const note = patient.note || ''

  // 환자별 외상 시나리오 메시지 맵
  const scenarios = {
    'S26-003': [
      { role: 'ai', text: `박기관 기관장님의 바이탈 데이터 동기화가 완료되었습니다.\n\n[상태 요약]\n• 사고: 기계실 파이프 정비 중 파손된 파편에 우측 팔꿈치 아래가 깊게 베임\n• 손상: 약 6cm 가량의 깊은 절상 — 선홍색 피가 솟구치는 활동성 출혈 관찰\n• 상태: 사고 직후 빠른 압박 지혈로 현재는 출혈이 멎었으나 환부 주변이 부어오름\n• 주의: 고혈압이 있으며 지혈 상태를 15분 간격으로 재확인해야 함` },
      { role: 'ai', text: `[MDTS 권고사항]\n• 상처 부위를 심장보다 높게 유지하여 혈류 압력을 낮추세요\n• 지혈대를 사용했다면 착용 시각을 반드시 기록하고, 멸균 거즈로 환부를 보호하세요\n• 통증 조절을 위해 타이레놀 500mg을 복용시키되, 아스피린 알레르기가 있으므로 주의하세요\n• 환부 원위부(손끝)의 맥박과 감각을 30분마다 체크하세요\n\n[신뢰도: 96%] [가이드: 깊은 절상 및 출혈 대응]` },
      { role: 'user', text: '처치 내용 기록해줘' },
      { role: 'ai', text: `[기록된 처치 내역 — 박기관 / 14:38~15:10]

① 지혈 및 세척
   → 생리식염수로 상처 내 이물질을 깨끗이 씻어냄
   → 멸균 거즈 도포 후 탄력 붕대로 압박 지혈 완료 (현재 출혈 멎음)

② 약 먹임
   → 아스피린 대신 타이레놀 500mg 한 알 복용함 (알레르기 대응)

③ 상처 관찰
   → 환부 주변 부종(부기) 관찰되나 손가락 감각 및 움직임은 정상임
   → 15분마다 거즈가 젖어드는지(재출혈) 확인 예정

④ 환경 조성
   → 안정을 위해 침상으로 이동 후 우측 팔을 거상(높게 들기) 상태로 유지` },
    ],
  }

  // 박기관(S26-003)만 하드코딩 채팅 반환, 나머지는 빈 배열
  return scenarios[patient.id] || []
}

// ─── AI 답변 시뮬레이션 ───
function getAiReply(q, patient) {
  if (!patient) return "대상 환자가 선택되지 않았습니다."
  
  const chronic = patient.chronic || '없음'
  const allergies = patient.allergies || '없음'

  if (q.includes('안녕')) return "안녕하세요. MDTS 응급 처치 가이드입니다. 무엇을 도와드릴까요?"
  if (q.includes('상태') || q.includes('어때')) return `현재 ${patient.name} 환자의 상태를 분석 중입니다. 기저 질환인 ${chronic}에 유의하며 모니터링을 유지하십시오.`
  if (q.includes('약') || q.includes('처방')) return `${patient.name} 환자는 ${allergies} 알레르기가 있으므로 처치 안내 시 주의가 필요합니다.`
  
  return `분석 결과 :\n• 대상 : ${patient.name} (${patient.role})\n• 특이사항 : ${chronic !== '없음' ? '기저 질환 관찰 필요' : '특이 기저질환 없음'}\n• 주의 : 알레르기 (${allergies})\n\n[ACCURACY: 92%]\n[EVIDENCE: 통합 환자 데이터 연동 및 실시간 바이탈 패턴 분석]\n[GUIDE: SOP-GEN-01]`
}

import { useState, useEffect, useRef } from 'react'
import { Activity, History, RotateCcw, RefreshCw, Droplets, Upload, AlertTriangle, Camera, Mic, User, Pill, AlertCircle, MapPin, Phone, Anchor, Weight, Ruler, HeartPulse, Paperclip, ArrowUp, Sparkles, CheckCircle2, Clock, Database, ChevronRight, ChevronDown, Info, ShieldCheck, Zap, Crosshair, Eye, Maximize, Thermometer, Wind, ScanLine } from 'lucide-react'
import { resolveAvatarUrl } from '../../../utils/avatar'
import { DashboardVital, InfoItem, TimelineItem } from '../../../components/ui'
import EmergencyGuide from './EmergencyGuide.jsx'
import { updateVital, getPyqtTraumaStreamUrl } from '../../../utils/api'

function getExampleQuestions(patient) {
  const questions = []
  const chronic = patient?.chronic || ''
  const allergies = patient?.allergies || ''
  const note = patient?.note || ''
  const isEmergency = patient?.isEmergency

  // 1. 사고/증상 기반 질문 (note에서 파생)
  if (note.includes('골절')) questions.push('골절 의심 시 응급처치 방법은?')
  else if (note.includes('추락') || note.includes('낙상')) questions.push('추락 사고 후 초기 평가 방법은?')
  else if (note.includes('화상')) questions.push('화상 환자 응급처치 순서는?')
  else if (note.includes('출혈')) questions.push('외상 출혈 지혈 방법은?')
  else if (note.includes('의식')) questions.push('의식 저하 환자 대응 방법은?')
  else if (note.includes('당뇨') || chronic.includes('당뇨')) questions.push('당뇨 환자 저혈당 응급처치는?')
  else if (note.includes('디스크') || chronic.includes('디스크')) questions.push('허리디스크 환자 이동 시 주의사항은?')
  else if (note.includes('습진') || chronic.includes('습진')) questions.push('피부 알레르기 악화 시 처치 방법은?')
  else if (isEmergency) questions.push('현재 응급 상태 악화 징후 확인 방법은?')
  else questions.push('현재 건강 상태 이상 징후 확인 방법은?')

  // 2. 바이탈 분석 질문 (항상 포함)
  questions.push('현재 바이탈 이상 여부 분석해줘')
  questions.push('응급처치 가이드 기록해줘')
  questions.push('현재까지의 타임라인 정리해줘')

  // 3. 기저질환 기반 질문
  if (chronic.includes('고혈압') && chronic.includes('고지혈')) questions.push('고혈압·고지혈증 환자 통증 관리 방법은?')
  else if (chronic.includes('고혈압')) questions.push('고혈압 환자 응급 상황 대응 방법은?')
  else if (chronic.includes('당뇨')) questions.push('당뇨 환자 활력징후 해석 방법은?')
  else if (chronic.includes('디스크')) questions.push('척추 질환 환자 자세 관리 방법은?')
  else if (chronic.includes('비염')) questions.push('비염 환자 호흡 곤란 시 대처법은?')
  else if (chronic.includes('치질')) questions.push('장기 항해 중 만성 질환 관리 방법은?')
  else if (chronic === '없음' || !chronic) questions.push('해상 환경에서 탈수 예방 방법은?')
  else questions.push(`${chronic} 환자 주의사항은?`)

  // 4. 알레르기 기반 질문
  if (allergies && allergies !== '없음') questions.push(`${allergies} 알레르기 환자 대체 약물은?`)
  else questions.push('선내 상비약 투여 시 주의사항은?')

  return questions
}

export default function DashboardView({
  activePatient, crewList = [], hr, spo2, rr, bp, bt, chat, prompt, setPrompt,
  handlePromptAnalysis, startEmergencyAction, handleTraumaAnalysis,
  handlePyqtCaptureStart, isScanning, scanProgress, scanStatus, setScanStatus, scanError,
  scanResult, confirmTraumaAnalysis, setIsScanning, onLowConfidenceAlert,
  setBp, setBt, onSwitchPatient, timelineEvents = [], traumaNudgeActive = false,
  handlePyqtTraumaStop, handlePyqtRetakeReady, aiConnectionState = { connected: false, status: 'checking' },
  onAiToggle, isAiToggling = false, isAiThinking = false
}) {
  const streamRef = useRef(null)
  const scanOverlayRef = useRef(null)
  const chatEndRef = useRef(null)

  const closeTraumaOverlay = () => {
    if (handlePyqtTraumaStop) {
      handlePyqtTraumaStop()
      return
    }
    setIsScanning(false)
    setScanStatus(null)
  }

  // 메시지 추가 시 자동 스크롤
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chat])

  // ─── 환자 선택 드롭다운 상태 ───
  const [isSelectOpen, setIsSelectOpen] = useState(false)
  const [dynamicCrewList, setDynamicCrewList] = useState([])
  const selectRef = useRef(null)

  useEffect(() => {
    const loadPatients = () => {
      const savedCrew = JSON.parse(localStorage.getItem('mdts_crew_list') || '[]')
      const propCrew = Array.isArray(crewList) ? crewList.filter(Boolean) : []
      const localCrew = Array.isArray(savedCrew) ? savedCrew.filter(Boolean) : []
      const localCrewById = new Map(localCrew.map(crew => [crew.id, crew]))
      const mergedCrewById = new Map()

      ;[...propCrew, ...localCrew].forEach(crew => {
        if (!crew?.id) return
        const localState = localCrewById.get(crew.id)
        mergedCrewById.set(crew.id, {
          ...crew,
          ...localState,
          isEmergency: Boolean(localState?.isEmergency || crew.isEmergency),
        })
      })

      if (activePatient?.id && activePatient.isEmergency && !mergedCrewById.has(activePatient.id)) {
        mergedCrewById.set(activePatient.id, activePatient)
      }

      const focusedCrew = Array.from(mergedCrewById.values()).filter(crew => crew.isEmergency)

      setDynamicCrewList([...focusedCrew].sort((a, b) => {
        const aId = Number(a.crewDbId || String(a.id || '').split('-').pop()) || 0
        const bId = Number(b.crewDbId || String(b.id || '').split('-').pop()) || 0
        return aId - bId
      }))
    }
    loadPatients()
  }, [activePatient?.id, crewList])

  useEffect(() => {
    function handleClickOutside(e) {
      if (selectRef.current && !selectRef.current.contains(e.target)) setIsSelectOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // ─── 센서 상태 판별 ───
  const [spo2Status, setSpo2Status] = useState('normal') 

  // ─── 편집 모달 상태 ───
  const [editTarget, setEditTarget] = useState(null) 
  const [editValue, setEditValue] = useState('')

  const openEdit = (type, currentVal) => {
    setEditTarget(type)
    setEditValue(currentVal)
  }

  const saveEdit = () => {
    if (editTarget === 'bp') {
      setBp(editValue)
      // 박기관 제외: 서버 DB에도 저장
      if (activePatient && activePatient.id !== 'S26-003') {
        const crewDbId = activePatient.crewDbId || parseInt(activePatient.id?.split('-')[1]);
        updateVital(crewDbId, { blood_pressure: editValue }).catch(() => {});
      }
    }
    if (editTarget === 'bt') {
      setBt(editValue)
      // 박기관 제외: 서버 DB에도 저장
      if (activePatient && activePatient.id !== 'S26-003') {
        const crewDbId = activePatient.crewDbId || parseInt(activePatient.id?.split('-')[1]);
        updateVital(crewDbId, { temperature: parseFloat(editValue) }).catch(() => {});
      }
    }
    setEditTarget(null)
  }

  const toggleSpo2Status = () => {
    setSpo2Status(prev => prev === 'normal' ? 'error' : 'normal')
  }

  // 카메라 스트림 관리
  const [cameraError, setCameraError] = useState(null)
  const [streamKey, setStreamKey] = useState(Date.now())
  useEffect(() => {
    setCameraError(null)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (!isScanning) return undefined

    setStreamKey(Date.now())
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [isScanning, scanStatus])

  // ─── 타임라인 및 진단 데이터 로드 ───
  const [dynamicTimeline, setDynamicTimeline] = useState([])

  useEffect(() => {
    setDynamicTimeline(Array.isArray(timelineEvents) ? timelineEvents : [])
  }, [timelineEvents])

  // 비상연락처 데이터 파싱
  const getEmergencyDisplay = () => {
    let display = { name: '미지정', phone: '-', relation: '-' };
    const PROTECTOR_MAP = {
      'S26-001': '김도윤', 'S26-002': '김도장', 'S26-003': '양정희', 'S26-004': '박지호',
      'S26-005': '정민준', 'S26-006': '정하윤', 'S26-007': '강준우', 'S26-008': '조예은',
      'S26-009': '임도현', 'S26-010': '장수빈', 'S26-011': '황지훈', 'S26-012': '한지민',
      'S26-013': '오세현', 'S26-014': '나혜지', 'S26-015': '송다희', 'S26-016': '김한혜'
    };
    const forcedName = PROTECTOR_MAP[activePatient?.id];
    if (activePatient?.emergencyName || forcedName) {
      display.name = forcedName || activePatient.emergencyName;
      if (activePatient?.emergency && typeof activePatient.emergency === 'string') {
        const parts = activePatient.emergency.split(' ');
        display.phone = parts[0] || '-';
        display.relation = parts[1] ? parts[1].replace(/[()]/g, '') : '가족';
      }
      return display;
    }
    if (activePatient?.emergencyContact && typeof activePatient.emergencyContact === 'object') {
      display = {
        name: forcedName || activePatient.emergencyContact.name || '미지정',
        phone: activePatient.emergencyContact.phone || '-',
        relation: activePatient.emergencyContact.relation || '-'
      };
    } else if (activePatient?.emergency && typeof activePatient.emergency === 'string') {
      const parts = activePatient.emergency.split(' ');
      display.phone = parts[0] || '-';
      display.relation = parts[1] ? parts[1].replace(/[()]/g, '') : '가족';
      display.name = forcedName || activePatient.emergencyName || '보호자';
    }
    return display;
  };
  const emergency = getEmergencyDisplay();

  const isCapScanning = scanStatus === 'scanning'
  const isCapSuccess  = scanStatus === 'success'
  const isCapError    = scanStatus === 'error'
  const isCapRefer    = scanStatus === 'refer'
  const isCameraReady = scanStatus === 'camera_ready' || scanStatus === 'pyqt5_ready'
  const pyqtFrameUrl = isScanning ? getPyqtTraumaStreamUrl(streamKey) : ''

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%', position: 'relative', background: '#020408', cursor: 'default' }}>

      {isScanning && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#020408', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          {pyqtFrameUrl && (
            <img
              src={pyqtFrameUrl}
              alt="Jetson Nano PyQt5 trauma camera"
              onLoad={() => setCameraError(null)}
              onError={() => setCameraError('Jetson Nano 카메라 프레임 수신 대기 중입니다. PyQt5 외상 촬영 화면이 열려 있는지 확인하세요.')}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: cameraError ? 0.12 : 1, filter: 'contrast(1.04) saturate(1.04)', background: '#000' }}
            />
          )}

          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(13,217,197,0.04) 0%, rgba(2,4,8,0.14) 40%, rgba(2,4,8,0.86) 100%)', pointerEvents: 'none' }} />

          <div style={{ position: 'absolute', top: 28, left: 36, right: 36, zIndex: 10002, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#0dd9c5', boxShadow: '0 0 12px #0dd9c5', animation: 'glowPulse 1.4s ease infinite' }} />
                <div style={{ fontSize: 13, fontWeight: 950, color: '#0dd9c5', letterSpacing: 3, textTransform: 'uppercase' }}>UHD TRAUMA SCAN</div>
              </div>
              <div style={{ fontSize: 34, fontWeight: 950, color: '#ffffff', letterSpacing: -1 }}>외상 촬영 및 AI 분석</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#8da2c0' }}>LIVE JETSON NANO PYQT5 CAMERA FEED</div>
            </div>
          </div>

          <div style={{ position: 'absolute', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ position: 'relative', width: 'min(74vh, 760px)', height: 'min(74vh, 760px)' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 26, border: '1px solid rgba(13,217,197,0.18)', boxShadow: '0 0 60px rgba(13,217,197,0.10), inset 0 0 80px rgba(13,217,197,0.07)' }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden', backgroundImage: 'linear-gradient(rgba(13,217,197,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(13,217,197,0.12) 1px, transparent 1px)', backgroundSize: '42px 42px', opacity: 0.38 }} />
              <div style={{ position: 'absolute', top: -2, left: -2, width: 86, height: 86, borderTop: '4px solid #0dd9c5', borderLeft: '4px solid #0dd9c5', boxShadow: '-10px -10px 34px rgba(13,217,197,0.22)' }} />
              <div style={{ position: 'absolute', top: -2, right: -2, width: 86, height: 86, borderTop: '4px solid #0dd9c5', borderRight: '4px solid #0dd9c5', boxShadow: '10px -10px 34px rgba(13,217,197,0.22)' }} />
              <div style={{ position: 'absolute', bottom: -2, left: -2, width: 86, height: 86, borderBottom: '4px solid #0dd9c5', borderLeft: '4px solid #0dd9c5', boxShadow: '-10px 10px 34px rgba(13,217,197,0.22)' }} />
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 86, height: 86, borderBottom: '4px solid #0dd9c5', borderRight: '4px solid #0dd9c5', boxShadow: '10px 10px 34px rgba(13,217,197,0.22)' }} />

              <div style={{ position: 'absolute', left: '50%', top: '50%', width: 2, height: '72%', transform: 'translate(-50%, -50%)', background: 'linear-gradient(180deg, transparent, rgba(13,217,197,0.8), transparent)' }} />
              <div style={{ position: 'absolute', left: '50%', top: '50%', width: '72%', height: 2, transform: 'translate(-50%, -50%)', background: 'linear-gradient(90deg, transparent, rgba(13,217,197,0.8), transparent)' }} />
              <div style={{ position: 'absolute', left: '50%', top: '50%', width: 180, height: 180, transform: 'translate(-50%, -50%)', borderRadius: '50%', border: '1px solid rgba(13,217,197,0.34)' }} />
              <div style={{ position: 'absolute', left: '50%', top: '50%', width: 18, height: 18, transform: 'translate(-50%, -50%)', borderRadius: '50%', background: 'rgba(13,217,197,0.18)', border: '2px solid #0dd9c5', boxShadow: '0 0 22px #0dd9c5' }} />

              {(isCameraReady || isCapScanning || scanStatus === 'pyqt5_connecting') && (
                <>
                  <div style={{ position: 'absolute', left: 24, right: 24, top: '6%', height: 118, animation: 'scannerSweepVertical 2.35s infinite ease-in-out', opacity: isCapScanning ? 1 : 0.82 }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 0%, rgba(13,217,197,0.04) 12%, rgba(13,217,197,0.24) 47%, rgba(79,195,247,0.16) 55%, rgba(13,217,197,0.04) 88%, transparent 100%)', filter: 'blur(0.2px)', animation: 'scannerBeamPulse 1.1s infinite ease-in-out' }} />
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 4, transform: 'translateY(-50%)', background: 'linear-gradient(90deg, transparent, #ffffff, #0dd9c5, #4fc3f7, #ffffff, transparent)', boxShadow: '0 0 34px #0dd9c5, 0 0 70px rgba(79,195,247,0.42)' }} />
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 34, transform: 'translateY(-50%)', borderTop: '1px solid rgba(13,217,197,0.55)', borderBottom: '1px solid rgba(13,217,197,0.22)', backgroundImage: 'repeating-linear-gradient(90deg, rgba(13,217,197,0.22) 0px, rgba(13,217,197,0.22) 1px, transparent 1px, transparent 18px)' }} />
                  </div>
                  {isCapScanning && (
                    <div style={{ position: 'absolute', left: '50%', top: '50%', width: 144, height: 144, transform: 'translate(-50%, -50%)', borderRadius: '50%', background: `conic-gradient(#0dd9c5 ${scanProgress * 3.6}deg, rgba(13,217,197,0.08) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 44px rgba(13,217,197,0.22)' }}>
                      <div style={{ width: 108, height: 108, borderRadius: '50%', background: 'rgba(2,8,18,0.86)', border: '1px solid rgba(13,217,197,0.26)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ScanLine size={44} color="#0dd9c5" style={{ animation: 'stepPulse 1s infinite' }} />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {cameraError && !isCapError && (
            <div style={{ position: 'absolute', left: 36, bottom: 156, zIndex: 10003, maxWidth: 520, padding: '16px 20px', borderRadius: 14, background: 'rgba(255,77,109,0.12)', border: '1px solid rgba(255,77,109,0.35)', color: '#fecdd3', fontSize: 16, fontWeight: 800, lineHeight: 1.5 }}>
              {cameraError}
            </div>
          )}

          {isCameraReady && (
            <div style={{ position: 'absolute', bottom: 112, left: 0, right: 0, zIndex: 10004, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              <button onClick={handlePyqtCaptureStart} style={{ padding: '22px 86px', borderRadius: 18, border: '1px solid rgba(13,217,197,0.55)', background: 'linear-gradient(135deg,#0dd9c5,#4fc3f7)', color: '#020408', fontSize: 24, fontWeight: 950, cursor: 'pointer', boxShadow: '0 0 42px rgba(13,217,197,0.46), inset 0 1px 0 rgba(255,255,255,0.45)' }}>
                촬영 시작
              </button>
            </div>
          )}

          {isCapScanning && (
            <div style={{ position: 'absolute', bottom: 112, left: '50%', transform: 'translateX(-50%)', width: 560, zIndex: 10004 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#0dd9c5', boxShadow: '0 0 12px #0dd9c5', animation: 'statusBlink 1.2s ease infinite' }} />
                  <span style={{ color: '#0dd9c5', fontSize: 18, fontWeight: 950, letterSpacing: 1.2 }}>사진 스캔 중...</span>
                </div>
                <span style={{ color: '#ffffff', fontSize: 18, fontWeight: 950 }}>{Math.round(scanProgress)}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', border: '1px solid rgba(13,217,197,0.18)' }}>
                <div style={{ height: '100%', width: `${scanProgress}%`, background: 'linear-gradient(90deg,#0dd9c5,#4fc3f7)', borderRadius: 8, transition: 'width 0.1s', boxShadow: '0 0 18px rgba(13,217,197,0.6)' }} />
              </div>
              <div style={{ marginTop: 10, color: '#8da2c0', fontSize: 14, fontWeight: 800, textAlign: 'center' }}>이미지 품질 및 초점을 분석하고 있습니다.</div>
            </div>
          )}

          {isCapSuccess && (
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 620, zIndex: 10005, borderRadius: 24, overflow: 'hidden', boxShadow: '0 30px 90px rgba(0,0,0,0.72)', border: '2px solid rgba(38,222,129,0.4)', background: 'rgba(8,16,32,0.98)' }}>
              <div style={{ height: 4, background: 'linear-gradient(90deg,#26de81,#0dd9c5)' }} />
              <div style={{ padding: '42px 44px 38px', textAlign: 'center' }}>
                <div style={{ width: 104, height: 104, borderRadius: '50%', background: 'rgba(38,222,129,0.12)', border: '2px solid rgba(38,222,129,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <CheckCircle2 size={52} color="#26de81" />
                </div>
                <div style={{ fontSize: 36, fontWeight: 950, color: '#fff', marginBottom: 8 }}>촬영 완료</div>
                <div style={{ fontSize: 18, color: '#8da2c0', lineHeight: 1.7, marginBottom: 18 }}>PyQt5 외상 분석 결과가 수신되었습니다.<br/>아래 진단명을 기준으로 응급처치 가이드를 시작합니다.</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: 14, marginBottom: 28 }}>
                  <div style={{ padding: '18px 20px', borderRadius: 18, background: 'rgba(13,217,197,0.08)', border: '1px solid rgba(13,217,197,0.26)', textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 950, color: '#0dd9c5', letterSpacing: 1.4, marginBottom: 8 }}>PYQT5 진단명</div>
                    <div style={{ fontSize: 30, fontWeight: 950, color: '#ffffff', letterSpacing: -0.8 }}>{scanResult?.diagnosis || scanResult?.label || '진단명 확인 필요'}</div>
                    {scanResult?.labelEn && scanResult.labelEn !== scanResult?.label && (
                      <div style={{ marginTop: 4, fontSize: 15, fontWeight: 800, color: '#8da2c0' }}>{scanResult.labelEn}</div>
                    )}
                  </div>
                  <div style={{ padding: '18px 20px', borderRadius: 18, background: 'rgba(38,222,129,0.08)', border: '1px solid rgba(38,222,129,0.28)', textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 950, color: '#26de81', letterSpacing: 1.4, marginBottom: 8 }}>분석 정확도</div>
                    <div style={{ fontSize: 30, fontWeight: 950, color: '#ffffff', letterSpacing: -0.8 }}>{scanResult?.confidenceText || (scanResult?.confidence ? `${scanResult.confidence}%` : '확인 필요')}</div>
                    {scanResult?.confidence > 0 && (
                      <div style={{ marginTop: 12, height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, Math.max(0, Number(scanResult.confidence) || 0))}%`, height: '100%', borderRadius: 8, background: 'linear-gradient(90deg,#26de81,#0dd9c5)', boxShadow: '0 0 18px rgba(38,222,129,0.42)' }} />
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={confirmTraumaAnalysis} style={{ width: '100%', padding: '18px', borderRadius: 14, background: 'linear-gradient(135deg,#26de81,#0dd9c5)', border: 'none', color: '#050d1a', fontSize: 20, fontWeight: 950, cursor: 'pointer' }}>AI 분석 시작</button>
              </div>
            </div>
          )}

          {isCapError && (
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 620, zIndex: 10005, borderRadius: 24, overflow: 'hidden', boxShadow: '0 30px 90px rgba(0,0,0,0.72)', border: '2px solid rgba(255,77,109,0.4)', background: 'rgba(8,16,32,0.98)' }}>
              <div style={{ height: 4, background: 'linear-gradient(90deg,#ff4d6d,#ff9f43)' }} />
              <div style={{ padding: '42px 44px 38px', textAlign: 'center' }}>
                <div style={{ width: 104, height: 104, borderRadius: '50%', background: 'rgba(255,77,109,0.12)', border: '2px solid rgba(255,77,109,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <AlertCircle size={52} color="#ff4d6d" />
                </div>
                <div style={{ fontSize: 34, fontWeight: 950, color: '#fff', marginBottom: 8 }}>{scanError ? '외상 촬영 연결 확인 필요' : '촬영 오류'}</div>
                <div style={{ fontSize: 18, color: '#8da2c0', lineHeight: 1.7, marginBottom: 28 }}>{scanError || <>이미지를 인식하지 못했습니다.<br/>선명한 사진으로 다시 촬영해 주세요.</>}</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={closeTraumaOverlay} style={{ flex: 1, padding: '16px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#8da2c0', fontSize: 18, fontWeight: 800, cursor: 'pointer' }}>취소</button>
                  <button onClick={handlePyqtRetakeReady || handleTraumaAnalysis} style={{ flex: 2, padding: '16px', borderRadius: 14, background: 'linear-gradient(135deg,#ff4d6d,#ff9f43)', border: 'none', color: '#fff', fontSize: 18, fontWeight: 950, cursor: 'pointer' }}>다시 촬영</button>
                </div>
              </div>
            </div>
          )}

          <div style={{ position: 'absolute', bottom: 34, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10004 }}>
            <button onClick={closeTraumaOverlay} style={{ background: 'rgba(2,8,18,0.72)', padding: '16px 54px', borderRadius: '100px', color: '#fff', fontSize: 17, fontWeight: 900, border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer', backdropFilter: 'blur(15px)' }}>진단 모드 종료</button>
          </div>
        </div>
      )}
      <aside id="tuto-patient-info" style={{ width: 420, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.05)', background: '#05070a', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ flexShrink: 0, padding: '24px 28px 20px 28px', borderBottom: '1px solid rgba(56,189,248,0.1)', background: 'rgba(56,189,248,0.03)' }}>
          <div ref={selectRef} style={{ position: 'relative', width: '100%', marginBottom: 24 }}>
            <div onClick={() => setIsSelectOpen(!isSelectOpen)} style={{ background: 'rgba(56,189,248,0.05)', border: `2px solid ${isSelectOpen ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`, borderRadius: '16px', color: '#fff', padding: '12px 20px', fontSize: '20px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: '0.3s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><User size={22} color="#38bdf8" /><span>{activePatient?.name} ({activePatient?.role})</span></div>
              <ChevronDown size={22} style={{ transform: isSelectOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s', color: '#38bdf8' }} />
            </div>
            {isSelectOpen && (
              <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(56,189,248,0.3)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', zIndex: 1000 }}>
                {dynamicCrewList.length === 0 && (
                  <div style={{ padding: '18px 20px', fontSize: '16px', fontWeight: 800, color: '#64748b' }}>
                    집중 관리 중인 선원이 없습니다.
                  </div>
                )}
                {dynamicCrewList.map(c => (
                  <div key={c.id} onClick={() => { onSwitchPatient?.(c); setIsSelectOpen(false); }} style={{ padding: '16px 20px', fontSize: '18px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: activePatient?.id === c.id ? 'rgba(56,189,248,0.2)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: c.isEmergency ? '#ff4d6d' : '#26de81' }} />{c.name} ({c.role})</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div key={activePatient?.id} style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
            <ProfileImage avatar={activePatient?.avatar} name={activePatient?.name} />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
                <div style={{ fontSize: 36, fontWeight: 950, letterSpacing: '-0.5px', color: '#fff' }}>{activePatient?.name || '-'}</div>
                <div style={{ fontSize: 20, color: '#38bdf8', fontWeight: 800 }}>{activePatient?.role || '-'}</div>
              </div>
              <div style={{ fontSize: 16, color: '#475569', fontWeight: 700 }}>ID : {activePatient?.id || '-'}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            <InfoItem label="나이/성별" value={`${activePatient?.age ?? '-'}세 / ${activePatient?.gender || '-'}`} size="xl_ultra" />
            <InfoItem label="혈액형" value={activePatient?.blood || '-'} size="xl_ultra" />
            <InfoItem label="신장" value={activePatient?.height ? `${activePatient.height} cm` : '-'} size="xl_ultra" />
            <InfoItem label="몸무게" value={activePatient?.weight ? `${activePatient.weight} kg` : '-'} size="xl_ultra" />
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 120px 28px', scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#38bdf8', fontSize: 18, fontWeight: 800, marginBottom: 14 }}><History size={20}/> 과거력</div>
            <div style={{ fontSize: 19, fontWeight: 750, color: '#e2e8f0', lineHeight: 1.6, background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
              {(activePatient?.pastHistory || activePatient?.history || activePatient?.chronic || '기록 없음').split('\n').map((line, i) => <div key={i}>{line}</div>)}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#00d2ff', fontSize: 18, fontWeight: 800, marginBottom: 14 }}><RotateCcw size={20}/> 최근 진료 이력</div>
            <div 
              onClick={() => {
                // 이미 메인이므로 상세 기록 재현 상태임
              }}
              style={{ 
                cursor: activePatient?.recentHistory ? 'pointer' : 'default',
                background: 'rgba(0, 210, 255, 0.04)', 
                borderRadius: 16, 
                padding: '20px', 
                border: '1px solid rgba(0, 210, 255, 0.15)',
                transition: '0.2s',
              }}
              onMouseOver={e => { if(activePatient?.recentHistory) e.currentTarget.style.background = 'rgba(0, 210, 255, 0.1)' }}
              onMouseOut={e => { if(activePatient?.recentHistory) e.currentTarget.style.background = 'rgba(0, 210, 255, 0.04)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 17, fontWeight: 850, color: '#00d2ff' }}>{activePatient?.recentHistory?.date || '기록 없음'}</span>
                <span style={{ fontSize: 15, color: '#4a6080', fontWeight: 700 }}>{activePatient?.recentHistory?.title || '-'}</span>
              </div>
              <div style={{ fontSize: 16, color: '#8da2c0', whiteSpace: 'pre-line', lineHeight: 1.6 }}>{activePatient?.recentHistory?.detail || '저장된 진료 기록이 없습니다.'}</div>
              {activePatient?.recentHistory && (
                <div style={{ marginTop: 12, textAlign: 'right', fontSize: 13, color: '#38bdf8', fontWeight: 800 }}>
                  상세 기록 재현 중...
                </div>
              )}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#f43f5e', fontSize: 18, fontWeight: 800, marginBottom: 14 }}><AlertCircle size={20}/> 알레르기 / 주의사항</div>
            <div style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(activePatient?.allergies || '없음').split(',').map((a, i) => (<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e' }} /><span style={{ fontSize: 17, fontWeight: 750, color: '#fda4af' }}>{a.trim()}</span></div>))}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fb923c', fontSize: 18, fontWeight: 800, marginBottom: 14 }}><Pill size={20}/> 복용 중인 약물</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(() => {
                const meds = activePatient?.meds?.length > 0 ? activePatient.meds : (activePatient?.lastMed && activePatient.lastMed !== '없음' ? activePatient.lastMed.split(',').map(m => ({ name: m.trim(), purpose: '처방약' })) : []);
                return meds.length > 0 ? meds.map((drug, i) => (
                  <div key={i} style={{ background: 'rgba(251,146,60,0.05)', border: '1px solid rgba(251,146,60,0.15)', borderRadius: 14, padding: '14px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 17, fontWeight: 850, color: '#fed7aa' }}>{drug.name}</span>
                      <span style={{ fontSize: 14, color: '#fb923c', fontWeight: 800 }}>{drug.purpose}</span>
                    </div>
                  </div>
                )) : (
                  <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', color: '#64748b', fontSize: 16, fontWeight: 700 }}>복용 중인 약물 없음</div>
                );
              })()}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#26de81', fontSize: 18, fontWeight: 800, marginBottom: 14 }}><Phone size={20}/> 비상 연락망</div>
            <div style={{ background: 'rgba(38,222,129,0.06)', border: '1px solid rgba(38,222,129,0.2)', borderRadius: 16, padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><span style={{ fontSize: 18, fontWeight: 850, color: '#fff' }}>{emergency.name}</span><span style={{ fontSize: 14, padding: '4px 10px', borderRadius: 8, background: 'rgba(38,222,129,0.15)', color: '#26de81', fontWeight: 800 }}>{emergency.relation}</span></div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#26de81', letterSpacing: '0.5px' }}>{emergency.phone}</div>
            </div>
          </div>
        </div>
        <div id="tuto-emergency-btn" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 28px 24px 28px', borderTop: '1px solid rgba(255,77,109,0.2)', background: 'linear-gradient(to top, #05070a 85%, transparent)', zIndex: 10 }}>
          <button onClick={() => startEmergencyAction('CPR')} style={{ width: '100%', height: 72, borderRadius: 20, background: '#f43f5e', color: '#fff', border: 'none', fontWeight: 950, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, fontSize: 22, boxShadow: '0 8px 25px rgba(244, 63, 94, 0.3)' }}><AlertTriangle size={28} /> 응급 처치 액션 시작</button>
        </div>
      </aside>

      <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <div id="tuto-vitals" style={{ padding: '14px 45px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#080b12', position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr 1.4fr 1.4fr', gap: 12 }}>
            <DashboardVital label="심박수" value={hr} unit="bpm" color="#ff4d6d" live valueSize={38} />
            <div onClick={toggleSpo2Status} style={{ cursor: 'pointer' }}><DashboardVital label="산소포화도" value={spo2} unit="%" color="#38bdf8" live isConnected={spo2Status === 'normal'} valueSize={38} /></div>
            <DashboardVital label="호흡수" value={rr} unit="/min" color="#8b5cf6" live valueSize={38} />
            <DashboardVital label="혈압(입력)" value={bp} unit="mmHg" color="#eab308" editable onEdit={() => openEdit('bp', bp)} valueSize={40} />
            <DashboardVital label="체온(입력)" value={bt} unit="°C" color="#f97316" editable onEdit={() => openEdit('bt', bt)} valueSize={40} />
          </div>
          {editTarget && (
            <div style={{ position: 'absolute', top: '110%', left: editTarget === 'bp' ? '70%' : 'auto', right: editTarget === 'bt' ? '45px' : 'auto', transform: editTarget === 'bp' ? 'translateX(-50%) translateY(15px)' : 'translateY(15px)', zIndex: 1000, width: 360, background: '#1e293b', border: '2px solid #38bdf8', borderRadius: 24, padding: 28, boxShadow: '0 20px 50px rgba(0,0,0,0.6)', animation: 'slideUp 0.2s ease', backdropFilter: 'blur(25px)' }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#38bdf8', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>{editTarget === 'bp' ? <Activity size={20} /> : <Thermometer size={20} />}{editTarget === 'bp' ? '혈압 직접 입력' : '체온 직접 입력'}</div>
              <input value={editValue} autoFocus placeholder={editTarget === 'bp' ? '예: 120/80' : '예: 36.5'} onChange={e => setEditValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditTarget(null); }} style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, padding: '16px 20px', color: '#fff', fontSize: 24, fontWeight: 800, outline: 'none', marginBottom: 20, textAlign: 'center', letterSpacing: '1px' }} />
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}><button onClick={() => setEditTarget(null)} style={{ flex: 1, padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>취소</button><button onClick={saveEdit} style={{ flex: 2, padding: '14px', borderRadius: 12, background: '#38bdf8', color: '#000', border: 'none', fontWeight: 950, fontSize: 16, cursor: 'pointer' }}>데이터 저장</button></div>
            </div>
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#080b12', overflow: 'hidden', position: 'relative' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#0a0d17', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}><div onClick={isAiToggling ? undefined : onAiToggle} title="MDTS AI 상태 전환" style={{ fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10, color: '#e2e8f0', cursor: onAiToggle && !isAiToggling ? 'pointer' : 'default', userSelect: 'none' }}><Sparkles size={20} color={aiConnectionState?.connected ? '#26de81' : '#fb7185'} /> MDTS 응급 처치 가이드 어시스턴트<span style={{ marginLeft: 10, padding: '5px 10px', borderRadius: 999, border: `1px solid ${aiConnectionState?.connected ? 'rgba(38,222,129,0.45)' : 'rgba(244,63,94,0.5)'}`, background: aiConnectionState?.connected ? 'rgba(38,222,129,0.1)' : 'rgba(244,63,94,0.12)', color: aiConnectionState?.connected ? '#26de81' : '#fb7185', fontSize: 12, fontWeight: 950, letterSpacing: 1.2 }}>{isAiToggling ? 'AI SWITCHING' : aiConnectionState?.connected ? (isAiThinking ? 'AI THINKING' : 'AI ONLINE') : 'AI OFFLINE'}</span></div><div style={{ position: 'absolute', bottom: '-1px', left: 0, right: 0, height: '3px', overflow: 'hidden' }}><div style={{ position: 'absolute', top: 0, left: '-100%', width: '60%', height: '2px', background: 'linear-gradient(90deg, transparent, rgba(0, 229, 204, 0.2), #00e5cc, rgba(0, 229, 204, 0.2), transparent)', boxShadow: '0 0 12px #00e5cc', animation: 'flowingLight 5s infinite linear' }} />{(isAiThinking || isAiToggling) && <div style={{ position: 'absolute', top: 1, right: '-100%', width: '54%', height: '2px', background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.25), #3b82f6, #7dd3fc, rgba(59,130,246,0.25), transparent)', boxShadow: '0 0 16px #3b82f6, 0 0 28px rgba(125,211,252,0.62)', animation: 'thinkingBlueLight 1.45s infinite linear' }} />}</div></div>
          <div id="tuto-ai-chat" style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 120px 20px', display: 'flex', flexDirection: 'column', gap: 14, scrollbarWidth: 'none' }}>
            {chat?.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: m.role === 'ai' ? 'row' : 'row-reverse', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: m.role === 'ai' ? '#38bdf8' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{m.role === 'ai' ? <Sparkles size={14} color="#000" /> : <User size={14} color="#fff" />}</div>
                <div style={{ flex: 1, maxWidth: '92%' }}><div style={{ padding: '16px 22px', borderRadius: m.role === 'ai' ? '0 20px 20px 20px' : '20px 0 20px 20px', background: m.role === 'ai' ? 'rgba(56, 189, 248, 0.05)' : 'rgba(255, 255, 255, 0.03)', border: m.role === 'ai' ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)', fontSize: 22, fontWeight: 500, lineHeight: 1.5, color: '#e2e8f0' }}><AiMessageRenderer text={m.text} /></div></div>
              </div>
            ))}
            <div ref={chatEndRef} style={{ height: 40, flexShrink: 0 }} />
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 24px 20px 24px', background: 'linear-gradient(to top, #05070a 80%, transparent)', borderTop: '1px solid rgba(255,255,255,0.05)', zIndex: 10 }}>
            {/* 예시 질문 칩 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', maxWidth: '100%' }}>
              {getExampleQuestions(activePatient).slice(0, 4).map((q) => (
                <button
                  key={q}
                  onClick={() => setPrompt(q)}
                  style={{
                    padding: '8px 18px', borderRadius: 20, fontSize: 15, fontWeight: 700,
                    background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.25)',
                    color: '#7dd3fc', cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.18)'; e.currentTarget.style.borderColor = '#38bdf8'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.07)'; e.currentTarget.style.borderColor = 'rgba(56,189,248,0.25)'; }}
                >
                  {q}
                </button>
              ))}
            </div>
            <div style={{ width: '100%', background: '#0a0f1e', borderRadius: '20px', padding: '6px 6px 6px 24px', display: 'flex', alignItems: 'center', gap: 15, border: '1px solid rgba(56,189,248,0.25)', height: 80, boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
              <input placeholder={aiConnectionState?.connected ? "응급처치 가이드를 질문하거나 상황 대응 타임라인을 작성해보세요" : "AI가 동작하고 있지 않습니다. Ollama 실행 후 질문하세요"} value={prompt} onChange={e => setPrompt(e.target.value)} onKeyPress={e => e.key === 'Enter' && handlePromptAnalysis()} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 20, fontWeight: 500 }} />
              <button onClick={handlePromptAnalysis} style={{ padding: '0 40px', height: 'calc(100% - 4px)', borderRadius: '16px', border: 'none', background: '#38bdf8', color: '#000', fontWeight: 950, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: '0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#7dd3fc'} onMouseOut={e => e.currentTarget.style.background = '#38bdf8'}>입력 <ArrowUp size={24} strokeWidth={3} /></button>
            </div>
          </div>
        </div>
      </section>

      <aside id="tuto-timeline" style={{ width: 480, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#05070a', overflow: 'hidden', position: 'relative', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ flexShrink: 0, padding: '24px 28px 16px 28px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}><div style={{ fontSize: 20, fontWeight: 900, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 10 }}><Clock size={22}/> 상황 대응 타임라인</div></div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 120px 28px', scrollbarWidth: 'none' }}><div style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 180 }}><div style={{ position: 'absolute', left: 7, top: 10, bottom: 10, width: 2, background: dynamicTimeline.length ? 'linear-gradient(to bottom, #38bdf8, #facc15, #a78bfa)' : 'rgba(148,163,184,0.15)' }} />{dynamicTimeline.length === 0 && (<div style={{ paddingLeft: 36, paddingTop: 18, color: '#64748b', fontSize: 16, fontWeight: 800, lineHeight: 1.6 }}>DB 바이탈 첫 기록, 큰폭 변화, Ollama 질문 요청이 발생하면 이곳에 시간순으로 표시됩니다.</div>)}{dynamicTimeline.map((item, idx) => (<div key={item.id || idx} style={{ position: 'relative', paddingLeft: 36, paddingBottom: 40 }}><div style={{ position: 'absolute', left: 0, top: 4, width: 16, height: 16, borderRadius: '50%', background: '#05070a', border: `3px solid ${item.color}`, zIndex: 2 }} /><div style={{ fontSize: 18, fontWeight: 900, color: item.color }}>{item.time}</div><div style={{ fontSize: 22, fontWeight: 950, color: '#fff' }}>{item.title}</div>{item.detail && <div style={{ fontSize: 16, color: '#94a3b8', marginTop: 8, whiteSpace: 'pre-line', lineHeight: 1.5 }}>{item.detail}</div>}</div>))}</div></div>
        <div style={{ position: 'absolute', bottom: 128, right: 28, display: 'flex', flexDirection: 'column', gap: 14, zIndex: 11 }}>
          <button onClick={() => startEmergencyAction('CPR')} title="심폐소생술" style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg, #f43f5e, #fb7185)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 18, fontWeight: 800, lineHeight: 1 }}><HeartPulse size={32} /><span>CPR</span></button>
          <button onClick={() => startEmergencyAction('Heimlich')} title="하임리히법" style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg, #f97316, #fb923c)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 18, fontWeight: 800, lineHeight: 1 }}><Wind size={32} /><span>하임리히</span></button>
        </div>
        <div
          id="tuto-trauma-btn"
          className={traumaNudgeActive ? 'trauma-nudge-wrap' : ''}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 28px 24px 28px', borderTop: '1px solid rgba(56,189,248,0.2)', background: 'linear-gradient(to top, #05070a 85%, transparent)', zIndex: 10, overflow: 'visible' }}
        >
          {traumaNudgeActive && (
            <div className="trauma-nudge-callout">
              다음 단계: 외상 촬영 및 AI 분석을 실행하세요
            </div>
          )}
          <button
            onClick={handleTraumaAnalysis}
            className={traumaNudgeActive ? 'trauma-nudge-button' : ''}
            style={{ width: '100%', height: 72, borderRadius: 20, background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', color: '#fff', border: traumaNudgeActive ? '2px solid rgba(255,255,255,0.95)' : 'none', fontWeight: 950, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, fontSize: 22, boxShadow: traumaNudgeActive ? '0 0 0 8px rgba(56,189,248,0.18), 0 0 42px rgba(56,189,248,0.95), 0 16px 42px rgba(14,165,233,0.55)' : '0 8px 25px rgba(56, 189, 248, 0.3)', transform: traumaNudgeActive ? 'translateY(-4px)' : 'none' }}
          >
            <Camera size={28} /> 외상 촬영 및 AI 분석
          </button>
        </div>
      </aside>

      <style>{`
        @keyframes flowingLight { 0% { left: -100%; } 50% { left: 0%; } 100% { left: 100%; } }
        @keyframes thinkingBlueLight { 0% { right: -100%; opacity: 0.2; } 12% { opacity: 1; } 50% { opacity: 1; } 100% { right: 100%; opacity: 0.25; } }
        @keyframes borderRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes scanMoveInner { 0% { top: 0%; } 50% { top: 100%; } 100% { top: 0%; } }
        @keyframes scanMoveUhd { 0%, 100% { top: 6%; } 50% { top: 82%; } }
        @keyframes scannerSweepVertical { 0%, 100% { top: 5%; } 50% { top: 78%; } }
        @keyframes scannerBeamPulse { 0%, 100% { opacity: 0.55; filter: blur(0.2px); } 50% { opacity: 1; filter: blur(0.8px); } }
        @keyframes hudScan { 0% { transform: translateY(-8px); opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { transform: translateY(100vh); opacity: 0; } }
        @keyframes glowPulse { 0%, 100% { opacity: 0.7; filter: brightness(1); } 50% { opacity: 1; filter: brightness(1.35); } }
        @keyframes statusBlink { 0%, 100% { opacity: 0.35; transform: scale(0.86); } 50% { opacity: 1; transform: scale(1.18); } }
        @keyframes stepPulse { 0%, 100% { opacity: 0.72; transform: scale(0.96); } 50% { opacity: 1; transform: scale(1.08); } }
        @keyframes traumaNudgePulse {
          0%, 100% { transform: translateY(-4px) scale(1); filter: brightness(1); }
          50% { transform: translateY(-8px) scale(1.045); filter: brightness(1.18); }
        }
        @keyframes traumaNudgeGlow {
          0%, 100% { opacity: 0.45; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1.04); }
        }
        @keyframes traumaNudgeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        .trauma-nudge-wrap::before {
          content: '';
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 14px;
          height: 86px;
          border-radius: 26px;
          border: 2px solid rgba(125, 211, 252, 0.72);
          box-shadow: 0 0 34px rgba(56, 189, 248, 0.7);
          animation: traumaNudgeGlow 1.15s ease-in-out infinite;
          pointer-events: none;
        }
        .trauma-nudge-button {
          animation: traumaNudgePulse 1.05s ease-in-out infinite;
        }
        .trauma-nudge-callout {
          position: absolute;
          right: 28px;
          bottom: 108px;
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.98), rgba(34, 211, 238, 0.98));
          color: #00111f;
          padding: 14px 20px;
          border-radius: 18px;
          font-size: 18px;
          font-weight: 950;
          box-shadow: 0 18px 42px rgba(14,165,233,0.38);
          animation: traumaNudgeFloat 1.25s ease-in-out infinite;
          pointer-events: none;
          white-space: nowrap;
        }
        .trauma-nudge-callout::after {
          content: '';
          position: absolute;
          right: 34px;
          bottom: -10px;
          width: 20px;
          height: 20px;
          background: rgba(34, 211, 238, 0.98);
          transform: rotate(45deg);
        }
        input::placeholder { color: rgba(255, 255, 255, 0.2) !important; }
      `}</style>
    </div>
  )
}

function ProfileImage({ avatar }) {
  return (
    <div style={{ width: 110, height: 110, borderRadius: 24, background: '#1e293b', border: '3px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      <img
        src={resolveAvatarUrl(avatar)}
        onError={(event) => { event.currentTarget.src = resolveAvatarUrl(null) }}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        alt="Profile"
      />
    </div>
  )
}

function AiMessageRenderer({ text }) {
  if (!text) return null;
  const confMatch = text.match(/\[ACCURACY: (.*?)\]/);
  const evidenceMatch = text.match(/\[EVIDENCE: (.*?)\]/);
  const guideMatch = text.match(/\[GUIDE: (.*?)\]/);
  const confidence = confMatch ? confMatch[1] : null;
  const evidence = evidenceMatch ? evidenceMatch[1] : null;
  const guide = guideMatch ? guideMatch[1] : null;
  const cleanText = text.replace(/\[.*?\]/g, '').trim();

  const formattedText = cleanText.split('\n').map((line, i) => {
    if (line.includes(':')) {
      const [label, content] = line.split(':');
      return <div key={i}><span style={{ fontWeight: 900, color: '#fff' }}>{label}:</span>{content}</div>;
    }
    return <div key={i} style={{ marginBottom: 8 }}>{line}</div>;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ whiteSpace: 'pre-line', fontSize: 22 }}>{formattedText}</div>
      {(confidence || evidence || guide) && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {confidence && (
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px 20px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={18}/> AI 분석 정확도</span>
                <span style={{ fontSize: 20, fontWeight: 950, color: '#38bdf8' }}>{confidence}</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: confidence, height: '100%', background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)', borderRadius: 3 }} /></div>
            </div>
          )}
          {evidence && (
            <div style={{ background: 'rgba(56,189,248,0.08)', padding: '16px 20px', borderRadius: 14, border: '1px solid rgba(56,189,248,0.25)' }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#38bdf8', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}><Info size={18}/> AI 분석 판단 근거</div>
              <div style={{ fontSize: 18, color: '#fff', fontWeight: 600, lineHeight: 1.5 }}>{evidence}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}






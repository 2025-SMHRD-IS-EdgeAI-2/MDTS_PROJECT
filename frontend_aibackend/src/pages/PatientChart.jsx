import { useState, useEffect, useRef } from 'react'
import {
  HeartPulse, Activity, Stethoscope, Pill, Clock, Plus,
  ChevronDown, User, History, RotateCcw, AlertCircle,
  MapPin, Anchor, Phone, AlertTriangle, CheckCircle2,
  Sparkles, ShieldAlert, ShieldCheck, Info, Pencil, Zap,
  Camera, Droplets, FileText, ChevronRight, Trash2, Download
} from 'lucide-react'
import { useAlert } from '../utils/AlertContext'
import { fetchLatestVital, fetchPatientHistory, mapVitalToFrontend, savePatientHistory, updateVital } from '../utils/api'
import { resolveAvatarUrl } from '../utils/avatar'

// --- 컴포넌트 내부에서 사용되는 UI 조각들 ---

export default function PatientChart({ patient: initialPatient, onNavigate, onSwitchPatient }) {
  const { showAlert, showConfirm } = useAlert()
  const [selectedId, setSelectedId] = useState(initialPatient?.id)
  const [patient, setPatient] = useState(initialPatient)
  const [traumaImgError, setTraumaImgError] = useState(false)
  
  // 환자 변경 시 이미지 에러 상태 초기화
  useEffect(() => {
    setTraumaImgError(false)
  }, [patient])
  
  // ─── 상태 선언 (useEffect 보다 위로 이동하여 호이스팅 문제 해결) ───
  const [vitals, setVitals] = useState({ hr: '-', spo2: '-', temp: '-', bp: '-', rr: '-' })
  const [mainComplaint, setMainComplaint] = useState('')
  const [location, setLocation] = useState('')
  const [painAreas, setPainAreas] = useState([])
  const [selectedSymptoms, setSelectedSymptoms] = useState([])
  const [detailedNote, setDetailedNote] = useState('')
  const [selectedMeds, setSelectedMeds] = useState([])
  const [otherActions, setOtherActions] = useState('')
  const [showPlan, setShowPlan] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [occurrenceTime, setOccurrenceTime] = useState('오후 02:00')
  const [ampm, setAmpm] = useState('오후')
  const [hour, setHour] = useState('2')
  const [minute, setMinute] = useState('00')
  const [lastMealTime, setLastMealTime] = useState('기록 없음')
  const [viewMode, setViewMode] = useState('input') // 'input' | 'history'
  const [expandedRecord, setExpandedRecord] = useState(null)
  const [allRecords, setAllRecords] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [isSelectOpen, setIsSelectOpen] = useState(false)
  const [isDoctorOpen, setIsDoctorOpen] = useState(false)
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false)
  const [dynamicCrewList, setDynamicCrewList] = useState([])
  const selectRef = useRef(null)
  const doctorSelectRef = useRef(null)
  const timeModalRef = useRef(null)

  const [managers, setManagers] = useState(() => {
    try {
      const saved = localStorage.getItem('mdts_managers')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.length > 0) return parsed
      }
    } catch {}
    return [
      { id: 'S26-001', name: '이선장', role: '안전책임자', dept: '항해부' },
      { id: 'S26-003', name: '박기관', role: '의료담당자', dept: '기관부' },
    ]
  })

  const [selectedDoctor, setSelectedDoctor] = useState(() => {
    try {
      const saved = localStorage.getItem('mdts_managers')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.length > 0) return parsed[0]
      }
    } catch {}
    return { id: 'S26-003', name: '박기관', role: '의료담당자', dept: '기관부' }
  })

  const OTC_MEDS = [
    { id: 'm1', name: '타이레놀', purpose: '해열/진통' },
    { id: 'm2', name: '애드빌', purpose: '소염진통' },
    { id: 'm3', name: '항히스타민제', purpose: '알레르기/가려움' },
    { id: 'm4', name: '소화제', purpose: '소화불량' },
    { id: 'm5', name: '제산제', purpose: '속쓰림' },
    { id: 'm6', name: '지사제', purpose: '설사' },
    { id: 'm7', name: '압박붕대', purpose: '환부 고정' },
    { id: 'm8', name: '부목', purpose: '골절 의심' },
    { id: 'm9', name: '연고/소독액', purpose: '찰과상' }
  ]

  // 환자 리스트 로드 (집중 관리 중인 환자만)
  useEffect(() => {
    const savedCrew = JSON.parse(localStorage.getItem('mdts_crew_list') || '[]')
    const emergencyCrew = savedCrew.filter(c => c.isEmergency === true)
    const mergedCrew = initialPatient?.id && !emergencyCrew.some(c => c.id === initialPatient.id)
      ? [initialPatient, ...emergencyCrew]
      : emergencyCrew
    setDynamicCrewList(mergedCrew)
  }, [initialPatient?.id])

  useEffect(() => {
    if (!initialPatient?.id) return
    setSelectedId(initialPatient.id)
    setPatient(initialPatient)
  }, [initialPatient?.id])

  // 누적 기록 로드
  useEffect(() => {
    if (!patient?.id) {
      setAllRecords([])
      return
    }

    let cancelled = false
    const crewDbId = patient.crewDbId || parseInt(patient.id.split('-')[1])

    const load = async () => {
      try {
        const dbRecords = await fetchPatientHistory(crewDbId, 200)
        if (!cancelled && Array.isArray(dbRecords) && dbRecords.length > 0) {
          setAllRecords(dbRecords)
          return
        }
      } catch (error) {
        console.warn('DB patient history load failed:', error.message)
      }

      try {
        const records = JSON.parse(localStorage.getItem('mdts_patient_records') || '[]')
        if (!cancelled) setAllRecords(records.filter(r => r.patientId === patient?.id))
      } catch {
        if (!cancelled) setAllRecords([])
      }
    }

    load()
    const interval = setInterval(load, 2000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [patient?.id, patient?.crewDbId])

  // 환자 변경 시 데이터 동기화
  useEffect(() => {
    const p = dynamicCrewList.find(c => c.id === selectedId)
    if (p) {
      setPatient(p)
      onSwitchPatient?.(p)
      
      setVitals({ hr: '-', spo2: '-', temp: '-', bp: '-', rr: '-' });
      const crewDbId = p.crewDbId || parseInt(p.id.split('-')[1]);
      fetchLatestVital(crewDbId).then(data => {
        if (data) setVitals(mapVitalToFrontend(data));
      }).catch(() => {});

      // 기존 선택값 초기화
      setMainComplaint('')
      setLocation('')
      setPainAreas([])
      setSelectedSymptoms([])
      setDetailedNote('')
      setSelectedMeds([])
      setOtherActions('')
      setLastMealTime('기록 없음')
      setShowPlan(false)
      setViewMode('input')
      setExpandedRecord(null)
    }
  }, [selectedId, dynamicCrewList])

  // 실시간 센서 데이터: PyQt5 센서 서버 우선, 없으면 DB 최신값으로 대체
  useEffect(() => {
    if (!patient) return;
    let interval;

    const crewDbId = patient.crewDbId || parseInt(patient.id.split('-')[1]);
    const pollVitals = async () => {
      try {
        const data = await fetchLatestVital(crewDbId);
        if (data) setVitals(mapVitalToFrontend(data));
      } catch {}
    };
    pollVitals();
    interval = setInterval(pollVitals, 2000);
    return () => clearInterval(interval);
  }, [patient?.id]);

  const openEdit = (target, currentVal) => {
    setEditTarget(target)
    setEditValue(currentVal.toString().split(' ')[0])
  }

  const saveEdit = () => {
    const val = editValue.trim()
    if (!val) return
    if (editTarget === 'bp') {
      const parts = val.split('/')
      if (parts.length !== 2 || isNaN(parseInt(parts[0])) || isNaN(parseInt(parts[1]))) {
        showAlert('혈압 형식이 올바르지 않습니다. 예: 120/80', '입력 오류', 'warning')
        return
      }
      setVitals(prev => ({ ...prev, bp: val }))
      // 박기관 제외: 서버 DB에도 저장
      if (patient.id !== 'S26-003') {
        const crewDbId = patient.crewDbId || parseInt(patient.id.split('-')[1]);
        updateVital(crewDbId, { blood_pressure: val }).catch(() => {});
      }
    } else if (editTarget === 'temp') {
      if (isNaN(parseFloat(val))) { showAlert('숫자를 입력하세요.', '입력 오류', 'warning'); return }
      setVitals(prev => ({ ...prev, temp: val }))
      // 박기관 제외: 서버 DB에도 저장
      if (patient.id !== 'S26-003') {
        const crewDbId = patient.crewDbId || parseInt(patient.id.split('-')[1]);
        updateVital(crewDbId, { temperature: parseFloat(val) }).catch(() => {});
      }
    }
    setEditTarget(null)
    setShowPlan(false)
  }

  useEffect(() => {
    setOccurrenceTime(`${ampm} ${hour}:${minute}`)
  }, [ampm, hour, minute])

  const setNowTime = () => {
    const now = new Date()
    const h = now.getHours()
    const m = now.getMinutes()
    setAmpm(h >= 12 ? '오후' : '오전')
    setHour(String(h % 12 || 12))
    setMinute(String(Math.round(m / 10) * 10).padStart(2, '0').replace('60', '50'))
    setShowPlan(false)
  }

  const toggleSymptom = (s) => {
    setShowPlan(false)
    const isSelecting = !selectedSymptoms.includes(s)
    setSelectedSymptoms(isSelecting ? [...selectedSymptoms, s] : selectedSymptoms.filter(item => item !== s))
    if (isSelecting) setDetailedNote(prev => prev ? `${prev}, ${s}` : s)
    else setDetailedNote(prev => prev.replace(new RegExp(`, ${s}|${s}, |${s}`, 'g'), '').trim().replace(/^,|,$/g, ''))
  }

  const handlePainAreaClick = (area) => {
    setShowPlan(false)
    const isSelecting = !painAreas.includes(area)
    const newAreas = isSelecting ? [...painAreas, area] : painAreas.filter(a => a !== area)
    setPainAreas(newAreas)
    const areaText = `${area} 통증`
    if (isSelecting) setDetailedNote(prev => prev ? `${areaText}, ${prev}` : areaText)
    else setDetailedNote(prev => prev.replace(new RegExp(`, ${areaText}|${areaText}, |${areaText}`, 'g'), '').trim().replace(/^,|,$/g, ''))
  }

  const toggleMed = (medName) => {
    if (medName === '항히스타민제') {
      showAlert("항히스타민제는 졸음을 유발할 수 있으니 작업 전 주의하세요.", "복약 주의", "warning");
    } else if (medName === '연고/소독액') {
      showAlert("개방된 큰 상처에는 직접 붓지 마세요.", "사용 가이드", "info");
    }

    if (selectedMeds.includes(medName)) {
      setSelectedMeds(selectedMeds.filter(m => m !== medName));
      setOtherActions(prev => prev.replace(new RegExp(`, ${medName}|${medName}, |${medName}`, 'g'), '').trim().replace(/^,|,$/g, ''));
    } else {
      setSelectedMeds([...selectedMeds, medName]);
      const prefix = medName.includes('붕대') || medName.includes('부목') ? '조치' : '투약';
      const actionText = `${medName}(${prefix})`;
      setOtherActions(prev => prev ? `${prev}, ${actionText}` : actionText);
    }
  }

  const buildPatientChartTimelineDetail = (record) => {
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

    return [
      `• 대상자: ${record.patientName || '-'}`,
      `• 사고/증상 시각: ${record.occurrenceTime || '미기록'}`,
      `• 사고 장소: ${locationText}`,
      `• 최종 취식 시각: ${lastMealText}`,
      `• 상세 증상: ${detailedText}`,
      `• 통증 부위: ${painAreaList}`,
      `• 관찰 증상: ${symptomList}`,
    ].join('\n')
  }

  const queuePatientChartTimelineEvent = (record) => {
    try {
      window.sessionStorage.setItem('mdts_pending_main_timeline_event', JSON.stringify({
        id: `patient-chart-${Date.now()}`,
        timestamp: record.timestamp,
        title: '환자 차트 상태 기록 저장',
        detail: buildPatientChartTimelineDetail(record),
        color: record.isEmergency ? '#f43f5e' : '#38bdf8',
      }))
    } catch (error) {
      console.warn('Patient chart timeline handoff failed:', error.message)
    }
  }

  const handleSave = async () => {
    if (!patient || isSaving) return

    const isEmergency = selectedSymptoms.some(s => s.includes('위험') || s.includes('응급'))
    const chartRecord = {
      patientId: patient.id,
      patientName: patient.name,
      crewId: patient.crewDbId,
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      timestamp: new Date().toISOString(),
      occurrenceTime: occurrenceTime,
      lastMealTime: lastMealTime,
      vitals: { ...vitals },
      mainComplaint: mainComplaint,
      location: location,
      painAreas: painAreas,
      selectedSymptoms: selectedSymptoms,
      detailedNote: detailedNote,
      prescribedMeds: selectedMeds,
      otherActions: otherActions,
      diagnosis: selectedSymptoms[0] || mainComplaint || '경과 관찰 중',
      aiBriefing: aiResult.briefing,
      treatmentGuide: aiResult.guide,
      recommendedMeds: aiResult.meds,
      isEmergency: isEmergency
    }

    const persistLocalRecord = (record) => {
      try {
        const existingRecords = JSON.parse(localStorage.getItem('mdts_patient_records') || '[]')
        const updatedRecords = [record, ...existingRecords]
        localStorage.setItem('mdts_patient_records', JSON.stringify(updatedRecords))
        setAllRecords(updatedRecords.filter(r => r.patientId === patient?.id))

        const crewStatus = JSON.parse(localStorage.getItem('mdts_crew_status') || '{}')
        crewStatus[patient.id] = {
          lastVisit: new Date().toLocaleDateString(),
          currentStatus: selectedSymptoms[0] || '경과 관찰 중',
          isEmergency: record.isEmergency
        }
        localStorage.setItem('mdts_crew_status', JSON.stringify(crewStatus))
      } catch (error) {
        console.warn('Local history persistence failed:', error.message)
      }
    }

    if (!navigator.onLine) {
      persistLocalRecord(chartRecord)
      showAlert(
        `현재 시스템이 오프라인 상태입니다.\nDB 저장은 수행되지 않았고 브라우저 임시 저장소에만 보관되었습니다.`,
        "[오프라인 : DB 저장 보류]",
        "warning"
      )
      return
    }

    setIsSaving(true)
    try {
      const dbResult = await savePatientHistory(chartRecord)
      const savedRecord = { ...chartRecord, dbHistoryId: dbResult?.history_id || null }
      persistLocalRecord(savedRecord)
      queuePatientChartTimelineEvent(savedRecord)
      showAlert(`환자 : ${patient.name}\n선택 항목이 DB에 저장되었습니다.`, "[최종 기록 저장 완료]", "success")
      onNavigate?.('main', { historicalRecord: savedRecord })
    } catch (error) {
      persistLocalRecord(chartRecord)
      console.error('DB 저장 실패:', error)
      showAlert(
        `DB 저장 중 오류가 발생했습니다.\n브라우저 임시 저장소에는 보관되었지만 메인 페이지 이동은 중단되었습니다.\n\n${error.message}`,
        'DB 저장 실패',
        'danger'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const getAIDiagnosis = () => {
    const allKey = [...selectedSymptoms, ...painAreas]
    if (allKey.length === 0) return { 
      briefing: "증상을 선택하면 AI 응급처치 가이드가 생성됩니다.", 
      guide: ["활력 징후 모니터링", "환자 안정 유지"], 
      meds: ["상비약 확인"] 
    }

    let briefing = "입력된 데이터를 바탕으로 분석 중입니다. 활력 징후를 지속적으로 모니터링하십시오."
    let guide = ["환자를 편안한 자세로 안정", "추가 증상 발생 시 즉시 보고", "원격 의료진 연결 대기"]
    let meds = ["해열·진통·소염제"]

    if (allKey.some(s => s.includes('머리') || s.includes('두통') || s.includes('얼굴'))) {
      briefing = "두부 통증 및 관련 증상은 뇌압 변화 또는 신경계 피로일 수 있습니다. 의식 상태 변화를 주의 깊게 살피십시오."
      guide = ["조명을 어둡게 하고 조용한 환경에서 절대 안정", "머리를 30도 정도 높게 유지하여 뇌압 상승 방지", "말이 어눌해지거나 팔다리 힘 빠짐이 있는지 10분 간격 확인", "자극적인 음식이나 카페인 섭취 금지"]
      meds = ["타이레놀(아세트아미노펜)", "진통제"]
    } else if (allKey.some(s => s.includes('복부') || s.includes('구토') || s.includes('설사'))) {
      briefing = "급성 위장염 또는 식중독 의심 증상입니다. 탈수 방지와 복부 압박 완화가 우선입니다."
      guide = ["증상 호전 시까지 음식 섭취를 제한(금식 권장)", "미지근한 물 또는 이온음료를 소량씩 자주 섭취", "복부를 따뜻하게 유지하고 왼쪽으로 눕혀 가스 배출 유도", "심한 통증 시 복부를 누르지 말고 구부린 자세 유지"]
      meds = ["소화제", "제산제", "지사제(설사 시)"]
    } else if (allKey.some(s => s.includes('발열') || s.includes('감기') || s.includes('목'))) {
      briefing = "감염성 질환으로 인한 고열 및 전신 증상입니다. 체온 조절과 교차 감염 예방이 필요합니다."
      guide = ["실내 온도를 20-22도로 유지하고 가습기 사용", "미온수를 적신 수건으로 겨드랑이, 사타구니를 닦아 체온 하강 유도", "충분한 수분 보충과 함께 고단백 위주의 가벼운 식사", "다른 선원들과의 접촉을 피하고 마스크 착용"]
      meds = ["해열진통제", "종합감기약", "기침/콧물약"]
    } else if (allKey.some(s => s.includes('어깨') || s.includes('다리') || s.includes('무릎') || s.includes('허리') || s.includes('손목') || s.includes('팔'))) {
      briefing = "근골격계 손상 또는 염좌가 의심됩니다. 추가 손상 방지를 위한 RICE 원칙을 적용하십시오."
      guide = ["Rest(안정) : 환부를 움직이지 않게 고정 및 휴식", "Ice(냉찜질) : 15분 간격으로 냉찜질 시행 (부종/통증 완화)", "Compression(압박) : 압박 붕대로 환부를 적당한 강도로 고정", "Elevation(거상) : 환부를 심장보다 높게 유지하여 부종 감소"]
      meds = ["파스/근육통약", "소염진통제", "연고/소독액"]
    } else if (allKey.some(s => s.includes('발진') || s.includes('가려움') || s.includes('피부'))) {
      briefing = "알레르기 반응 또는 접촉성 피부염입니다. 원인 물질 차단과 환부 자극 최소화가 중요합니다."
      guide = ["환부를 긁지 않도록 주의 (2차 감염 방지)", "비누 없이 미온수로 가볍게 씻어내고 물기만 제거", "증상 부위에 차가운 수건을 대어 가려움증 완화", "호흡 곤란이나 입술 부어오름 발생 시 즉시 응급 보고"]
      meds = ["항히스타민제", "스테로이드 연고"]
    } else if (allKey.some(s => s.includes('흉통') || s.includes('가슴') || s.includes('호흡'))) {
      briefing = "흉부 통증 및 호흡 곤란은 심폐기관의 이상 징후일 수 있습니다. 즉각적인 의료진 연결이 필수입니다."
      guide = ["상의 단추나 벨트를 풀고 호흡이 편한 자세(반좌위) 유지", "지속적으로 의식을 확인하고 말을 시키지 않음", "주변에 AED(자동심장충격기) 위치 확인 및 비치", "산소 공급이 가능할 경우 저농도 산소 투여 검토"]
      meds = ["의사 지시 전 약물 투여 금지"]
    }

    return { briefing, guide, meds }
  }

  const aiResult = getAIDiagnosis()

  useEffect(() => {
    function handleClickOutside(e) {
      if (selectRef.current && !selectRef.current.contains(e.target)) setIsSelectOpen(false)
      if (doctorSelectRef.current && !doctorSelectRef.current.contains(e.target)) setIsDoctorOpen(false)
      if (isTimeModalOpen && timeModalRef.current && !timeModalRef.current.contains(e.target)) {
          setIsTimeModalOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isTimeModalOpen])

  const getVitalStatus = (type, value) => {
    const waiting = { label: '측정대기', color: '#64748b', bg: 'rgba(100,116,139,0.12)' }
    const normal = { label: '정상', color: '#26de81', bg: 'rgba(38,222,129,0.15)' }
    const observe = { label: '관찰', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' }
    const caution = { label: '주의', color: '#fb923c', bg: 'rgba(251,146,60,0.17)' }
    const danger = { label: '위험', color: '#ff4d6d', bg: 'rgba(255,77,109,0.18)' }

    const text = String(value ?? '').trim()
    if (!text || text === '-' || text === '--' || text === '미측정') return waiting

    if (type === 'bp') {
      const parts = text.replace(/\s/g, '').split('/')
      if (parts.length !== 2) return waiting
      const sys = Number(parts[0])
      const dia = Number(parts[1])
      if (!Number.isFinite(sys) || !Number.isFinite(dia) || sys <= 0 || dia <= 0) return waiting
      if (sys >= 160 || dia >= 100 || sys < 80 || dia < 50) return danger
      if (sys >= 140 || dia >= 90 || sys < 90 || dia < 60) return caution
      if (sys >= 130 || dia >= 85) return observe
      return normal
    }

    const val = Number(text.replace(/[^0-9.\-]/g, ''))
    if (!Number.isFinite(val) || val <= 0) return waiting

    if (type === 'hr') {
      if (val >= 130 || val <= 40) return danger
      if (val >= 110 || val <= 50) return caution
      if (val >= 101 || val <= 59) return observe
      return normal
    }

    if (type === 'spo2') {
      if (val > 100 || val < 90) return danger
      if (val <= 92) return caution
      if (val <= 94) return observe
      return normal
    }

    if (type === 'rr') {
      if (val > 30 || val < 8) return danger
      if (val >= 25 || val <= 9) return caution
      if (val >= 21 || val <= 11) return observe
      return normal
    }

    if (type === 'temp') {
      if (val >= 39.0 || val < 35.0) return danger
      if (val >= 38.0 || val < 35.5) return caution
      if (val >= 37.6 || val < 36.0) return observe
      return normal
    }

    return waiting
  }

  // 과거력: pastHistory(선원관리) → history 순으로 fallback
  const displayHistory = patient?.pastHistory || patient?.history || patient?.chronic || '기록 없음'

  // 최근 진료 이력: localStorage 기록 우선, 없으면 note 기반 표시
  const displayRecentHistory = (() => {
    try {
      const records = JSON.parse(localStorage.getItem('mdts_patient_records') || '[]')
      const mine = records.filter(r => r.patientId === patient?.id)
      if (mine.length > 0) {
        const last = mine[0] // 최신 기록이 배열 맨 앞에 오도록 함 (handleSave 로직상)
        return {
          date: new Date(last.timestamp).toLocaleDateString('ko-KR'),
          title: last.mainComplaint || (Array.isArray(last.selectedSymptoms) && last.selectedSymptoms.length ? last.selectedSymptoms.join(', ') : '진료 기록'),
          detail: `• 증상: ${(last.selectedSymptoms || []).join(', ') || '없음'}\n• 처치: ${(last.prescribedMeds || []).join(', ') || '없음'}\n• 특이: ${last.otherActions || '없음'}`,
          fullRecord: last
        }
      }
    } catch {}
    if (patient?.note && patient.note !== '특이사항 없음') {
      return { date: patient?.boardingDate || '-', title: '특이사항', detail: patient.note }
    }
    return { date: '기록 없음', title: '-', detail: '-' }
  })()

  // 알레르기: allergies 필드 직접 매핑
  const displayAllergies = patient?.allergies || '없음'

  // 복용 약물: lastMed(선원관리) → meds 배열 순으로 fallback
  const displayMeds = (() => {
    if (patient?.meds?.length > 0) return patient.meds
    if (patient?.lastMed && patient.lastMed !== '없음') {
      return patient.lastMed.split(',').map(m => ({ name: m.trim(), purpose: '처방약' }))
    }
    return []
  })()

  // 작업 위치: location(선원관리) 직접 매핑
  const displayWorkLocation = patient?.location || patient?.workLocation || '미지정'

  // 비상 연락망: PROTECTOR_MAP 기반 강제 매핑 및 파싱 (DashboardView와 동일하게)
  const displayEmergency = (() => {
    let display = { name: '미지정', phone: '-', relation: '-' };
    const PROTECTOR_MAP = {
      'S26-001': '김도윤', 'S26-002': '김도장', 'S26-003': '양정희', 'S26-004': '박지호',
      'S26-005': '정민준', 'S26-006': '정하윤', 'S26-007': '강준우', 'S26-008': '조예은',
      'S26-009': '임도현', 'S26-010': '장수빈', 'S26-011': '황지훈', 'S26-012': '한지민',
      'S26-013': '오세현', 'S26-014': '나혜지', 'S26-015': '송다희', 'S26-016': '김한혜'
    };
    const forcedName = PROTECTOR_MAP[patient?.id];
    
    if (patient?.emergencyName || forcedName) {
      display.name = forcedName || patient.emergencyName;
      if (patient?.emergency && typeof patient.emergency === 'string') {
        const parts = patient.emergency.split(' ');
        display.phone = parts[0] || '-';
        display.relation = parts[1] ? parts[1].replace(/[()]/g, '') : '가족';
      }
      return display;
    }
    return display;
  })()

  const exportPatientHistoryToExcel = () => {
    if (!Array.isArray(allRecords) || allRecords.length === 0) {
      showAlert('내보낼 지난 기록이 없습니다.', '엑셀 내보내기', 'warning')
      return
    }

    const escapeHtml = (value) => String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')

    const listText = (value) => {
      if (Array.isArray(value)) return value.filter(Boolean).join(', ')
      if (value === undefined || value === null) return ''
      return String(value)
    }

    const safeCell = (value) => {
      const text = listText(value)
      const protectedText = /^[=+\-@]/.test(text.trim()) ? `'${text}` : text
      return escapeHtml(protectedText)
    }

    const formatDateTime = (value) => {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleString('ko-KR', { hour12: false })
    }

    const rows = allRecords.map((record, index) => ({
      no: index + 1,
      savedAt: formatDateTime(record.timestamp),
      patientId: record.patientId || patient?.id || '',
      patientName: record.patientName || patient?.name || '',
      crewId: record.crewId || patient?.crewDbId || '',
      doctorName: record.doctorName || '',
      emergency: record.isEmergency ? '응급' : '일반',
      occurrenceTime: record.occurrenceTime || '',
      location: record.location || '',
      mainComplaint: record.mainComplaint || (Array.isArray(record.selectedSymptoms) && record.selectedSymptoms.length ? record.selectedSymptoms.join(', ') : record.diagnosis || ''),
      diagnosis: record.diagnosis || '',
      symptoms: record.selectedSymptoms,
      painAreas: record.painAreas,
      treatmentGuide: record.treatmentGuide,
      recommendedMeds: record.recommendedMeds,
      prescribedMeds: record.prescribedMeds,
      otherActions: record.otherActions || '',
      detailedNote: record.detailedNote || '',
      heartRate: record.vitals?.hr ?? '',
      spo2: record.vitals?.spo2 ?? '',
      respirationRate: record.vitals?.rr ?? '',
      bloodPressure: record.vitals?.bp ?? '',
      temperature: record.vitals?.temp ?? '',
    }))

    const headers = [
      ['no', '번호'],
      ['savedAt', '기록 저장 시각'],
      ['patientId', '환자 ID'],
      ['patientName', '환자명'],
      ['crewId', 'DB crew_id'],
      ['doctorName', '담당자'],
      ['emergency', '응급 여부'],
      ['occurrenceTime', '증상 발현 시각'],
      ['location', '사고 장소'],
      ['mainComplaint', '주요 증상'],
      ['diagnosis', '진단/분류'],
      ['symptoms', '선택 증상'],
      ['painAreas', '통증/외상 부위'],
      ['treatmentGuide', '처치 가이드'],
      ['recommendedMeds', '권고 사항'],
      ['prescribedMeds', '수행 조치'],
      ['otherActions', '기타 조치'],
      ['detailedNote', '상세 기록'],
      ['heartRate', '심박수'],
      ['spo2', '산소포화도'],
      ['respirationRate', '호흡수'],
      ['bloodPressure', '혈압'],
      ['temperature', '체온'],
    ]

    const tableHead = headers.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join('')
    const tableRows = rows.map(row => (
      `<tr>${headers.map(([key]) => `<td style="mso-number-format:'\\@';">${safeCell(row[key])}</td>`).join('')}</tr>`
    )).join('')
    const generatedAt = new Date().toLocaleString('ko-KR', { hour12: false })
    const sheetTitle = `${patient?.name || '환자'} 지난 기록`
    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            table { border-collapse: collapse; font-family: Malgun Gothic, Arial, sans-serif; }
            th { background: #0f172a; color: #ffffff; border: 1px solid #334155; padding: 8px; font-weight: 700; }
            td { border: 1px solid #cbd5e1; padding: 8px; white-space: pre-wrap; vertical-align: top; }
            .meta { font-weight: 700; background: #e0f2fe; }
          </style>
        </head>
        <body>
          <table>
            <tr><td class="meta" colspan="${headers.length}">${escapeHtml(sheetTitle)}</td></tr>
            <tr><td class="meta" colspan="${headers.length}">생성 시각: ${escapeHtml(generatedAt)} / 총 ${rows.length}건</td></tr>
            <tr>${tableHead}</tr>
            ${tableRows}
          </table>
        </body>
      </html>
    `

    const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const safeName = String(patient?.name || 'patient').replace(/[\\/:*?"<>|]/g, '_')
    const dateKey = new Date().toISOString().slice(0, 10)
    const link = document.createElement('a')
    link.href = url
    link.download = `${safeName}_patient_history_${dateKey}.xls`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showAlert(`${patient?.name || '환자'} 지난 기록 ${rows.length}건을 엑셀 파일로 내보냈습니다.`, '엑셀 내보내기 완료', 'success')
  }

  return (
    <div style={{ padding: '0', height: 'calc(100vh - 72px)', overflow: 'hidden', background: '#020617', color: '#fff', fontFamily: '"Pretendard", sans-serif' }}>
      
      {isTimeModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div ref={timeModalRef} style={{ background: '#0f172a', border: '1.5px solid rgba(56,189,248,0.3)', borderRadius: '32px', padding: '40px', width: '560px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '24px', fontWeight: 900, marginBottom: '30px', textAlign: 'center', color: '#38bdf8' }}>증상이 나타난 시각 선택</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                {['오전', '오후'].map(a => (
                  <button key={a} onClick={() => setAmpm(a)} style={{ flex: 1, padding: '15px', borderRadius: 16, background: ampm === a ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${ampm === a ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`, color: ampm === a ? '#38bdf8' : '#fff', fontSize: '20px', fontWeight: 800, cursor: 'pointer' }}>{a}</button>
                ))}
              </div>
              <div>
                <div style={{ fontSize: '16px', color: '#64748b', fontWeight: 800, marginBottom: 12 }}>시간 (시)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {Array.from({length: 12}, (_, i) => String(i + 1)).map(h => (
                    <button key={h} onClick={() => setHour(h)} style={{ padding: '12px 0', borderRadius: 12, background: hour === h ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${hour === h ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`, color: hour === h ? '#38bdf8' : '#fff', fontSize: '18px', fontWeight: 800, cursor: 'pointer' }}>{h}시</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '16px', color: '#64748b', fontWeight: 800, marginBottom: 12 }}>분 (10분 단위)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {['00', '10', '20', '30', '40', '50'].map(m => (
                    <button key={m} onClick={() => setMinute(m)} style={{ padding: '12px 0', borderRadius: 12, background: minute === m ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${minute === m ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`, color: minute === m ? '#38bdf8' : '#fff', fontSize: '18px', fontWeight: 800, cursor: 'pointer' }}>{m}분</button>
                  ))}
                </div>
              </div>
              <button onClick={() => setIsTimeModalOpen(false)} style={{ marginTop: '10px', padding: '20px', borderRadius: 18, background: '#38bdf8', color: '#0f172a', border: 'none', fontSize: '22px', fontWeight: 950, cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(56,189,248,0.4)' }}>선택 완료</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 100, background: 'rgba(7, 15, 30, 0.98)', backdropFilter: 'blur(15px)', borderBottom: '1.5px solid rgba(255,255,255,0.1)', padding: '16px 60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
          <div ref={selectRef} style={{ position: 'relative', width: '360px' }}>
            <div onClick={() => setIsSelectOpen(!isSelectOpen)} style={{ background: 'rgba(56,189,248,0.05)', border: `2px solid ${isSelectOpen ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`, borderRadius: '16px', color: '#fff', padding: '12px 20px', fontSize: '22px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: '0.3s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><User size={24} color="#38bdf8" /><span>{patient.name} ({patient.role})</span></div>
              <ChevronDown size={24} style={{ transform: isSelectOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s', color: '#38bdf8' }} />
            </div>
            {isSelectOpen && (
              <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(56,189,248,0.3)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', zIndex: 1000, maxHeight: 300, overflowY: 'auto' }}>
                {dynamicCrewList.length === 0 ? (
                  <div style={{ padding: '16px 20px', fontSize: '18px', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>집중 관리 중인 환자 없음</div>
                ) : dynamicCrewList.map(c => (
                  <div key={c.id} onClick={() => { setSelectedId(c.id); setIsSelectOpen(false); }} style={{ padding: '16px 20px', fontSize: '20px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: selectedId === c.id ? 'rgba(56,189,248,0.2)' : 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff4d6d', flexShrink: 0 }} />{c.name} ({c.role})</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 950, color: '#38bdf8' }}>환자 상태 관리 일지</div>
          {/* 탭 전환 */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 4, gap: 4 }}>
            {[{ key: 'input', label: '상태 작성하기', icon: <Pencil size={16}/> }, { key: 'history', label: `지난 기록 보기 (${allRecords.length})`, icon: <History size={16}/> }].map(tab => (
              <button key={tab.key} onClick={() => { setViewMode(tab.key); setExpandedRecord(null); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 800, transition: '0.2s', background: viewMode === tab.key ? '#38bdf8' : 'transparent', color: viewMode === tab.key ? '#000' : '#64748b' }}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div ref={doctorSelectRef} style={{ position: 'relative' }}>
                    <div onClick={() => setIsDoctorOpen(!isDoctorOpen)} style={{ background: 'rgba(255,255,255,0.04)', border: `1.5px solid ${isDoctorOpen ? '#38bdf8' : 'rgba(255,255,255,0.15)'}`, borderRadius: '12px', padding: '10px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: '0.2s' }}>
                        <span style={{ fontSize: '22px', color: '#fff', fontWeight: 900 }}>담당 : {selectedDoctor.name}</span>
                        <ChevronDown size={18} style={{ transform: isDoctorOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s', color: '#64748b' }} />
                    </div>
                    {isDoctorOpen && (
                        <div style={{ position: 'absolute', top: '105%', right: 0, width: '220px', background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(15px)', border: '1.2px solid rgba(56,189,248,0.3)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 25px rgba(0,0,0,0.6)', zIndex: 1001, padding: '6px 0' }}>
                            {managers.map(d => (
                                <div key={d.id} onClick={() => { setSelectedDoctor(d); setIsDoctorOpen(false); }} style={{ padding: '10px 18px', fontSize: '19px', fontWeight: 700, cursor: 'pointer', background: selectedDoctor.id === d.id ? 'rgba(56,189,248,0.15)' : 'transparent', color: selectedDoctor.id === d.id ? '#38bdf8' : '#fff', transition: '0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>{d.name}</span>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 800, background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 5 }}>{d.role.substring(0,3)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 0, height: 'calc(100% - 82px)' }}>
        <aside style={{ borderRight: '1px solid rgba(255,255,255,0.05)', background: '#05070a', display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0 }}>
          <div style={{ flexShrink: 0, padding: '24px 28px 20px 28px', borderBottom: '1px solid rgba(56,189,248,0.1)', background: 'rgba(56,189,248,0.03)' }}>
            <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
              <div style={{ width: 110, height: 110, borderRadius: 24, background: '#1e293b', border: '3px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
              <img
                src={resolveAvatarUrl(patient?.avatar)}
                onError={(event) => { event.currentTarget.src = resolveAvatarUrl(null) }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt="Patient Profile"
              />
            </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
                  <div style={{ fontSize: 36, fontWeight: 950, letterSpacing: '-0.5px', color: '#fff' }}>{patient?.name || '-'}</div>
                  <div style={{ fontSize: 20, color: '#38bdf8', fontWeight: 800 }}>{patient?.role || '-'}</div>
                </div>
                <div style={{ fontSize: 16, color: '#475569', fontWeight: 700 }}>ID : {patient?.id || '-'}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              <InfoItem label="나이/성별" value={`${patient?.age ?? '-'}세 / ${patient?.gender || '-'}`} size="xl_ultra" />
              <InfoItem label="혈액형" value={patient?.blood ? `${patient.blood}형` : '-'} size="xl_ultra" />
              <InfoItem label="신장" value={patient?.height ? `${patient.height} cm` : '-'} size="xl_ultra" />
              <InfoItem label="몸무게" value={patient?.weight ? `${patient.weight} kg` : '-'} size="xl_ultra" />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '28px 28px 120px 28px', scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#38bdf8', fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
                <History size={20}/> 과거력
              </div>
              <div style={{ fontSize: 19, fontWeight: 750, color: '#e2e8f0', lineHeight: 1.6, background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                {displayHistory.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#00d2ff', fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
                <RotateCcw size={20}/> 최근 진료 이력
              </div>
              <div onClick={() => {
                if (displayRecentHistory.fullRecord) {
                  onNavigate?.('main', { historicalRecord: displayRecentHistory.fullRecord })
                }
              }} style={{ 
                cursor: displayRecentHistory.fullRecord ? 'pointer' : 'default',
                background: 'rgba(0, 210, 255, 0.04)', 
                borderRadius: 16, 
                padding: '20px', 
                border: '1px solid rgba(0, 210, 255, 0.15)',
                transition: '0.2s',
              }}
              onMouseOver={e => { if(displayRecentHistory.fullRecord) e.currentTarget.style.background = 'rgba(0, 210, 255, 0.1)' }}
              onMouseOut={e => { if(displayRecentHistory.fullRecord) e.currentTarget.style.background = 'rgba(0, 210, 255, 0.04)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 17, fontWeight: 850, color: '#00d2ff' }}>{displayRecentHistory.date}</span>
                  <span style={{ fontSize: 15, color: '#4a6080', fontWeight: 700 }}>{displayRecentHistory.title}</span>
                </div>
                <div style={{ fontSize: 16, color: '#8da2c0', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {displayRecentHistory.detail}
                </div>
                {displayRecentHistory.fullRecord && (
                  <div style={{ marginTop: 12, textAlign: 'right', fontSize: 13, color: '#38bdf8', fontWeight: 800 }}>
                    상세 기록보기 (클릭 시 메인 대시보드로 이동) →
                  </div>
                )}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#f43f5e', fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
                <AlertCircle size={20}/> 알레르기 / 주의사항
              </div>
              <div style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {displayAllergies.split(',').map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f43f5e' }} />
                    <span style={{ fontSize: 17, fontWeight: 750, color: '#fda4af' }}>{a.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fb923c', fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
                <Pill size={20}/> 복용 중인 약물
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {displayMeds.length > 0 ? displayMeds.map((drug, i) => (
                  <div key={i} style={{ background: 'rgba(251,146,60,0.05)', border: '1px solid rgba(251,146,60,0.15)', borderRadius: 14, padding: '14px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 17, fontWeight: 850, color: '#fed7aa' }}>{drug.name}</span>
                      <span style={{ fontSize: 14, color: '#fb923c', fontWeight: 800 }}>{drug.purpose}</span>
                    </div>
                  </div>
                )) : (
                    <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', color: '#64748b', fontSize: 16, fontWeight: 700 }}>복용 중인 약물 없음</div>
                )}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#26de81', fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
                <Phone size={20}/> 비상 연락망
              </div>
              <div style={{ background: 'rgba(38,222,129,0.06)', border: '1px solid rgba(38,222,129,0.2)', borderRadius: 16, padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 18, fontWeight: 850, color: '#fff' }}>{displayEmergency.name}</span>
                  <span style={{ fontSize: 14, padding: '4px 10px', borderRadius: 8, background: 'rgba(38,222,129,0.15)', color: '#26de81', fontWeight: 800 }}>{displayEmergency.relation}</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#26de81', letterSpacing: '0.5px' }}>
                  {displayEmergency.phone}
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 28px 24px 28px', borderTop: '1px solid rgba(255,77,109,0.2)', background: 'linear-gradient(to top, #05070a 85%, transparent)', zIndex: 10 }}>
            <button onClick={(e) => { e.stopPropagation(); showConfirm('응급 상황을 선포하고 처치 가이드 화면으로 이동하시겠습니까?', () => onNavigate?.('emergency'), '응급 상황 선포', 'danger') }} style={{ width: '100%', height: 72, borderRadius: 20, background: '#f43f5e', color: '#fff', border: 'none', fontWeight: 950, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, fontSize: 22, boxShadow: '0 8px 25px rgba(244, 63, 94, 0.3)' }}>
              <AlertTriangle size={28} /> 응급 처치 액션 시작
            </button>
          </div>
        </aside>

        <div className="chart-scroll-container" style={{ display: 'flex', flexDirection: 'column', gap: 35, padding: '40px 60px', overflowY: 'auto' }}>

          {/* ── 지난 기록 보기 뷰 ── */}
          {viewMode === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 32, fontWeight: 950, color: '#fff' }}>
                  전체 기록 목록 <span style={{ fontSize: 24, color: '#475569', fontWeight: 700 }}>— {patient?.name} 총 {allRecords.length}건</span>
                </div>
                <button
                  onClick={exportPatientHistoryToExcel}
                  disabled={allRecords.length === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '14px 22px',
                    borderRadius: 14,
                    border: allRecords.length === 0 ? '1px solid rgba(100,116,139,0.25)' : '1px solid rgba(56,189,248,0.35)',
                    background: allRecords.length === 0 ? 'rgba(100,116,139,0.08)' : 'linear-gradient(135deg, rgba(56,189,248,0.18), rgba(14,165,233,0.28))',
                    color: allRecords.length === 0 ? '#475569' : '#e0f2fe',
                    fontSize: 18,
                    fontWeight: 900,
                    cursor: allRecords.length === 0 ? 'not-allowed' : 'pointer',
                    boxShadow: allRecords.length === 0 ? 'none' : '0 10px 24px rgba(14,165,233,0.18)'
                  }}
                >
                  <Download size={20} />
                  엑셀로 내보내기
                </button>
              </div>

              {allRecords.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
                  <FileText size={72} color="#1e293b" />
                  <div style={{ fontSize: 28, color: '#334155', fontWeight: 700 }}>저장된 기록이 없습니다</div>
                  <div style={{ fontSize: 22, color: '#1e293b', fontWeight: 600 }}>상태 작성하기 탭에서 환자 상태를 기록하면 여기에 표시됩니다.</div>
                </div>
              ) : (
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {/* 타임라인 선 */}
                  <div style={{ position: 'absolute', left: 19, top: 24, bottom: 24, width: 2, background: 'linear-gradient(to bottom, #38bdf8, rgba(56,189,248,0.1))' }} />

                  {allRecords.map((rec, idx) => {
                    const isOpen = expandedRecord === idx
                    const isEmergency = rec.isEmergency
                    const dt = new Date(rec.timestamp)
                    const dateStr = dt.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
                    const timeStr = dt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })

                    return (
                      <div key={idx} style={{ display: 'flex', gap: 24, paddingBottom: 16, paddingLeft: 0 }}>
                        {/* 타임라인 점 */}
                        <div style={{ flexShrink: 0, width: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28 }}>
                          <div style={{ width: 16, height: 16, borderRadius: '50%', background: isEmergency ? '#f43f5e' : '#38bdf8', border: `3px solid ${isEmergency ? 'rgba(244,63,94,0.3)' : 'rgba(56,189,248,0.3)'}`, zIndex: 1 }} />
                        </div>

                        {/* 카드 */}
                        <div style={{ flex: 1, background: isEmergency ? 'rgba(244,63,94,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isEmergency ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 24, overflow: 'hidden', marginBottom: 0 }}>
                          {/* 헤더 */}
                          <div onClick={() => setExpandedRecord(isOpen ? null : idx)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 30px', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 8 }}>
                                  <span style={{ fontSize: 20, fontWeight: 800, color: isEmergency ? '#f43f5e' : '#38bdf8', letterSpacing: '1px' }}>{dateStr} {timeStr}</span>
                                  {isEmergency && <span style={{ fontSize: 16, fontWeight: 900, padding: '4px 12px', borderRadius: 8, background: 'rgba(244,63,94,0.15)', color: '#f43f5e', letterSpacing: '1px' }}>응급</span>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                                  <div style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>{rec.mainComplaint || (Array.isArray(rec.selectedSymptoms) && rec.selectedSymptoms.length ? rec.selectedSymptoms.join(', ') : rec.diagnosis || '(주요 증상 없음)')}</div>
                                  <button
                                    type="button"
                                    aria-expanded={isOpen}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setExpandedRecord(isOpen ? null : idx)
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      padding: '8px 14px',
                                      borderRadius: 10,
                                      background: isOpen ? 'rgba(56,189,248,0.18)' : 'rgba(56,189,248,0.08)',
                                      border: `1px solid ${isOpen ? '#38bdf8' : 'rgba(56,189,248,0.22)'}`,
                                      color: '#38bdf8',
                                      fontSize: 16,
                                      fontWeight: 900,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Info size={18} />
                                    {isOpen ? '접기' : '자세히보기'}
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                              <div style={{ fontSize: 20, color: '#64748b', fontWeight: 800 }}>담당 : {rec.doctorName}</div>
                              <ChevronRight size={28} color="#475569" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.2s' }} />
                            </div>
                          </div>

                          {/* 요약 칩 (항상 표시) */}
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '0 30px 24px' }}>
                            {(rec.selectedSymptoms || []).slice(0, 4).map((s, i) => (
                              <span key={i} style={{ fontSize: 18, padding: '6px 16px', borderRadius: 10, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)', color: '#38bdf8', fontWeight: 700 }}>{s}</span>
                            ))}
                            {(rec.prescribedMeds || []).slice(0, 3).map((m, i) => (
                              <span key={i} style={{ fontSize: 18, padding: '6px 16px', borderRadius: 10, background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.15)', color: '#fb923c', fontWeight: 700 }}>{m}</span>
                            ))}
                          </div>

                          {/* 상세 펼침 */}
                          {isOpen && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '40px', display: 'flex', flexDirection: 'column', gap: 36, animation: 'slideDown 0.2s ease' }}>
                              {/* 바이탈 */}
                              {rec.vitals && (
                                <div>
                                  <div style={{ fontSize: 26, fontWeight: 800, color: '#475569', letterSpacing: '1.5px', marginBottom: 20 }}>활력 징후</div>
                                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                                    {[['심박수', rec.vitals.hr, '회/분'], ['산소포화도', rec.vitals.spo2, '%'], ['호흡수', rec.vitals.rr, '회/분'], ['혈압', rec.vitals.bp, ''], ['체온', rec.vitals.temp, '°C']].map(([label, val, unit]) => val && val !== '-' && (
                                      <div key={label} style={{ padding: '20px 28px', background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div style={{ fontSize: 24, color: '#475569', fontWeight: 700, marginBottom: 10 }}>{label}</div>
                                        <div style={{ fontSize: 36, fontWeight: 900, color: '#fff' }}>{val}<span style={{ fontSize: 22, color: '#475569', marginLeft: 8 }}>{unit}</span></div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                                {/* 증상 */}
                                <div>
                                  <div style={{ fontSize: 26, fontWeight: 800, color: '#475569', letterSpacing: '1.5px', marginBottom: 20 }}>선택된 증상</div>
                                  {rec.selectedSymptoms?.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 15 }}>
                                      {rec.selectedSymptoms.map((s, i) => <span key={i} style={{ fontSize: 26, padding: '10px 22px', borderRadius: 14, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', color: '#38bdf8', fontWeight: 700 }}>{s}</span>)}
                                    </div>
                                  ) : <span style={{ fontSize: 26, color: '#334155' }}>없음</span>}
                                </div>

                                {/* 처치 약물 */}
                                <div>
                                  <div style={{ fontSize: 26, fontWeight: 800, color: '#475569', letterSpacing: '1.5px', marginBottom: 20 }}>수행 조치</div>
                                  {rec.prescribedMeds?.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 15 }}>
                                      {rec.prescribedMeds.map((m, i) => <span key={i} style={{ fontSize: 26, padding: '10px 22px', borderRadius: 14, background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)', color: '#fb923c', fontWeight: 700 }}>{m}</span>)}
                                    </div>
                                  ) : <span style={{ fontSize: 26, color: '#334155' }}>없음</span>}
                                </div>
                              </div>

                              {/* 상세 메모 */}
                              {(rec.detailedNote || rec.otherActions) && (
                                <div>
                                  <div style={{ fontSize: 26, fontWeight: 800, color: '#475569', letterSpacing: '1.5px', marginBottom: 20 }}>상세 기록</div>
                                  <div style={{ fontSize: 28, color: '#e2e8f0', lineHeight: 1.7, background: 'rgba(255,255,255,0.02)', padding: '30px 35px', borderRadius: 24, border: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'pre-line' }}>
                                    {[rec.detailedNote, rec.otherActions].filter(Boolean).join('\n\n')}
                                  </div>
                                </div>
                              )}

                              {/* 사고 정보 및 발현 시각 */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 15 }}>
                                {rec.location && (
                                  <div style={{ fontSize: 24, color: '#38bdf8', fontWeight: 800 }}>
                                    사고 장소 : <span style={{ color: '#fff' }}>{rec.location}</span>
                                  </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ fontSize: 24, color: '#64748b', fontWeight: 700 }}>
                                    증상 발현 시각 : <span style={{ color: '#94a3b8' }}>{rec.occurrenceTime || '-'}</span>
                                  </div>
                                  <div style={{ fontSize: 22, color: '#475569', fontWeight: 600 }}>
                                    기록 저장 : {new Date(rec.timestamp).toLocaleString('ko-KR')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── 상태 작성하기 뷰 ── */}
          {viewMode === 'input' && (<>
          {patient?.id === 'S26-003' && (
            <SectionCard title="외상 촬영 및 AI 분석" icon={<Camera size={36} color="#38bdf8"/>}>
              <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 30 }}>
                <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', border: '2px solid rgba(56,189,248,0.3)', background: '#000', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!traumaImgError ? (
                    <>
                      <img 
                        src="/assets/ribs.jpeg" 
                        onError={() => setTraumaImgError(true)}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover', 
                          opacity: 0.8, 
                          transform: 'scale(1.6)' 
                        }} 
                        alt="Trauma" 
                      />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%)' }} />
                    </>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px', 
                      background: 'radial-gradient(circle at center, rgba(56,189,248,0.1) 0%, rgba(0,0,0,1) 100%)',
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 15
                    }}>
                      <div style={{ 
                        width: 80, 
                        height: 80, 
                        borderRadius: '50%', 
                        background: 'rgba(56,189,248,0.05)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1.5px solid rgba(56,189,248,0.2)',
                        marginBottom: 10,
                        boxShadow: '0 0 30px rgba(56,189,248,0.1)'
                      }}>
                        <Camera size={40} color="#38bdf8" style={{ opacity: 0.8 }} />
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.5px' }}>외상 촬영 및 AI 분석</div>
                      <div style={{ fontSize: 16, color: '#94a3b8', fontWeight: 600, lineHeight: 1.5, maxWidth: '280px' }}>
                        실시간 분석을 위한<br/>외상 스캔 신호를 검색하고 있습니다.
                      </div>
                      <div style={{ 
                        marginTop: 20, 
                        padding: '12px 30px', 
                        borderRadius: 14, 
                        background: 'rgba(56,189,248,0.1)', 
                        border: '1px solid rgba(56,189,248,0.3)',
                        color: '#38bdf8',
                        fontSize: 18,
                        fontWeight: 800,
                        animation: 'pulse 2s infinite'
                      }}>
                        외상 스캔 신호 대기 중...
                      </div>
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: 20, left: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: !traumaImgError ? '#26de81' : '#64748b', boxShadow: !traumaImgError ? '0 0 10px #26de81' : 'none' }} />
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{!traumaImgError ? 'AI 분석용 원본 이미지' : '연결 대기'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 20, padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                      <ShieldCheck size={24} color="#38bdf8" />
                      <span style={{ fontSize: 22, fontWeight: 900, color: '#38bdf8' }}>AI 외상 분류 참고 결과</span>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 950, color: '#fff', marginBottom: 10 }}>
                      우측 제5,6 늑골 다발성 골절 의심
                    </div>
                    <div style={{ fontSize: 18, color: '#94a3b8', fontWeight: 700, lineHeight: 1.6 }}>
                      판단 근거 : 흉부 타격 부위 피하 기종 의심 및 호흡 시 흉곽 비대칭 운동 감지
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '15px 20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 15, color: '#64748b', fontWeight: 800, marginBottom: 5 }}>분석 신뢰도</div>
                      <div style={{ fontSize: 24, fontWeight: 950, color: '#26de81' }}>94.2%</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '15px 20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 15, color: '#64748b', fontWeight: 800, marginBottom: 5 }}>긴급도 등급</div>
                      <div style={{ fontSize: 24, fontWeight: 950, color: '#ff4d6d' }}>LEVEL 4 (위험)</div>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          <SectionCard id="vital-section" title="현재 활력 징후 확인 (실시간 센서 데이터)" icon={<HeartPulse size={36} color="#ff4d6d"/>} right={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {[{ label: '정상', color: '#26de81' }, { label: '관찰', color: '#38bdf8' }, { label: '주의', color: '#fb923c' }, { label: '위험', color: '#ff4d6d' }].map(({ label, color }) => (
                <div key={label} style={{ padding: '6px 16px', borderRadius: 10, background: `${color}12`, border: `1.5px solid ${color}50`, fontSize: 15, fontWeight: 900, color }}>{label}</div>
              ))}
            </div>
          }>
            <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 25, background: 'rgba(255,255,255,0.02)', padding: '25px', borderRadius: 24, border: '1.5px solid rgba(255,255,255,0.05)' }}>
                <VitalField label="심박수" value={vitals.hr !== '-' ? `${vitals.hr} 회/분` : ''} status={getVitalStatus('hr', vitals.hr)} />
                <VitalField label="산소포화도" value={vitals.spo2 !== '-' ? `${vitals.spo2} %` : ''} status={getVitalStatus('spo2', vitals.spo2)} />
                <VitalField label="호흡수" value={vitals.rr !== '-' ? `${vitals.rr} 회/분` : ''} status={getVitalStatus('rr', vitals.rr)} />
                <VitalField label="혈압" value={vitals.bp !== '-' ? vitals.bp : ''} status={getVitalStatus('bp', vitals.bp)} editable onEdit={() => openEdit('bp', vitals.bp)} />
                <VitalField label="체온" value={vitals.temp !== '-' ? `${vitals.temp} °C` : ''} status={getVitalStatus('temp', vitals.temp)} editable onEdit={() => openEdit('temp', vitals.temp)} />

                {editTarget && editTarget !== 'role' && (
                  <div style={{ position: 'absolute', top: '110%', right: editTarget === 'bp' ? '20%' : (editTarget === 'temp' ? '25px' : 'auto'), zIndex: 1000, width: 360, background: '#1e293b', border: '2px solid #38bdf8', borderRadius: 24, padding: 28, boxShadow: '0 20px 50px rgba(0,0,0,0.6)', animation: 'slideDown 0.2s ease' }}>
                    <div style={{ fontSize: 21, fontWeight: 900, color: '#38bdf8', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>{editTarget === 'bp' ? <Activity size={24} /> : <Droplets size={24} />}{editTarget === 'bp' ? '혈압 직접 입력' : '체온 직접 입력'}</div>
                    <input autoFocus value={editValue} placeholder={editTarget === 'bp' ? '예: 120/80' : '예: 36.5'} onChange={e => setEditValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEdit(); }} style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, padding: '16px 20px', color: '#fff', fontSize: 29, fontWeight: 800, outline: 'none', marginBottom: 20, textAlign: 'center', letterSpacing: '1px' }} />
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditTarget(null)} style={{ flex: 1, padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none', fontWeight: 800, fontSize: 19, cursor: 'pointer' }}>취소</button>
                      <button onClick={saveEdit} style={{ flex: 2, padding: '14px', borderRadius: 12, background: '#38bdf8', color: '#000', border: 'none', fontWeight: 950, fontSize: 19, cursor: 'pointer' }}>데이터 저장</button>
                    </div>
                  </div>
                )}
            </div>
          </SectionCard>
          
          <SectionCard title="1. 환자 상태 관찰 일지" icon={<Stethoscope size={36} color="#38bdf8"/>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 35 }}>
              <div style={{ padding: '18px 24px', background: 'rgba(56,189,248,0.05)', borderRadius: 16, border: '1px solid rgba(56,189,248,0.1)', fontSize: '23px', color: '#38bdf8', fontWeight: 700, lineHeight: 1.5 }}>💡 환자가 통증을 느끼는 부위를 선택하고, 관찰된 증상을 기록해 주세요.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ fontSize: '28px', color: '#94a3b8', fontWeight: 800 }}>통증 부위 선택</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                  <PainAreaGroup label="머리 / 목" icon={<User size={26} color="#38bdf8" />} areas={['머리(두통)', '얼굴', '목', '치아/잇몸']} selectedAreas={painAreas} onClick={handlePainAreaClick} />
                  <PainAreaGroup label="몸통 (앞/뒤)" icon={<Activity size={26} color="#38bdf8" />} areas={['가슴(흉통)', '어깨', '상복부', '하복부', '옆구리', '등/허리']} selectedAreas={painAreas} onClick={handlePainAreaClick} />
                  <PainAreaGroup label="하체" icon={<Zap size={26} color="#38bdf8" />} areas={['골반', '허벅지', '무릎', '종아리', '발목/발']} selectedAreas={painAreas} onClick={handlePainAreaClick} />
                  <PainAreaGroup label="팔 / 기타" icon={<Sparkles size={26} color="#38bdf8" />} areas={['팔꿈치', '팔(전체)', '손목/손', '항문/회음부', '전신 통증']} selectedAreas={painAreas} onClick={handlePainAreaClick} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
                <div>
                  <div style={{ fontSize: '28px', color: '#94a3b8', fontWeight: 800, marginBottom: 15 }}>눈에 보이는 증상</div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: '25px 30px', border: '1.5px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                      <span style={{ fontSize: '21px', color: '#64748b', fontWeight: 800, whiteSpace: 'nowrap', width: '180px' }}>전신/의식 상태</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {['의식 변화', '호흡 곤란', '구토', '발열', '식은땀', '청색증'].map(s => {
                          const active = selectedSymptoms.includes(s)
                          return (<button key={s} onClick={() => toggleSymptom(s)} style={{ padding: '12px 20px', borderRadius: 14, background: active ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${active ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`, color: active ? '#38bdf8' : '#fff', fontSize: '21px', fontWeight: 700, cursor: 'pointer' }}>{s}</button>)
                        })}
                      </div>
                    </div>
                    <div style={{ width: '100%', height: '1.5px', background: 'rgba(255,255,255,0.05)' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                      <span style={{ fontSize: '21px', color: '#64748b', fontWeight: 800, whiteSpace: 'nowrap', width: '180px' }}>외상/환부 상태</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {['출혈', '대량 출혈(위험)', '부종(부기)', '피부 발진', '마비/저림', '찰과상/열상', '총상/자상(초응급)', '변형(골절의심)'].map(s => {
                          const active = selectedSymptoms.includes(s)
                          return (<button key={s} onClick={() => toggleSymptom(s)} style={{ padding: '12px 20px', borderRadius: 14, background: active ? (s.includes('위험') || s.includes('응급') ? 'rgba(244,63,94,0.3)' : 'rgba(56,189,248,0.25)') : 'rgba(255,255,255,0.03)', border: `1.5px solid ${active ? (s.includes('위험') || s.includes('응급') ? '#f43f5e' : '#38bdf8') : 'rgba(255,255,255,0.1)'}`, color: active ? (s.includes('위험') || s.includes('응급') ? '#ff4d6d' : '#38bdf8') : '#fff', fontSize: '21px', fontWeight: 700, cursor: 'pointer' }}>{s}</button>)
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
                  <InputBox label="사고 장소" placeholder="사고가 발생한 구체적인 장소 (예: 2번 엔진 인근 정비 구역)" value={location} onChange={(v) => { setLocation(v); setShowPlan(false); }} />
                  <InputBox label="상세한 증상 이야기" placeholder="상세 내용을 적어주세요." isTextArea value={detailedNote} onChange={(v) => { setDetailedNote(v); setShowPlan(false); }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 25, marginTop: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(56,189,248,0.03)', padding: '20px', borderRadius: 20, border: '1.5px solid rgba(56,189,248,0.1)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}><label style={{ fontSize: '24px', color: '#38bdf8', fontWeight: 900 }}>증상 발현 시각</label><button onClick={setNowTime} style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(56,189,248,0.2)', border: '1.5px solid #38bdf8', color: '#38bdf8', fontSize: '18px', fontWeight: 900, cursor: 'pointer' }}>지금</button></div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 15, background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: 15 }}><Clock size={24} color="#38bdf8" /><span style={{ fontSize: '34px', fontWeight: 950, color: '#fff' }}>{occurrenceTime}</span><button onClick={() => setIsTimeModalOpen(true)} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: '#94a3b8', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>변경</button></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: 20, border: '1.5px solid rgba(255,255,255,0.05)' }}><label style={{ fontSize: '24px', color: '#94a3b8', fontWeight: 900 }}>최종 취식 시각</label><div style={{ display: 'flex', gap: 12, marginTop: 5 }}><input type="text" placeholder='예: "1시간 전"' value={lastMealTime === '기록 없음' ? '' : lastMealTime} onChange={(e) => setLastMealTime(e.target.value)} style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 15, padding: '15px 22px', color: '#fff', fontSize: '24px', outline: 'none' }} /><button onClick={() => setLastMealTime('금식 중')} style={{ padding: '0 25px', borderRadius: 15, background: 'rgba(244,63,94,0.1)', border: '1.5px solid rgba(244,63,94,0.3)', color: '#f43f5e', fontSize: '20px', fontWeight: 800, cursor: 'pointer' }}>금식</button></div></div>
              </div>
              {!showPlan && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
                  <button disabled={isSaving} onClick={handleSave} style={{ padding: '22px 60px', borderRadius: 24, background: 'linear-gradient(135deg, #38bdf8 0%, #26de81 100%)', color: '#fff', border: 'none', fontWeight: 950, fontSize: '24px', cursor: isSaving ? 'wait' : 'pointer', opacity: isSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 15, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}><Sparkles size={28} /> {isSaving ? '저장 중...' : '저장 완료'}</button>
                </div>
              )}
            </div>
          </SectionCard>
          
          {showPlan && (
            <div style={{ animation: 'slideDown 0.6s ease-out forwards', display: 'flex', flexDirection: 'column', gap: 35 }}>
              <SectionCard title="2. 조치 및 계획" icon={<Pill size={36} color="#26de81"/>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
                  <div style={{ background: 'rgba(15, 23, 42, 0.3)', border: '2px solid #fb923c', borderRadius: '32px', overflow: 'hidden' }}>
                    <div style={{ background: '#fb923c', padding: '16px 40px', display: 'flex', alignItems: 'center', gap: 20 }}><ShieldAlert size={30} color="#0f172a" /><span style={{ fontSize: '24px', fontWeight: 950, color: '#0f172a' }}>비의료진 외상 처치 안전 수칙</span></div>
                    <div style={{ padding: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
                      <div style={{ fontSize: '19px', color: '#fff', lineHeight: 1.6 }}>• 출혈 부위 직접 압박 지혈<br/>• 환부 고정 및 이동 제한</div>
                      <div style={{ fontSize: '19px', color: '#fff', lineHeight: 1.6 }}>• 의식/호흡 지속 확인<br/>• 경추 손상 시 절대 고정</div>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1.5px solid rgba(56, 189, 248, 0.2)', borderRadius: '24px', padding: '25px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}><Sparkles size={28} color="#38bdf8" /><div style={{ fontSize: '24px', fontWeight: 900 }}>AI 실시간 증상 분석</div></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 20 }}>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: 18 }}><div style={{ fontSize: '20px', color: '#38bdf8', fontWeight: 800, marginBottom: 10 }}>분석 브리핑</div><div style={{ fontSize: '22px', lineHeight: 1.5 }}>{aiResult.briefing}</div></div>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: 18 }}><div style={{ fontSize: '20px', color: '#26de81', fontWeight: 800, marginBottom: 10 }}>처치 가이드</div><ul style={{ margin: 0, paddingLeft: 20, fontSize: '20px' }}>{aiResult.guide.map((g, i) => <li key={i}>{g}</li>)}</ul></div>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: 18 }}><div style={{ fontSize: '20px', color: '#fb923c', fontWeight: 800, marginBottom: 10 }}>추천 약물</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{aiResult.meds.map((m, i) => <span key={i} style={{ padding: '5px 12px', background: 'rgba(251,146,60,0.1)', border: '1px solid #fb923c', borderRadius: 8, color: '#fb923c', fontSize: '18px' }}>{m}</span>)}</div></div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '28px', color: '#94a3b8', fontWeight: 800, marginBottom: 18 }}>수행한 조치 기록</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
                      {OTC_MEDS.map(m => (
                        <button key={m.id} onClick={() => toggleMed(m.name)} style={{ padding: '15px 10px', borderRadius: 15, background: selectedMeds.includes(m.name) ? 'rgba(38,222,129,0.1)' : 'rgba(255,255,255,0.02)', border: `1.5px solid ${selectedMeds.includes(m.name) ? '#26de81' : 'rgba(255,255,255,0.1)'}`, color: selectedMeds.includes(m.name) ? '#26de81' : '#fff', fontSize: '20px', fontWeight: 800, cursor: 'pointer' }}>{m.name}</button>
                      ))}
                    </div>
                    <InputBox label="" placeholder="추가 조치 사항을 적어주세요." isTextArea value={otherActions} onChange={setOtherActions} />
                  </div>
                </div>
              </SectionCard>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 20, paddingBottom: 40 }}>
                <button onClick={() => setShowPlan(false)} style={{ padding: '20px 40px', borderRadius: 18, background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', fontSize: '20px', fontWeight: 800, cursor: 'pointer' }}>수정</button>
                <button disabled={isSaving} onClick={handleSave} style={{ padding: '20px 50px', borderRadius: 18, background: selectedSymptoms.some(s => s.includes('위험') || s.includes('응급')) ? '#f43f5e' : '#38bdf8', color: '#fff', border: 'none', fontSize: '24px', fontWeight: 950, cursor: isSaving ? 'wait' : 'pointer', opacity: isSaving ? 0.7 : 1, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}><CheckCircle2 size={28}/> {isSaving ? '저장 중...' : '저장 완료'}</button>
              </div>
            </div>
          )}
          </>)}
        </div>
      </div>
      <style>{`
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
      `}</style>
    </div>
  )
}

function SectionCard({ title, icon, children, right, id }) {
  return (<div id={id} style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1.5px solid rgba(255,255,255,0.05)', borderRadius: 36, padding: '35px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 30 }}><div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div><div style={{ fontSize: '28px', fontWeight: 950 }}>{title}</div>{right && <div style={{ marginLeft: 'auto' }}>{right}</div>}</div>{children}</div>)
}

function PainAreaGroup({ label, areas, selectedAreas, onClick, icon }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: '24px', border: '1.5px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 15 }}>{icon}<div style={{ fontSize: '25px', color: '#e2e8f0', fontWeight: 850 }}>{label}</div></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 15 }}>{areas.map(area => { const isActive = selectedAreas.includes(area); return (<button key={area} onClick={() => onClick(area)} style={{ padding: '13px 24px', borderRadius: 16, background: isActive ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${isActive ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`, color: isActive ? '#38bdf8' : '#cbd5e1', fontSize: '23px', fontWeight: 700, cursor: 'pointer' }}>{area}</button>) })}</div>
    </div>
  )
}

function InputBox({ label, placeholder, isTextArea, value, onChange }) {
  return (<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><label style={{ fontSize: '24px', color: '#94a3b8', fontWeight: 800 }}>{label}</label>{isTextArea ? (<textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: '100%', minHeight: 120, background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: '22px', color: '#fff', fontSize: '23px', outline: 'none', resize: 'none', lineHeight: 1.5 }} />) : (<input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: '20px 28px', color: '#fff', fontSize: '23px', outline: 'none' }} />)}</div>)
}

function VitalField({ label, value, status, editable, onEdit }) {
    const isNoData = !value || value === '' || value.startsWith('-');
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '15px', position: 'relative', background: isNoData ? 'rgba(255,255,255,0.01)' : 'rgba(56,189,248,0.02)', borderRadius: '20px', border: `1.5px solid ${isNoData ? 'rgba(255,255,255,0.05)' : 'rgba(56,189,248,0.1)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}><span style={{ fontSize: '20px', color: '#64748b', fontWeight: 800 }}>{label}</span>{!isNoData && <span style={{ padding: '2px 10px', borderRadius: 6, background: status.bg, color: status.color, fontSize: '13px', fontWeight: 900 }}>{status.label}</span>}{editable && (<button onClick={onEdit} style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '6px', padding: '4px', cursor: 'pointer', marginLeft: 'auto' }}><Pencil size={14} color="#38bdf8" /></button>)}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 6, minHeight: '44px' }}>{isNoData ? (<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #38bdf8', borderTopColor: 'transparent', animation: 'spin 1s infinite linear' }} /><span style={{ fontSize: '20px', color: '#475569' }}>센서를 연결해주세요</span></div>) : (<><span style={{ fontSize: '37px', fontWeight: 950, color: status.color }}>{value.split(' ')[0]}</span>{value.includes(' ') && <span style={{ fontSize: '18px', color: '#64748b', fontWeight: 800 }}>{value.split(' ')[1]}</span>}</>)}</div>
            {isNoData && editable && (<div onClick={onEdit} style={{ marginTop: '8px', fontSize: '17px', color: '#38bdf8', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={16}/> 입력</div>)}
        </div>
    )
}

function InfoItem({ label, value, size }) {
    const valueSize = size === 'xl_ultra' ? 32 : 22
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><span style={{ fontSize: '18px', color: '#64748b', fontWeight: 700 }}>{label}</span><span style={{ fontSize: valueSize, fontWeight: 800, color: '#fff' }}>{value}</span></div>
    )
}


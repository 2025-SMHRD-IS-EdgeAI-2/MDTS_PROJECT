import React, { useState, useEffect, useRef } from 'react'
import {
  Ship, Clock, RefreshCw, Signal, Shield, TrendingUp, CheckCircle2,
  Phone, Send, Inbox, BookOpen, Users, ChevronDown, ChevronRight, X,
  Lock, Terminal, Download, Search, Edit2, Heart, Cpu,
  HardDrive, MapPin, Activity, Wifi, AlertCircle, ShieldCheck, Pill, Sparkles
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts'
import { SHIP_INFO, DEVICE_INFO } from '../utils/constants'
import { useAlert } from '../utils/AlertContext'
import { fetchCrew, mapCrewToFrontend } from '../utils/api'
import { resolveAvatarUrl } from '../utils/avatar'

const C = {
  bg: '#0b0c10', panel: '#111318', panel2: '#161b22',
  border: '#1e2533', border2: '#252d3a',
  text: '#c9cdd4', sub: '#4e5a6b', dim: '#252d3a',
  success: '#26de81', warning: '#fb923c', danger: '#ff4d6d',
  info: '#38bdf8', purple: '#a78bfa', cyan: '#0dd9c5', yellow: '#facc15',
}

/* ─── 데이터 ─── */
const CREW_FALLBACK = [
  { id: 'S26-001', name: '이선장', age: 52, role: '선장', dept: '항해부', chronic: '고혈압', allergies: '없음', isEmergency: false },
  { id: 'S26-002', name: '김항해', age: 45, role: '1등 항해사', dept: '항해부', chronic: '없음', allergies: '페니실린', isEmergency: false },
  { id: 'S26-003', name: '박기관', age: 55, role: '기관장', dept: '기관부', chronic: '고혈압, 고지혈증', allergies: '아스피린', isEmergency: true },
  { id: 'S26-004', name: '최갑판', age: 41, role: '갑판장', dept: '항해부', chronic: '허리디스크', allergies: '없음', isEmergency: false },
  { id: 'S26-005', name: '정조타', age: 38, role: '조타사', dept: '항해부', chronic: '없음', allergies: '조개류', isEmergency: false },
  { id: 'S26-006', name: '한통신', age: 43, role: '통신장', dept: '항해부', chronic: '비염', allergies: '먼지', isEmergency: false },
  { id: 'S26-007', name: '강기계', age: 47, role: '1등 기관사', dept: '기관부', chronic: '없음', allergies: '벌침', isEmergency: false },
  { id: 'S26-008', name: '윤조리', age: 49, role: '조리장', dept: '지원부', chronic: '당뇨', allergies: '없음', isEmergency: false },
  { id: 'S26-009', name: '임전기', age: 35, role: '전기사', dept: '기관부', chronic: '없음', allergies: '없음', isEmergency: false },
  { id: 'S26-010', name: '백보급', age: 32, role: '사무장', dept: '지원부', chronic: '없음', allergies: '먼지', isEmergency: false },
  { id: 'S26-011', name: '황갑판', age: 28, role: '갑판원', dept: '항해부', chronic: '없음', allergies: '없음', isEmergency: false },
  { id: 'S26-012', name: '서기관', age: 30, role: '3등 기관사', dept: '기관부', chronic: '없음', allergies: '땅콩', isEmergency: false },
  { id: 'S26-013', name: '오항해', age: 26, role: '실습 항해사', dept: '항해부', chronic: '없음', allergies: '없음', isEmergency: false },
  { id: 'S26-014', name: '나위생', age: 31, role: '위생원', dept: '지원부', chronic: '없음', allergies: '없음', isEmergency: false },
  { id: 'S26-015', name: '고기수', age: 44, role: '기수', dept: '기관부', chronic: '치질', allergies: '없음', isEmergency: false },
  { id: 'S26-016', name: '문세탁', age: 33, role: '세탁원', dept: '지원부', chronic: '습진', allergies: '세제', isEmergency: false },
]

const CHECKLIST = [
  'AED 배터리 상태 확인','산소통 잔량 확인 (50% 이상)',
  '구급함 잠금 해제 확인','척추고정보드 위치 확인',
  '지혈대(T-kit) 수량 확인','원격의료센터 접속 확인',
  'MDTS 기기 정상 작동 확인','당직 의료 인력 배치 확인',
]

const SYS_LOGS_INITIAL = [
  { t:'09:31', type:'success', msg:'박기관 바이탈 → 부산원격의료센터 전송 완료' },
  { t:'09:28', type:'info',    msg:'원격 의료 연결 세션 시작 · 최원장 접속 확인' },
  { t:'09:25', type:'warning', msg:'혈압 주의 임계값 초과 알림 — 모니터링 유지' },
  { t:'09:20', type:'success', msg:'AI 외상 분석 완료 — 박기관 좌측 흉부 골절 의심' },
  { t:'09:10', type:'error',   msg:'위성 전송 실패 — 재시도 대기 중 (3회 시도)' },
]

function genSignal() {
  return Array.from({ length: 24 }, (_, i) => ({ h: `${i}시`, v: Math.floor(Math.random() * 25) + 70 }))
}

function riskOf(c) {
  if (c.isEmergency) return C.danger
  const ch = c.chronic === '없음' ? 0 : c.chronic.split(',').length
  return ch >= 2 ? C.danger : ch === 1 ? C.warning : C.success
}

/* ─── 서브 컴포넌트 ─── */
function Section({ id, label, color, collapsed, onToggle, children }) {
  return (
    <div id={id} style={{ marginBottom:40 }}>
      <div onClick={onToggle} style={{ display:'flex', alignItems:'center', gap:15, padding:'18px 25px', borderRadius:12, background:`${color}08`, border:`1px solid ${color}2a`, cursor:'pointer', marginBottom:collapsed?0:20 }}>
        <div style={{ width:5, height:25, background:color, borderRadius:2 }}/>
        <span style={{ fontSize:24, fontWeight:800, color, flex:1 }}>{label}</span>
        {collapsed ? <ChevronRight size={26} color={color}/> : <ChevronDown size={26} color={color}/>}
      </div>
      {!collapsed && children}
    </div>
  )
}

function GPanel({ title, icon, right, children }) {
  return (
    <div style={{ 
      background:'rgba(22, 27, 34, 0.5)', 
      backdropFilter:'blur(15px)',
      border:'1px solid rgba(255,255,255,0.08)', 
      borderRadius:24, 
      padding:'32px', 
      height:'100%', 
      display:'flex', 
      flexDirection:'column',
      boxShadow:'0 15px 35px rgba(0,0,0,0.3), inset 0 0 20px rgba(255,255,255,0.02)'
    }}>
      <div style={{ 
        display:'flex', 
        justifyContent:'space-between', 
        alignItems:'center', 
        marginBottom:25, 
        paddingBottom:18, 
        borderBottom:'1px solid rgba(255,255,255,0.05)',
        position:'relative'
      }}>
        <div style={{ position:'absolute', bottom:-1, left:0, width:60, height:2, background:C.info, boxShadow:`0 0 10px ${C.info}` }} />
        <div style={{ display:'flex', alignItems:'center', gap:15, fontSize:24, fontWeight:850, color:'#fff', letterSpacing:'-0.5px' }}>
          <div style={{ padding:8, borderRadius:10, background:'rgba(255,255,255,0.03)', display:'flex' }}>{icon}</div>
          {title}
        </div>
        {right}
      </div>
      <div style={{ flex:1 }}>{children}</div>
    </div>
  )
}

function Tag({ color, children, small, style }) {
  return (
    <span style={{ padding: small?'5px 12px':'8px 18px', borderRadius:8, fontSize:small?16:20, fontWeight:800, background:`${color}12`, color, border:`1px solid ${color}44`, boxShadow:`inset 0 0 10px ${color}08`, ...style }}>{children}</span>
  )
}

function Dot({ color, pulse }) {
  return (
    <div style={{ width:14, height:14, borderRadius:'50%', background:color, boxShadow:`0 0 15px ${color}`, animation:pulse?'pulse 2s infinite':undefined }}/>
  )
}

function Btn({ color, onClick, children, small, style, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} className="premium-btn" style={{ 
      padding:small?'10px 20px':'12px 28px', 
      borderRadius:12, 
      background:disabled ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${color}22, ${color}05)`, 
      border:`1px solid ${disabled ? 'rgba(255,255,255,0.1)' : color+'55'}`, 
      color: disabled ? '#4e5a6b' : color, 
      fontSize:small?18:21, 
      fontWeight:800, 
      cursor:disabled ? 'default' : 'pointer',
      transition:'all 0.2s',
      ...style 
    }}>{children}</button>
  )
}

function Toggle({ on, color, onChange }) {
  return (
    <div onClick={onChange} style={{ 
      width:70, height:36, borderRadius:18, background:on?`${color}33`:C.dim, 
      border:`1.5px solid ${on?color:'rgba(255,255,255,0.1)'}`,
      position:'relative', cursor:'pointer', transition:'all 0.3s', flexShrink:0 
    }}>
      <div style={{ 
        position:'absolute', top:4, left:on?38:4, width:25, height:25, 
        borderRadius:'50%', background:on?color:'#fff', transition:'all 0.3s',
        boxShadow:on?`0 0 15px ${color}`:'none'
      }}/>
    </div>
  )
}

/* ═══════════════════════════════════ MAIN ═════════════════════════════════ */
export default function Settings() {
  const { showAlert, showConfirm } = useAlert()
  const [CREW, setCREW] = useState(() => {
    try {
      const saved = localStorage.getItem('mdts_crew_list')
      return saved ? JSON.parse(saved) : CREW_FALLBACK
    } catch { return CREW_FALLBACK }
  })

  // DB에서 선원 목록 로드하여 병합
  useEffect(() => {
    fetchCrew().then(dbCrewList => {
      setCREW(prev => {
        const merged = [...prev];
        for (const dbCrew of dbCrewList) {
          const frontId = `S26-${String(dbCrew.crew_id).padStart(3, '0')}`;
          const idx = merged.findIndex(c => c.id === frontId);
          const mapped = mapCrewToFrontend(dbCrew);
          if (idx >= 0) {
            merged[idx] = {
              ...merged[idx],
              ...mapped,
              avatar: mapped.avatar || merged[idx].avatar,
              isEmergency: mapped.isEmergency,
            }
          } else {
            merged.push({ ...mapped, isEmergency: false });
          }
        }
        return merged;
      });
    }).catch(() => {});
  }, []);

  const [now, setNow] = useState(new Date())
  const [checks, setChecks] = useState({ 0: true, 1: true, 6: true })
  const [collapsed, setCollapsed] = useState({})
  const [sec, setSec] = useState({ 
    db_enc: true, 
    img_sec: true, 
    tls_sync: true, 
    net_iso: false, 
    log_audit: true, 
    offline_sec: true 
  })
  const [signal, setSignal] = useState(genSignal())
  const [coords, setCoords] = useState({ lat: '34.3415° N', lng: '129.0403° E' })
  const [isEditingCoords, setIsEditingCoords] = useState(false)
  const [tempCoords, setTempCoords] = useState({ lat: '', lng: '' })
  const [activities, setActivities] = useState([...SYS_LOGS_INITIAL].reverse())
  const [medEnv, setMedEnv] = useState({ temp: 22.4, humi: 45.8 })
  const [updateStatus, setUpdateStatus] = useState('IDLE')
  const [deviceInfo, setDeviceInfo] = useState([
    { l: '선박명', v: SHIP_INFO.name, k: 'shipName' },
    { l: '선박번호', v: SHIP_INFO.id, k: 'shipId' },
    { l: '기기번호', v: DEVICE_INFO.id, k: 'deviceId' },
    { l: 'S/N', v: DEVICE_INFO.serial, k: 'serial' },
    { l: '보증만료', v: DEVICE_INFO.warranty, k: 'warranty' }
  ])
  const [isEditingDevice, setIsEditingDevice] = useState(false)
  const [tempDeviceInfo, setTempDeviceInfo] = useState([])
  const logContainerRef = useRef(null)

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [activities])

  // ─── 위성 신호 실시간 업데이트 및 좌표 타이머 ───
  useEffect(() => { 
    const t = setInterval(() => {
      setNow(new Date())
      
      // 좌표 자동 업데이트 (편집 중이 아닐 때만)
      if (!isEditingCoords) {
        setCoords(p => ({ 
          lat: (parseFloat(p.lat) + (Math.random()-0.5)*0.0001).toFixed(4)+'° N', 
          lng: (parseFloat(p.lng) + (Math.random()-0.5)*0.0001).toFixed(4)+'° E' 
        }))
      }

      // 위성 신호 실시간 변동 (3초마다 새로운 포인트 추가)
      if (new Date().getSeconds() % 3 === 0) {
        setSignal(prev => {
          const last = prev[prev.length - 1];
          const newVal = Math.max(65, Math.min(98, last.v + Math.floor((Math.random() - 0.5) * 6)));
          const newTime = `${new Date().getHours()}시 ${new Date().getMinutes()}분`;
          return [...prev.slice(1), { h: newTime, v: newVal }];
        });
      }

      // 온습도 실시간 변동 (5초마다)
      if (new Date().getSeconds() % 5 === 0) {
        setMedEnv(p => ({
          temp: +(p.temp + (Math.random() - 0.5) * 0.2).toFixed(1),
          humi: +(p.humi + (Math.random() - 0.5) * 0.4).toFixed(1)
        }))
      }
    }, 1000); 
    return () => clearInterval(t) 
  }, [isEditingCoords])

  const handleSignalScan = () => {
    const nowStr = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })
    setActivities(prev => [...prev, { t: nowStr, type: 'info', msg: '위성 안테나 방위각 재조정 및 신호 최적화 스캔 중...' }])
    setSignal(prev => prev.map(s => ({ ...s, v: Math.min(100, s.v + 5) })))
    setTimeout(() => {
      setActivities(prev => [...prev, { t: nowStr, type: 'success', msg: '위성 신호 품질 최적화 완료 (스타링크 빔 포밍 적용됨)' }])
    }, 1500)
  }

  const startEditingCoords = () => {
    setTempCoords({ ...coords })
    setIsEditingCoords(true)
  }

  const saveCoords = () => {
    setCoords(tempCoords)
    setIsEditingCoords(false)
    const nowStr = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })
    setActivities(prev => [...prev, { t: nowStr, type: 'success', msg: `시스템 : 선박 항행 좌표 수동 보정 완료 (${tempCoords.lat}, ${tempCoords.lng})` }])
  }

  const handleManualRefresh = () => {
    setNow(new Date())
    const nowStr = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })
    setActivities(prev => [...prev, { t: nowStr, type: 'info', msg: '사용자 요청 : 시스템 전체 데이터 즉시 동기화 완료' }])
  }

  const handleSyncData = () => {
    const nowStr = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })
    setActivities(prev => [...prev, { t: nowStr, type: 'info', msg: '원격 서버 데이터 동기화 세션 시작 중...' }])
    setTimeout(() => {
      setActivities(prev => [...prev, { t: nowStr, type: 'success', msg: 'MDTS 데이터베이스 동기화 완료 (부산원격의료센터)' }])
    }, 1000)
  }

  const handleUpdateCheck = () => {
    setUpdateStatus('CHECKING')
    const nowStr = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })
    setActivities(prev => [...prev, { t: nowStr, type: 'info', msg: 'AI 분석 모델 업데이트 서버 접속 시도 중...' }])

    setTimeout(() => {
      const hasUpdate = Math.random() > 0.7
      setUpdateStatus(hasUpdate ? 'NEW' : 'LATEST')
      const logTime = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })
      const resultMsg = hasUpdate ? "AI 엔진 새 버전(v2.4.2)이 발견되었습니다." : "AI 엔진이 이미 최신 버전(v2.4.1)입니다."
      setActivities(prev => [...prev, { t: logTime, type: hasUpdate ? 'warning' : 'success', msg: resultMsg }])
    }, 2000)
  }

  const handleToggleSec = (key, label) => {
    const newVal = !sec[key]
    setSec(prev => ({ ...prev, [key]: newVal }))
    const nowStr = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })
    const newLog = { t: nowStr, type: newVal ? 'success' : 'warning', msg: `보안 : ${label} [${newVal ? '활성화' : '해제'}]` }
    setActivities(prev => [...prev, newLog])
  }

  const startEditingDevice = () => {
    setTempDeviceInfo([...deviceInfo])
    setIsEditingDevice(true)
  }

  const saveDeviceInfo = () => {
    setDeviceInfo(tempDeviceInfo)
    setIsEditingDevice(false)
    const nowStr = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })
    setActivities(prev => [...prev, { t: nowStr, type: 'info', msg: '시스템 : 기기 상세 정보가 성공적으로 업데이트되었습니다.' }])
  }

  const cancelEditingDevice = () => {
    setIsEditingDevice(false)
  }

  const handleDeviceChange = (k, newVal) => {
    setTempDeviceInfo(prev => prev.map(d => d.k === k ? { ...d, v: newVal } : d))
  }

  const [trainingList, setTrainingList] = useState([
    { name: '김항해', id: 'S26-002', dept: '항해부', type: '기본 CPR (심폐소생술)', date: '2024-12-15', expiry: '2026-12-15' },
    { name: '이선장', id: 'S26-001', dept: '항해부', type: '고급 응급처치 (Advanced)', date: '2023-05-20', expiry: '2026-05-20' },
  ])

  const getStatusInfo = (expiry) => {
    if (!expiry) return { label: '기한없음', color: C.info }
    const diff = Math.ceil((new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24))
    return diff < 0 ? { label: '만료', color: C.danger } : diff < 90 ? { label: '만료임박', color: C.warning } : { label: '유효', color: C.success }
  }

  const checkPct = Math.round((Object.values(checks).filter(Boolean).length / CHECKLIST.length) * 100)
  const toggle = (i) => setChecks({ ...checks, [i]: !checks[i] })
  const fold = (k) => setCollapsed(p => ({ ...p, [k]: !p[k] }))

  const [meds, setMeds] = useState([
    { id:1, n:'타이레놀', c:'해열진통', q:45, m:10, e:'2027-05-20', cat:'pill' },
    { id:2, n:'아스피린', c:'혈전/통증', q:12, m:10, e:'2026-12-15', cat:'pill' },
    { id:3, n:'소화제', c:'위장장애', q:8, m:15, e:'2027-01-10', cat:'pill' },
    { id:4, n:'항히스타민', c:'알레르기', q:8, m:10, e:'2026-08-05', cat:'pill' },
    { id:5, n:'항생제 연고', c:'외상처치', q:15, m:5, e:'2027-03-22', cat:'cream' },
    { id:6, n:'포비돈(소독)', c:'소독', q:3, m:5, e:'2026-05-10', cat:'liquid' },
    { id:7, n:'압박붕대', c:'고정/압박', q:20, m:10, e:'-', cat:'bandage' },
    { id:8, n:'지혈대', c:'심한출혈', q:4, m:5, e:'-', cat:'bandage' },
    { id:9, n:'이부프로펜', c:'소염진통', q:30, m:10, e:'2027-08-12', cat:'pill' },
    { id:10, n:'멀미약', c:'항현훈제', q:50, m:20, e:'2026-11-30', cat:'pill' },
    { id:11, n:'종합감기약', c:'호흡기질환', q:25, m:10, e:'2027-02-14', cat:'pill' },
    { id:12, n:'제산제', c:'위산과다', q:40, m:15, e:'2027-04-01', cat:'pill' },
    { id:13, n:'생리식염수', c:'세척/소독', q:10, m:10, e:'2026-09-20', cat:'liquid' },
    { id:14, n:'알코올 스왑', c:'국소소독', q:100, m:50, e:'2028-01-10', cat:'pad' },
    { id:15, n:'멸균 거즈', c:'상처보호', q:60, m:30, e:'-', cat:'pad' },
    { id:16, n:'의료용 테이프', c:'드레싱고정', q:15, m:5, e:'-', cat:'bandage' },
    { id:17, n:'화상 거즈', c:'화상처치', q:5, m:10, e:'2026-06-15', cat:'pad' },
    { id:18, n:'일회용 인공눈물', c:'안구세척', q:30, m:20, e:'2027-10-05', cat:'liquid' },
    { id:19, n:'파스(패치)', c:'근육통', q:20, m:10, e:'2027-12-20', cat:'pad' },
    { id:20, n:'경구수액염', c:'탈수방지', q:15, m:10, e:'2027-03-30', cat:'pill' },
    { id:21, n:'바셀린 거즈', c:'피부보호', q:12, m:10, e:'2027-01-22', cat:'pad' },
    { id:22, n:'스테로이드 연고', c:'피부염', q:8, m:5, e:'2026-11-11', cat:'cream' },
    { id:23, n:'탄력 붕대', c:'관절고정', q:10, m:5, e:'-', cat:'bandage' },
    { id:24, n:'알루미늄 부목', c:'골절고정', q:4, m:2, e:'-', cat:'bandage' },
  ])

  const [isMedModalOpen, setIsMedModalOpen] = useState(false)
  const todayStr = new Date().toISOString().split('T')[0]
  const [newMed, setNewMed] = useState({ n: '', c: '', q: 10, m: 5, cat: 'pill', e: todayStr })
  const [editMed, setEditMed] = useState(null)

  const openNewMedModal = () => {
    setNewMed({ n: '', c: '', q: 10, m: 5, cat: 'pill', e: todayStr })
    setIsMedModalOpen(true)
  }

  const saveEditMed = () => {
    if (!editMed.n || !editMed.c) return showAlert('약품명과 효능을 입력하세요.', '입력 오류', 'warning')
    setMeds(prev => prev.map(m => m.id === editMed.id ? { ...editMed } : m))
    const nowStr = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })
    setActivities(p => [...p, { t: nowStr, type: 'info', msg: `재고 : [${editMed.n}] 정보 수정 완료` }])
    setEditMed(null)
  }

  const deleteMed = (id) => {
    const target = meds.find(m => m.id === id)
    showConfirm(`[${target?.n}] 약품을 삭제하시겠습니까?`, () => {
      setMeds(prev => prev.filter(m => m.id !== id))
      const nowStr = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })
      setActivities(p => [...p, { t: nowStr, type: 'warning', msg: `재고 : [${target?.n}] 삭제됨` }])
    }, '약품 삭제', 'danger')
  }

  const updateMed = (id, delta) => {
    setMeds(prev => prev.map(m => {
      if (m.id === id) {
        const newQ = Math.max(0, m.q + delta);
        if (delta !== 0) {
          const nowStr = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' });
          setActivities(p => [...p, { t: nowStr, type: 'info', msg: `재고 : ${m.n} 수량 변경 (${m.q} → ${newQ})` }]);
        }
        return { ...m, q: newQ };
      }
      return m;
    }))
  }

  const addMed = () => {
    if (!newMed.n || !newMed.c) return showAlert('약품명과 효능을 입력하세요.', '입력 오류', 'warning')
    setMeds(prev => [...prev, { ...newMed, id: Date.now() }])
    setIsMedModalOpen(false)
    setNewMed({ n: '', c: '', q: 10, m: 5, cat: 'pill' })
    const nowStr = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })
    setActivities(p => [...p, { t: nowStr, type: 'success', msg: `재고 : 새 의료 소모품 [${newMed.n}] 등록 완료` }])
  }

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newEdu, setNewEdu] = useState({ name:'', id:'', dept:'', type:'기본 CPR (심폐소생술)', date:'', expiry:'' })
  const [dateEditor, setDateEditor] = useState(null)
  const [deleteEduTarget, setDeleteEduTarget] = useState(null)
  const [editEduTarget, setEditEduTarget] = useState(null) // { index, data }

  const openEditEdu = (i) => {
    setEditEduTarget({ index: i, data: { ...trainingList[i] } })
  }

  const saveEditEdu = () => {
    if (!editEduTarget.data.date) return showAlert('날짜를 선택하세요.', '입력 오류', 'warning')
    setTrainingList(prev => prev.map((r, i) => i === editEduTarget.index ? { ...editEduTarget.data } : r))
    const nowStr = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })
    setActivities(p => [...p, { t: nowStr, type: 'info', msg: `교육이력 수정 : ${editEduTarget.data.name} - ${editEduTarget.data.type}` }])
    setEditEduTarget(null)
  }

  const confirmDeleteEdu = () => {
    if (deleteEduTarget === null) return
    const target = trainingList[deleteEduTarget]
    setTrainingList(prev => prev.filter((_, i) => i !== deleteEduTarget))
    const nowStr = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })
    setActivities(p => [...p, { t: nowStr, type: 'warning', msg: `교육이력 삭제 : ${target.name} - ${target.type}` }])
    setDeleteEduTarget(null)
  }

  // 관리자 등록 현황
  const MANAGER_ROLES = ['안전책임자', '의료담당자', '응급처치 담당자', '위생관리 책임자']
  const [managers, setManagers] = useState(() => {
    const defaults = [
      { id: 'S26-001', name: '이선장', role: '안전책임자', dept: '항해부' },
      { id: 'S26-003', name: '박기관', role: '의료담당자', dept: '기관부' },
    ]
    try {
      const saved = localStorage.getItem('mdts_managers')
      if (!saved) return defaults
      const parsed = JSON.parse(saved)
      // CREW_FALLBACK 기준으로 id/dept 보정 (stale 캐시 방지)
      return parsed.map(m => {
        const crew = CREW_FALLBACK.find(c => c.name === m.name)
        return crew ? { ...m, id: crew.id, dept: crew.dept } : m
      })
    } catch { return defaults }
  })
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false)
  const [newManager, setNewManager] = useState({ id: '', name: '', dept: '', role: '안전책임자' })
  const [deleteManagerTarget, setDeleteManagerTarget] = useState(null)
  const [editManagerTarget, setEditManagerTarget] = useState(null) // { ...manager }

  const saveEditManager = () => {
    const updated = managers.map(m => m.id === editManagerTarget.id ? { ...editManagerTarget } : m)
    saveManagers(updated)
    const nowStr = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })
    setActivities(p => [...p, { t: nowStr, type: 'info', msg: `관리자 수정 : ${editManagerTarget.name} (${editManagerTarget.role})` }])
    setEditManagerTarget(null)
  }

  const saveManagers = (list) => {
    setManagers(list)
    try { localStorage.setItem('mdts_managers', JSON.stringify(list)) } catch {}
  }

  const addManager = () => {
    if (!newManager.id) return showAlert('선원을 선택하세요.', '입력 오류', 'warning')
    if (managers.find(m => m.id === newManager.id)) return showAlert('이미 등록된 선원입니다.', '등록 오류', 'danger')
    const updated = [...managers, { ...newManager }]
    saveManagers(updated)
    setIsManagerModalOpen(false)
    setNewManager({ id: '', name: '', dept: '', role: '안전책임자' })
    const nowStr = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })
    setActivities(p => [...p, { t: nowStr, type: 'success', msg: `관리자 등록 : ${newManager.name} (${newManager.role})` }])
  }

  const removeManager = (id) => {
    const target = managers.find(m => m.id === id)
    const updated = managers.filter(m => m.id !== id)
    saveManagers(updated)
    const nowStr = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })
    setActivities(p => [...p, { t: nowStr, type: 'info', msg: `관리자 해제 : ${target?.name}` }])
  }

  const addEdu = () => {
    if (!newEdu.id || !newEdu.date) return showAlert('선원과 날짜를 선택하세요.', '입력 오류', 'warning')
    setTrainingList([ { ...newEdu }, ...trainingList ])
    setIsModalOpen(false)
    setNewEdu({ name:'', id:'', dept:'', type:'기본 CPR (심폐소생술)', date:'', expiry:'' })
  }

  return (
    <div style={{ display:'flex', height:'calc(100vh - 72px)', background:C.bg, color:C.text, fontFamily:'"Pretendard",sans-serif', overflow:'hidden', position:'relative' }}>

      {/* ── 교육 이력 수정 모달 ── */}
      {editEduTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000 }}>
          <div style={{ background:C.panel, border:`2px solid ${C.info}`, borderRadius:24, padding:45, width:650 }}>
            <div style={{ fontSize:32, fontWeight:950, marginBottom:35, color:C.info, display:'flex', alignItems:'center', gap:15 }}>
              <BookOpen size={36}/> 교육 이력 수정
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
              <div>
                <div style={{ fontSize:18, color:C.sub, marginBottom:12, fontWeight:800 }}>교육 이수 선원</div>
                <select value={editEduTarget.data.id} onChange={e => {
                  const c = CREW.find(x => x.id === e.target.value)
                  if (c) setEditEduTarget(p => ({ ...p, data: { ...p.data, id: c.id, name: c.name, dept: c.dept } }))
                }} style={{ width:'100%', backgroundColor:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 44px 18px 20px', color:'#fff', fontSize:20, fontWeight:700, outline:'none' }}>
                  <option value="">선원을 선택하세요</option>
                  {CREW.map(c => <option key={c.id} value={c.id}>{c.name} ⏐ {c.id} ⏐ {c.dept}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:18, color:C.sub, marginBottom:12, fontWeight:800 }}>교육 과정</div>
                <select value={editEduTarget.data.type} onChange={e => setEditEduTarget(p => ({ ...p, data: { ...p.data, type: e.target.value } }))} style={{ width:'100%', backgroundColor:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 44px 18px 20px', color:'#fff', fontSize:20, fontWeight:700, outline:'none' }}>
                  <option>기본 CPR (심폐소생술)</option>
                  <option>의료 응급 처치 (STCW)</option>
                  <option>선상 응급 의료 (Advanced)</option>
                  <option>AED 기기 작동법</option>
                  <option>원격 의료 장비 운용 교육</option>
                </select>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                <div onClick={() => setDateEditor({ field:'date', target:'edit' })} style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 20px', color:'#fff', fontSize:20, fontWeight:700, cursor:'pointer', minHeight:60, display:'flex', alignItems:'center', justifyContent:'space-between', boxSizing:'border-box' }}>
                  {editEduTarget.data.date || '이수 날짜'} <Clock size={20} color={C.sub} />
                </div>
                <div onClick={() => setDateEditor({ field:'expiry', target:'edit' })} style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 20px', color:'#fff', fontSize:20, fontWeight:700, cursor:'pointer', minHeight:60, display:'flex', alignItems:'center', justifyContent:'space-between', boxSizing:'border-box' }}>
                  {editEduTarget.data.expiry || '만료 날짜'} <Clock size={20} color={C.sub} />
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:18, marginTop:45 }}>
              <button onClick={() => setEditEduTarget(null)} style={{ flex:1, padding:20, borderRadius:15, background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}`, color:C.sub, fontSize:22, fontWeight:800, cursor:'pointer' }}>취소</button>
              <button onClick={saveEditEdu} style={{ flex:2, padding:20, borderRadius:15, background:C.info, border:'none', color:'#000', fontSize:22, fontWeight:950, cursor:'pointer' }}>수정 저장하기</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 교육 이력 삭제 재확인 모달 ── */}
      {deleteEduTarget !== null && (() => {
        const r = trainingList[deleteEduTarget]
        const status = getStatusInfo(r?.expiry)
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', backdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000 }}>
            <div style={{ background:C.panel, border:`2px solid ${C.danger}`, borderRadius:24, padding:48, width:520, boxShadow:'0 30px 60px rgba(0,0,0,0.6)' }}>
              <div style={{ fontSize:26, fontWeight:950, color:'#fff', marginBottom:10 }}>교육 이력 삭제</div>
              <div style={{ fontSize:17, color:C.sub, fontWeight:700, marginBottom:28 }}>이 교육 이력을 영구적으로 삭제합니다.</div>
              <div style={{ background:C.panel2, border:`1px solid ${C.border}`, borderRadius:16, padding:'22px 26px', marginBottom:32 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                  <span style={{ fontSize:24, fontWeight:900, color:'#fff' }}>{r?.name}</span>
                  <Tag color={C.dim} small style={{ fontSize:14, padding:'3px 10px', color:C.text }}>{r?.dept}</Tag>
                  <Tag color={status.color} small>{status.label}</Tag>
                </div>
                <div style={{ fontSize:20, fontWeight:800, color:C.info, marginBottom:8 }}>{r?.type}</div>
                {r?.expiry && <div style={{ fontSize:16, color:C.sub, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}><Clock size={13} color={C.sub}/> 만료일 : <span style={{ color:status.color, fontWeight:900 }}>{r.expiry}</span></div>}
              </div>
              <div style={{ display:'flex', gap:14 }}>
                <button onClick={()=>setDeleteEduTarget(null)} style={{ flex:1, padding:'18px', borderRadius:14, background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`, color:C.sub, fontSize:20, fontWeight:800, cursor:'pointer' }}>취소</button>
                <button onClick={confirmDeleteEdu} style={{ flex:2, padding:'18px', borderRadius:14, background:C.danger, border:'none', color:'#fff', fontSize:20, fontWeight:950, cursor:'pointer' }}>삭제 확인</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── 관리자 수정 모달 ── */}
      {editManagerTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000 }}>
          <div style={{ background:C.panel, border:`2px solid ${C.purple}`, borderRadius:24, padding:45, width:560 }}>
            <div style={{ fontSize:32, fontWeight:950, marginBottom:35, color:C.purple, display:'flex', alignItems:'center', gap:15 }}>
              <ShieldCheck size={36}/> 관리자 정보 수정
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:20, marginBottom:35 }}>
              <div>
                <div style={{ fontSize:18, color:C.sub, fontWeight:800, marginBottom:10 }}>선원 선택</div>
                <select
                  value={editManagerTarget.id}
                  onChange={e => {
                    const crew = CREW.find(c => c.id === e.target.value)
                    setEditManagerTarget(p => ({ ...p, id: e.target.value, name: crew?.name || '', dept: crew?.dept || '' }))
                  }}
                  style={{ width:'100%', backgroundColor:C.panel2, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 44px 14px 18px', color:'#fff', fontSize:20, fontWeight:700, outline:'none' }}
                >
                  {CREW.map(c => <option key={c.id} value={c.id}>{c.name} ⏐ {c.id} ⏐ {c.role} · {c.dept}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:18, color:C.sub, fontWeight:800, marginBottom:10 }}>담당 역할</div>
                <select
                  value={editManagerTarget.role}
                  onChange={e => setEditManagerTarget(p => ({ ...p, role: e.target.value }))}
                  style={{ width:'100%', backgroundColor:C.panel2, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 44px 14px 18px', color:'#fff', fontSize:20, fontWeight:700, outline:'none' }}
                >
                  {MANAGER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:15 }}>
              <button onClick={() => setEditManagerTarget(null)} style={{ flex:1, padding:20, borderRadius:15, background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}`, color:C.sub, fontSize:22, fontWeight:800, cursor:'pointer' }}>취소</button>
              <button onClick={saveEditManager} style={{ flex:2, padding:20, borderRadius:15, background:C.purple, color:'#000', fontSize:22, fontWeight:950, cursor:'pointer', border:'none' }}>수정 저장하기</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 관리자 삭제 재확인 모달 ── */}
      {deleteManagerTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', backdropFilter:'blur(12px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000 }}>
          <div style={{ background:C.panel, border:`2px solid ${C.danger}`, borderRadius:24, padding:48, width:500, boxShadow:'0 30px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:10 }}>
              <div style={{ width:48, height:48, borderRadius:14, background:`rgba(255,77,109,0.15)`, border:`1.5px solid ${C.danger}55`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={26} color={C.danger} />
              </div>
              <div style={{ fontSize:26, fontWeight:950, color:'#fff' }}>관리자 해제</div>
            </div>
            <div style={{ fontSize:17, color:C.sub, fontWeight:700, marginBottom:28 }}>해당 선원의 관리자 권한을 해제합니다.</div>
            <div style={{ background:C.panel2, border:`1px solid ${C.border}`, borderRadius:16, padding:'22px 26px', marginBottom:32 }}>
              <div style={{ fontSize:13, fontWeight:800, color:C.purple, background:`${C.purple}18`, padding:'3px 10px', borderRadius:6, border:`1px solid ${C.purple}40`, width:'fit-content', marginBottom:12 }}>{deleteManagerTarget.role}</div>
              <div style={{ fontSize:26, fontWeight:950, color:'#fff', marginBottom:6 }}>{deleteManagerTarget.name}</div>
              <div style={{ fontSize:18, color:C.sub, fontWeight:700 }}>{deleteManagerTarget.dept} · {deleteManagerTarget.id}</div>
            </div>
            <div style={{ display:'flex', gap:14 }}>
              <button onClick={()=>setDeleteManagerTarget(null)} style={{ flex:1, padding:'18px', borderRadius:14, background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`, color:C.sub, fontSize:20, fontWeight:800, cursor:'pointer' }}>취소</button>
              <button onClick={() => { removeManager(deleteManagerTarget.id); setDeleteManagerTarget(null) }} style={{ flex:2, padding:'18px', borderRadius:14, background:C.danger, border:'none', color:'#fff', fontSize:20, fontWeight:950, cursor:'pointer' }}>해제 확인</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 캘린더 모달 ── */}
      {dateEditor && (
        <CalendarModal
          onClose={() => setDateEditor(null)}
          onSelect={(val) => {
            if (dateEditor.target === 'edit') {
              setEditEduTarget(p => ({ ...p, data: { ...p.data, [dateEditor.field]: val } }))
            } else {
              setNewEdu(p => ({ ...p, [dateEditor.field]: val }))
            }
            setDateEditor(null)
          }}
        />
      )}

      {/* ── 교육 이력 관리 모달 ── */}
      {isModalOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000 }}>
          <div style={{ background:C.panel, border:`2px solid ${C.info}`, borderRadius:24, padding:45, width:650 }}>
            <div style={{ fontSize:32, fontWeight:950, marginBottom:35, color:C.info, display:'flex', alignItems:'center', gap:15 }}>
              <BookOpen size={36}/> 새 교육 이력 등록
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
              <div>
                <div style={{ fontSize:18, color:C.sub, marginBottom:12, fontWeight:800 }}>교육 이수 선원 선택</div>
                <select value={newEdu.id} onChange={e => {
                    const c = CREW.find(x => x.id === e.target.value);
                    if(c) setNewEdu({...newEdu, id:c.id, name:c.name, dept:c.dept});
                  }} style={{ width:'100%', backgroundColor:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 44px 18px 20px', color:'#fff', fontSize:20, fontWeight:700, outline:'none' }}>
                  <option value="">선원을 선택하세요 (이름 ⏐ ID ⏐ 부서)</option>
                  {CREW.map(c => <option key={c.id} value={c.id}>{c.name} ⏐ {c.id} ⏐ {c.dept}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:18, color:C.sub, marginBottom:12, fontWeight:800 }}>교육 과정</div>
                <select value={newEdu.type} onChange={e=>setNewEdu({...newEdu, type:e.target.value})} style={{ width:'100%', backgroundColor:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 44px 18px 20px', color:'#fff', fontSize:20, fontWeight:700, outline:'none' }}>
                  <option>기본 CPR (심폐소생술)</option>
                  <option>의료 응급 처치 (STCW)</option>
                  <option>선상 응급 의료 (Advanced)</option>
                  <option>AED 기기 작동법</option>
                  <option>원격 의료 장비 운용 교육</option>
                </select>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                <div onClick={() => setDateEditor({ field:'date' })} style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 20px', color:'#fff', fontSize:20, fontWeight:700, cursor:'pointer', minHeight:60, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  {newEdu.date || '이수 날짜'} <Clock size={20} color={C.sub} />
                </div>
                <div onClick={() => setDateEditor({ field:'expiry' })} style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 20px', color:'#fff', fontSize:20, fontWeight:700, cursor:'pointer', minHeight:60, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  {newEdu.expiry || '만료 날짜'} <Clock size={20} color={C.sub} />
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:18, marginTop:45 }}>
              <button onClick={()=>setIsModalOpen(false)} style={{ flex:1, padding:20, borderRadius:15, background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}`, color:C.sub, fontSize:22, fontWeight:800, cursor:'pointer' }}>취소</button>
              <button onClick={addEdu} style={{ flex:2, padding:20, borderRadius:15, background:C.info, border:'none', color:'#000', fontSize:22, fontWeight:950, cursor:'pointer' }}>이력 저장하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 사이드 네비 */}
      <nav style={{ width:86, flexShrink:0, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', alignItems:'center', paddingTop:28, gap:10, background:C.panel }}>
        {['현황','건강','시스템'].map((l, i) => (
          <button key={i} onClick={() => document.getElementById(`s${i+1===3?5:i+1}`)?.scrollIntoView({ behavior:'smooth' })}
            style={{ width:65, height:65, borderRadius:12, background:'transparent', border:'1px solid transparent', cursor:'pointer', fontSize:17, fontWeight:800, color:C.sub }}>{l}</button>
        ))}
      </nav>

      <div style={{ flex:1, overflowY:'auto', padding:'35px 42px' }}>
        {/* 헤더 */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:35, paddingBottom:24, borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:18 }}>
            <Dot color={C.success} pulse />
            <Ship size={28} color={C.info} />
            <span style={{ fontSize:26, fontWeight:800 }}>MDTS 통합 인프라 관리</span>
            <Tag color={C.cyan} style={{ fontSize:18 }}>MV KOREA STAR</Tag>
          </div>
          <div style={{ fontSize:22, color:C.sub, display:'flex', gap:36, alignItems:'center' }}>
            <span><Clock size={22}/> {now.toLocaleTimeString()}</span>
            <button onClick={handleManualRefresh} style={{ background:'rgba(38,222,129,0.1)', border:'1px solid rgba(38,222,129,0.3)', padding:'8px 18px', borderRadius:10, color:C.success, fontSize:20, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:10, transition:'all 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='rgba(38,222,129,0.2)'} onMouseOut={e=>e.currentTarget.style.background='rgba(38,222,129,0.1)'}>
              <RefreshCw size={22}/> 즉시 갱신
            </button>
          </div>
        </div>

        {/* ══ S1 : 의료 현황 ══ */}
        <Section id="s1" label="선박 의료 실시간 현황" color={C.cyan} collapsed={collapsed.s1} onToggle={() => fold('s1')}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:20, marginBottom:30 }}>
            {[
              { l:'응급 장비 신뢰도', v:checkPct, u:'%', c:C.success, s:'정기 점검 완료', i:<ShieldCheck size={26}/>, p:checkPct },
              { l:'대응 가용 인원', v:trainingList.length, u:'명', c:C.info, s:'즉시 투입 가능', i:<Users size={26}/>, p:Math.min(100, (trainingList.length/10)*100) },
              { l:'의료 소모품 재고', v:'94', u:'%', c:C.cyan, s:'필수 의약품 24종', i:<Pill size={26}/>, p:94 },
              { l:'최근접 구조 거점', v:'85', u:'km', h:'부산 해양병원', c:C.warning, s:'도착 예정 시간 2시간 10분', i:<MapPin size={26}/>, p:30 },
            ].map((s,idx)=>(
              <div key={idx} className="kpi-card" style={{ background: `rgba(17, 19, 24, 0.6)`, backdropFilter: 'blur(20px)', border: `1.5px solid ${s.c}44`, borderRadius: 22, padding: '24px 28px', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15 }}>
                  <div style={{ fontSize:22, color:C.sub, fontWeight:800 }}>{s.l}</div>
                  <div style={{ padding:10, borderRadius:12, background:`${s.c}18`, color:s.c }}>{s.i}</div>
                </div>
                <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:10, flexWrap:'wrap' }}>
                  <span style={{ fontSize:58, fontWeight:950, color:s.c }}>{s.v}</span>
                  <span style={{ fontSize:26, color:C.sub, fontWeight:800 }}>{s.u}</span>
                  {s.h && <span style={{ fontSize:20, color:'#fff', fontWeight:700, marginLeft:5, background:'rgba(255,255,255,0.05)', padding:'4px 12px', borderRadius:8 }}>{s.h}</span>}
                </div>
                <div style={{ fontSize:19, color:'#fff', fontWeight:700, marginBottom:18, display:'flex', alignItems:'center', gap:10 }}><div style={{ width:10, height:10, borderRadius:'50%', background:s.c }} />{s.s}</div>
                <div style={{ height:10, background:'rgba(255,255,255,0.05)', borderRadius:5, overflow:'hidden' }}><div style={{ height:'100%', width:`${s.p}%`, background:`linear-gradient(90deg, ${s.c}88, ${s.c})`, borderRadius:5 }} /></div>
              </div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
            <GPanel title="응급 대응 준비 상태" icon={<Shield size={22} color={C.success}/>} right={<span style={{ fontSize:25, fontWeight:900 }}>{checkPct}%</span>}>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {CHECKLIST.map((item, i) => (
                  <div key={i} onClick={()=>toggle(i)} style={{ display:'flex', alignItems:'center', gap:18, cursor:'pointer', padding:'15px 22px', borderRadius:10, background: checks[i] ? `${C.success}08` : C.panel2, border:`1px solid ${checks[i] ? `${C.success}33` : C.border}` }}>
                    <div style={{ width:24, height:24, borderRadius:6, border:`2px solid ${checks[i] ? C.success : C.dim}`, background: checks[i] ? C.success : 'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>{checks[i] && <CheckCircle2 size={18} color="#000" strokeWidth={3} />}</div>
                    <span style={{ fontSize:20, fontWeight: checks[i]?700:500 }}>{item}</span>
                  </div>
                ))}
              </div>
            </GPanel>
            <GPanel title="선원 의료 교육 이력" icon={<Users size={22} color={C.cyan}/>} right={<Btn color={C.info} small onClick={()=>setIsModalOpen(true)}>+</Btn>}>
              <div style={{ display:'flex', flexDirection:'column', gap:15 }}>
                {trainingList.map((r,i)=>{
                  const status = getStatusInfo(r.expiry)
                  return (
                    <div key={i} style={{ padding:'20px 25px', borderRadius:18, background:C.panel2, border:`1px solid ${C.border}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                        <div>
                          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}><span style={{ fontSize:26, fontWeight:900, color:'#fff' }}>{r.name}</span><Tag color={C.dim} small style={{ fontSize:15, padding:'4px 10px', color:C.text }}>{r.dept}</Tag></div>
                          <div style={{ fontSize:22, fontWeight:850, color:C.info }}>{r.type}</div>
                        </div>
                        <Tag color={status.color}>{status.label}</Tag>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        {r.expiry ? (
                          <div style={{ fontSize:17, color:C.sub, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                            <Clock size={14} color={C.sub}/> 만료일 : <span style={{ color: status.color, fontWeight:900 }}>{r.expiry}</span>
                          </div>
                        ) : <div />}
                        <div style={{ display:'flex', gap:8 }}>
                          <button
                            onClick={() => openEditEdu(i)}
                            style={{ padding:'5px 14px', borderRadius:8, background:`rgba(56,189,248,0.12)`, border:`1px solid rgba(56,189,248,0.35)`, color:C.info, fontSize:15, fontWeight:800, cursor:'pointer', flexShrink:0, transition:'all 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background='rgba(56,189,248,0.28)'}
                            onMouseLeave={e => e.currentTarget.style.background='rgba(56,189,248,0.12)'}
                          >
                            수정
                          </button>
                          <button
                            onClick={() => setDeleteEduTarget(i)}
                            style={{ padding:'5px 14px', borderRadius:8, background:`rgba(255,77,109,0.12)`, border:`1px solid rgba(255,77,109,0.35)`, color:C.danger, fontSize:15, fontWeight:800, cursor:'pointer', flexShrink:0, transition:'all 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background='rgba(255,77,109,0.28)'}
                            onMouseLeave={e => e.currentTarget.style.background='rgba(255,77,109,0.12)'}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </GPanel>
          </div>
          <div style={{ marginTop: 25 }}>
            <GPanel
              title="관리자 등록 현황"
              icon={<ShieldCheck size={22} color={C.purple}/>}
              right={<Btn color={C.purple} small onClick={()=>setIsManagerModalOpen(true)}>+</Btn>}
            >
              {managers.length === 0 ? (
                <div style={{ textAlign:'center', padding:'30px 0', color:C.sub, fontSize:20, fontWeight:700 }}>등록된 관리자가 없습니다.</div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:15 }}>
                  {managers.map((m, i) => (
                    <div key={m.id} style={{ background:C.panel2, border:`1.5px solid ${C.border}`, borderRadius:16, padding:'22px 20px', display:'flex', flexDirection:'column', gap:10, position:'relative' }}>
                      <div style={{ fontSize:13, fontWeight:800, color:C.purple, background:`${C.purple}18`, padding:'3px 10px', borderRadius:6, border:`1px solid ${C.purple}40`, width:'fit-content' }}>{m.role}</div>
                      <div style={{ fontSize:26, fontWeight:950, color:'#fff' }}>{m.name}</div>
                      <div style={{ fontSize:18, color:C.sub, fontWeight:700 }}>{m.dept} · {m.id}</div>
                      <div style={{ display:'flex', gap:6, justifyContent:'flex-end', marginTop:2 }}>
                        <button
                          onClick={() => setEditManagerTarget({ ...m })}
                          style={{ padding:'4px 10px', borderRadius:7, background:'rgba(56,189,248,0.1)', border:'1px solid rgba(56,189,248,0.3)', color:C.info, fontSize:13, fontWeight:800, cursor:'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background='rgba(56,189,248,0.25)'}
                          onMouseLeave={e => e.currentTarget.style.background='rgba(56,189,248,0.1)'}
                        >수정</button>
                        <button
                          onClick={() => setDeleteManagerTarget(m)}
                          style={{ padding:'4px 10px', borderRadius:7, background:'rgba(255,77,109,0.1)', border:'1px solid rgba(255,77,109,0.3)', color:C.danger, fontSize:13, fontWeight:800, cursor:'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background='rgba(255,77,109,0.25)'}
                          onMouseLeave={e => e.currentTarget.style.background='rgba(255,77,109,0.1)'}
                        >삭제</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GPanel>
          </div>
          <div style={{ marginTop: 25, display:'grid', gridTemplateColumns:'1fr 340px', gap:20 }}>
            <GPanel
              title="필수 의료 약품 및 소모품 재고 관리" 
              icon={<Pill size={22} color={C.warning}/>}
              right={<Btn color={C.warning} small onClick={openNewMedModal}>+</Btn>}
            >
              <div style={{ maxHeight: 380, overflowY: 'auto', paddingRight: 10 }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:15 }}>
                  {[...meds].sort((a,b) => a.n.localeCompare(b.n, 'ko')).map(m => {
                    const isLow = m.q <= m.m;
                    const expDiff = m.e && m.e !== '-' ? Math.ceil((new Date(m.e) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                    const isExpired = expDiff !== null && expDiff < 0;
                    const isExpiringSoon = expDiff !== null && expDiff >= 0 && expDiff < 90;
                    const expColor = isExpired ? C.danger : isExpiringSoon ? C.warning : C.success;
                    const expLabel = isExpired ? '만료됨' : isExpiringSoon ? '만료임박' : '유효';
                    const borderColor = isExpired ? C.danger+'88' : isLow ? C.warning+'66' : C.border;
                    return (
                      <div key={m.id} style={{ background:C.panel, border:`1.5px solid ${borderColor}`, borderRadius:12, padding:'20px', position:'relative' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                          <div style={{ fontSize:20, color:C.sub, fontWeight:800, display:'flex', alignItems:'center', gap:5 }}>
                            {m.cat === 'pill' ? <Pill size={17}/> : m.cat === 'liquid' ? <Activity size={17}/> : <Shield size={17}/>} {m.c}
                          </div>
                          <div style={{ display:'flex', gap:4 }}>
                            <button onClick={()=>{
                              const initialE = (m.e === '-' || !m.e) ? todayStr : m.e;
                              setEditMed({...m, e: initialE});
                            }} style={{ background:'rgba(56,189,248,0.1)', border:'1px solid rgba(56,189,248,0.3)', borderRadius:6, padding:'3px 8px', color:C.info, fontSize:13, fontWeight:800, cursor:'pointer' }}>수정</button>
                            <button onClick={()=>deleteMed(m.id)} style={{ background:'rgba(255,77,109,0.1)', border:'1px solid rgba(255,77,109,0.3)', borderRadius:6, padding:'3px 8px', color:C.danger, fontSize:13, fontWeight:800, cursor:'pointer' }}>삭제</button>
                          </div>
                        </div>
                        <div style={{ fontSize:30, fontWeight:900, color:'#fff', marginBottom:12 }}>{m.n}</div>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:C.panel2, padding:'10px 15px', borderRadius:10, border:`1px solid ${C.border}` }}>
                          <button onClick={()=>updateMed(m.id, -1)} style={{ background:'none', border:'none', color:C.info, cursor:'pointer', fontSize:36, fontWeight:900 }}>-</button>
                          <div style={{ textAlign:'center' }}>
                            <div style={{ fontSize:34, fontWeight:950, color:isLow ? C.warning : C.success }}>{m.q}</div>
                            <div style={{ fontSize:20, color:C.sub, fontWeight:700 }}>최소 {m.m}</div>
                          </div>
                          <button onClick={()=>updateMed(m.id, 1)} style={{ background:'none', border:'none', color:C.info, cursor:'pointer', fontSize:36, fontWeight:900 }}>+</button>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:10 }}>
                          {expDiff !== null ? (
                            <>
                              <span style={{ fontSize:17.2, fontWeight:800, color:expColor, background:`${expColor}18`, border:`1px solid ${expColor}44`, borderRadius:5, padding:'2px 7px' }}>{isExpired ? '만료됨' : isExpiringSoon ? '만료임박' : '유통기한'}</span>
                              <span style={{ fontSize:17.2, color:C.sub, fontWeight:700 }}>~{m.e}</span>
                            </>
                          ) : (
                            <span style={{ fontSize:17.2, color:C.sub, fontWeight:700 }}>유통기한 없음</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </GPanel>

            <GPanel title="의약품 보관 환경" icon={<Sparkles size={22} color={C.success}/>}>
              <div style={{ display:'flex', flexDirection:'column', gap:20, height:'100%', justifyContent:'center' }}>
                <div style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${C.border}`, borderRadius:20, padding:30, textAlign:'center', position:'relative', overflow:'hidden' }}>
                  <div style={{ fontSize:22, color:C.sub, fontWeight:800, marginBottom:15, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}><Activity size={20} color={C.success}/> 실시간 온도</div>
                  <div style={{ fontSize:72, fontWeight:950, color:C.success, letterSpacing:'-2px' }}>{medEnv.temp}<span style={{ fontSize:32, color:C.sub, marginLeft:8 }}>°C</span></div>
                  <div style={{ fontSize:18, color:C.success, fontWeight:700, marginTop:10, opacity:0.8 }}>상태 : 최적 (15~25°C)</div>
                </div>
                <div style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${C.border}`, borderRadius:20, padding:30, textAlign:'center' }}>
                  <div style={{ fontSize:22, color:C.sub, fontWeight:800, marginBottom:15, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}><Sparkles size={20} color={C.info}/> 실시간 습도</div>
                  <div style={{ fontSize:72, fontWeight:950, color:C.info, letterSpacing:'-2px' }}>{medEnv.humi}<span style={{ fontSize:32, color:C.sub, marginLeft:8 }}>%</span></div>
                  <div style={{ fontSize:18, color:C.info, fontWeight:700, marginTop:10, opacity:0.8 }}>상태 : 건조 (40~60%)</div>
                </div>
              </div>
            </GPanel>
          </div>
        </Section>

        {/* ══ S2 : 선원 건강 ══ */}
        <Section id="s2" label="선원 건강 모니터링" color={C.success} collapsed={collapsed.s2} onToggle={()=>fold('s2')}>
          <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:18 }}>
            <GPanel 
              title="선원 건강 위험도 히트맵" 
              icon={<Activity size={22} color={C.success}/>}
              right={
                <div style={{ display: 'flex', gap: 15, padding: '8px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                  {[
                    { label: '위험', color: C.danger },
                    { label: '주의', color: C.warning },
                    { label: '양호', color: C.success }
                  ].map(idx => (
                    <div key={idx.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: idx.color }} />
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#94a3b8' }}>{idx.label}</span>
                    </div>
                  ))}
                </div>
              }
            >
              <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                {CREW.map(c => <div key={c.id} style={{ width:85, padding:'12px 5px', borderRadius:10, background:`${riskOf(c)}1a`, border:`1px solid ${riskOf(c)}44`, textAlign:'center' }}><div style={{ fontSize:17, fontWeight:800, color:riskOf(c) }}>{c.name}</div><div style={{ width:10, height:10, borderRadius:'50%', background:riskOf(c), margin:'5px auto 0' }}/></div>)}
              </div>
            </GPanel>
            <GPanel title="건강 위험 분포" icon={<Activity size={22} color={C.danger}/>}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '8px 0' }}>
                <div style={{ width: 240, height: 240, position: 'relative', flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{v:70,c:C.success},{v:20,c:C.warning},{v:10,c:C.danger}]} innerRadius={75} outerRadius={110} dataKey="v" stroke="none">{[{v:70,c:C.success},{v:20,c:C.warning},{v:10,c:C.danger}].map((e,idx)=><Cell key={idx} fill={e.c}/>)}</Pie></PieChart></ResponsiveContainer>
                  <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center' }}><div style={{ fontSize:18, color:C.sub }}>안전도</div><div style={{ fontSize:38, fontWeight:900 }}>82%</div></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 140 }}>
                  {[
                    { label: '양호', val: 70, color: C.success },
                    { label: '주의', val: 20, color: C.warning },
                    { label: '위험', val: 10, color: C.danger }
                  ].map(d => (
                    <div key={d.label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 20, fontWeight: 800, color: d.color }}>{d.label}</span>
                        <span style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{d.val}%</span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}><div style={{ width: `${d.val}%`, height: '100%', background: d.color, borderRadius: 3 }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </GPanel>
          </div>
        </Section>

        {/* ══ S5 : 시스템 관리 ══ */}
        <Section id="s5" label="시스템 관리 및 장비 건전성" color={C.warning} collapsed={collapsed.s5} onToggle={()=>fold('s5')}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:18, marginBottom:24 }}>
            {[
              {l:'위성 신호', v:'매우 강함', c:C.success, s:'스타링크 3세대', i:<Wifi size={24}/>, f:handleSignalScan},
              {l:'응답 속도', v:'42ms', c:C.info, s:'상태 안정 (저지연)', i:<Activity size={24}/>},
              {l:'데이터 동기화', v:'09:31', c:C.success, s:'최신 동기화 완료', i:<RefreshCw size={24}/>, f:handleSyncData},
              {l:'AI 엔진 버전', v:'v2.4.1', c:C.purple, s:'공식 안정 배포판', i:<Cpu size={24}/>}
            ].map((s,i)=>(
              <div key={i} onClick={s.f} className="sys-kpi-card" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1.5px solid rgba(255, 255, 255, 0.05)', borderRadius: 20, padding: '24px 28px', position: 'relative', overflow: 'hidden', cursor: s.f ? 'pointer' : 'default' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15 }}>
                  <div style={{ fontSize:18, color:C.sub, fontWeight:800 }}>{s.l}</div>
                  <div style={{ color:s.c }}>{s.i}</div>
                </div>
                <div style={{ fontSize:34, fontWeight:950, color:'#fff', marginBottom:8 }}>{s.v}</div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}><div style={{ width:6, height:6, borderRadius:'50%', background:s.c }} /><div style={{ fontSize:15, color:C.sub, fontWeight:700 }}>{s.s}</div></div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:18, marginBottom:18 }}>
            <GPanel 
              title="위성 신호 품질 (24시간)" 
              icon={<Wifi size={22} color={C.info}/>}
              right={<Btn color={C.info} small onClick={handleSignalScan}><RefreshCw size={18}/></Btn>}
            >
              <div style={{ height:220 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={signal}><Area type="monotone" dataKey="v" stroke={C.info} fill={C.info} fillOpacity={0.1} strokeWidth={4} dot={false}/></AreaChart></ResponsiveContainer></div>
            </GPanel>
            <GPanel 
              title="실시간 선박 좌표" 
              icon={<MapPin size={22} color={C.cyan}/>}
              right={
                !isEditingCoords ? (
                  <Btn color={C.cyan} small onClick={startEditingCoords}><Edit2 size={18}/></Btn>
                ) : (
                  <div style={{ display:'flex', gap:8 }}>
                    <Btn color={C.sub} small onClick={() => setIsEditingCoords(false)}>취소</Btn>
                    <Btn color={C.success} small onClick={saveCoords}>저장</Btn>
                  </div>
                )
              }
            >
              <div style={{ display:'flex', flexDirection:'column', gap:25, justifyContent:'center', height:220 }}>
                <div style={{ background:'rgba(13,217,197,0.05)', border:`1px solid ${C.cyan}33`, borderRadius:15, padding:'20px', textAlign:'center' }}>
                  <div style={{ fontSize:16, color:C.sub, fontWeight:800, marginBottom:8 }}>위도 (LAT)</div>
                  {isEditingCoords ? (
                    <input value={tempCoords.lat} onChange={e => setTempCoords({...tempCoords, lat: e.target.value})} style={{ background:C.panel2, border:`1px solid ${C.cyan}44`, borderRadius:8, color:'#fff', fontSize:22, fontWeight:900, textAlign:'center', width:'100%', padding:'5px' }} />
                  ) : (
                    <div style={{ fontSize:28, fontWeight:900, color:C.cyan }}>{coords.lat}</div>
                  )}
                </div>
                <div style={{ background:'rgba(13,217,197,0.05)', border:`1px solid ${C.cyan}33`, borderRadius:15, padding:'20px', textAlign:'center' }}>
                  <div style={{ fontSize:16, color:C.sub, fontWeight:800, marginBottom:8 }}>경도 (LNG)</div>
                  {isEditingCoords ? (
                    <input value={tempCoords.lng} onChange={e => setTempCoords({...tempCoords, lng: e.target.value})} style={{ background:C.panel2, border:`1px solid ${C.cyan}44`, borderRadius:8, color:'#fff', fontSize:22, fontWeight:900, textAlign:'center', width:'100%', padding:'5px' }} />
                  ) : (
                    <div style={{ fontSize:28, fontWeight:900, color:C.cyan }}>{coords.lng}</div>
                  )}
                </div>
              </div>
            </GPanel>
            <GPanel 
              title="기기 상세 정보" 
              icon={<HardDrive size={22} color={C.warning}/>}
              right={
                !isEditingDevice ? (
                  <Btn color={C.warning} small onClick={startEditingDevice}><Edit2 size={18}/></Btn>
                ) : (
                  <div style={{ display:'flex', gap:10 }}>
                    <Btn color={C.sub} small onClick={cancelEditingDevice}>취소</Btn>
                    <Btn color={C.success} small onClick={saveDeviceInfo}>저장</Btn>
                  </div>
                )
              }
            >
              <div style={{ display:'flex', flexDirection:'column', marginTop:10 }}>
                {(isEditingDevice ? tempDeviceInfo : deviceInfo).map(d => (
                  <div key={d.k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:19, height: 60, borderBottom: d.k === 'warranty' ? 'none' : '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ color:C.sub }}>{d.l}</span>
                    <div style={{ textAlign: 'right' }}>
                      {isEditingDevice ? (
                        <input 
                          value={d.v} 
                          onChange={e => handleDeviceChange(d.k, e.target.value)}
                          style={{ background:C.panel2, border:`1px solid ${C.border}`, borderRadius:8, color:'#fff', padding:'5px 10px', fontSize:18, textAlign:'right', width:'100%' }}
                        />
                      ) : (
                        <span style={{ fontWeight:700 }}>{d.v}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </GPanel>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 2fr', gap:18 }}>
            <GPanel title="보안 설정" icon={<Lock size={22} color={C.success}/>}>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[{l:'데이터베이스 암호화', k:'db_enc'},{l:'이미지 데이터 보안 관리', k:'img_sec'},{l:'전송 구간 암호화', k:'tls_sync'},{l:'네트워크 분리 설정', k:'net_iso'},{l:'로그 위변조 방지 시스템', k:'log_audit'},{l:'오프라인 데이터 보호', k:'offline_sec'}].map(s=>(
                  <div key={s.k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:18 }}>
                    <span style={{ color:C.sub, fontWeight:700 }}>{s.l}</span>
                    <Toggle on={sec[s.k]} color={C.success} onChange={() => handleToggleSec(s.k, s.l)}/>
                  </div>
                ))}
              </div>
            </GPanel>
            <GPanel title="AI 분석 모델" icon={<Cpu size={22} color={C.purple}/>}>
              <div style={{ display:'flex', flexDirection:'column', gap:12, fontSize:19 }}>
                {/* TODO: 백엔드 연동 시 API로 엔진 버전 및 진단 정확도 동적 반영 필요 */}
                <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:C.sub }}>엔진 버전</span><span style={{ color:C.purple, fontWeight:800 }}>v2.4.1</span></div>
                <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:C.sub }}>진단 정확도</span><span style={{ color:C.success, fontWeight:800 }}>94.7%</span></div>
                <Btn color={updateStatus === 'NEW' ? C.warning : updateStatus === 'CHECKING' ? C.sub : C.purple} small style={{ marginTop:15, position:'relative', overflow:'hidden' }} onClick={handleUpdateCheck} disabled={updateStatus === 'CHECKING'}>
                  {updateStatus === 'IDLE' && '업데이트 확인'}
                  {updateStatus === 'CHECKING' && '서버 연결 중...'}
                  {updateStatus === 'LATEST' && '최신 버전'}
                  {updateStatus === 'NEW' && '새 버전 설치'}
                  {updateStatus === 'CHECKING' && <div style={{ position:'absolute', bottom:0, left:0, height:3, background:C.purple, animation:'progress-flow 2s linear infinite' }} />}
                </Btn>
              </div>
            </GPanel>
            <GPanel title="시스템 활동 로그" icon={<Terminal size={22} color={C.sub}/>}>
              <div ref={logContainerRef} style={{ height:300, overflowY:'auto', background:'#060809', padding:18, borderRadius:12, fontFamily:'monospace', fontSize:17, border:`1px solid ${C.border}` }}>
                {activities.map((l,i)=><div key={i} style={{ marginBottom:8 }}><span style={{ color:C.sub }}>[{l.t}]</span> <span style={{ color:l.type==='error'?C.danger:l.type==='warning'?C.warning:C.info }}>{l.msg}</span></div>)}
              </div>
            </GPanel>
          </div>
        </Section>
      </div>

      {/* ── 관리자 등록 모달 ── */}
      {isManagerModalOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000 }}>
          <div style={{ background:C.panel, border:`2px solid ${C.purple}`, borderRadius:24, padding:45, width:560 }}>
            <div style={{ fontSize:32, fontWeight:950, marginBottom:35, color:C.purple, display:'flex', alignItems:'center', gap:15 }}>
              <ShieldCheck size={36}/> 관리자 등록
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:20, marginBottom:35 }}>
              <div>
                <div style={{ fontSize:18, color:C.sub, fontWeight:800, marginBottom:10 }}>선원 선택</div>
                <select
                  value={newManager.id}
                  onChange={e => {
                    const crew = CREW.find(c => c.id === e.target.value)
                    setNewManager(p => ({ ...p, id: e.target.value, name: crew?.name || '', dept: crew?.dept || '' }))
                  }}
                  style={{ width:'100%', backgroundColor:C.panel2, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 44px 14px 18px', color:'#fff', fontSize:20, fontWeight:700, outline:'none' }}
                >
                  <option value="">-- 선원 선택 --</option>
                  {CREW.filter(c => !managers.find(m => m.id === c.id)).map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.role} · {c.dept})</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize:18, color:C.sub, fontWeight:800, marginBottom:10 }}>담당 역할</div>
                <select
                  value={newManager.role}
                  onChange={e => setNewManager(p => ({ ...p, role: e.target.value }))}
                  style={{ width:'100%', backgroundColor:C.panel2, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 44px 14px 18px', color:'#fff', fontSize:20, fontWeight:700, outline:'none' }}
                >
                  {MANAGER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:15 }}>
              <button onClick={()=>setIsManagerModalOpen(false)} style={{ flex:1, padding:20, borderRadius:15, background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}`, color:C.sub, fontSize:22, fontWeight:800, cursor:'pointer' }}>취소</button>
              <button onClick={addManager} style={{ flex:2, padding:20, borderRadius:15, background:C.purple, color:'#000', fontSize:22, fontWeight:950, cursor:'pointer', border:'none' }}>등록</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 의료 소모품 추가 모달 ── */}
      {/* ── 약품 수정 모달 ── */}
      {editMed && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000 }}>
          <div style={{ background:C.panel, border:`2px solid ${C.info}`, borderRadius:24, padding:45, width:560 }}>
            <div style={{ fontSize:28, fontWeight:950, marginBottom:30, color:C.info, display:'flex', alignItems:'center', gap:12 }}>
              <Pill size={30}/> 약품 정보 수정
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:16, marginBottom:30 }}>
              {[
                { label:'약품명', field:'n', placeholder:'예: 타이레놀' },
                { label:'효능/분류', field:'c', placeholder:'예: 해열진통' },
                { label:'유통기한 (YYYY-MM-DD)', field:'e', placeholder:'2027-05-20 (없으면 -)' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <div style={{ fontSize:16, color:C.sub, fontWeight:800, marginBottom:8 }}>{label}</div>
                  <input value={editMed[field] || ''} onChange={e=>setEditMed(p=>({...p,[field]:e.target.value}))} placeholder={field === 'e' ? todayStr : placeholder} style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 18px', color:'#fff', fontSize:18, fontWeight:700, outline:'none', boxSizing:'border-box' }} />
                </div>
              ))}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div>
                  <div style={{ fontSize:16, color:C.sub, fontWeight:800, marginBottom:8 }}>현재 수량</div>
                  <input type="number" value={editMed.q} onChange={e=>setEditMed(p=>({...p,q:parseInt(e.target.value)||0}))} style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 18px', color:'#fff', fontSize:18, fontWeight:700, outline:'none', boxSizing:'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize:16, color:C.sub, fontWeight:800, marginBottom:8 }}>최소 수량</div>
                  <input type="number" value={editMed.m} onChange={e=>setEditMed(p=>({...p,m:parseInt(e.target.value)||0}))} style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 18px', color:'#fff', fontSize:18, fontWeight:700, outline:'none', boxSizing:'border-box' }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize:16, color:C.sub, fontWeight:800, marginBottom:8 }}>분류</div>
                <select value={editMed.cat} onChange={e=>setEditMed(p=>({...p,cat:e.target.value}))} style={{ width:'100%', background:C.panel2, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 44px 14px 18px', color:'#fff', fontSize:18, fontWeight:700, outline:'none' }}>
                  {[['pill','알약'],['liquid','액체'],['cream','연고'],['pad','패드/거즈'],['bandage','붕대/고정']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:15 }}>
              <button onClick={()=>setEditMed(null)} style={{ flex:1, padding:20, borderRadius:15, background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}`, color:C.sub, fontSize:20, fontWeight:800, cursor:'pointer' }}>취소</button>
              <button onClick={saveEditMed} style={{ flex:2, padding:20, borderRadius:15, background:C.info, color:'#000', fontSize:20, fontWeight:950, cursor:'pointer', border:'none' }}>저장</button>
            </div>
          </div>
        </div>
      )}

      {isMedModalOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000 }}>
          <div style={{ background:C.panel, border:`2px solid ${C.warning}`, borderRadius:24, padding:45, width:600 }}>
            <div style={{ fontSize:32, fontWeight:950, marginBottom:35, color:C.warning, display:'flex', alignItems:'center', gap:15 }}>
              <Pill size={36}/> 새 의료 소모품 등록
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
              <div>
                <div style={{ fontSize:18, color:C.sub, marginBottom:12, fontWeight:800 }}>약품/소모품 명칭</div>
                <input value={newMed.n} onChange={e=>setNewMed({...newMed, n:e.target.value})} placeholder="예: 항생제 연고" style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 20px', color:'#fff', fontSize:20, fontWeight:700, outline:'none' }} />
              </div>
              <div>
                <div style={{ fontSize:18, color:C.sub, marginBottom:12, fontWeight:800 }}>주요 효능/분류</div>
                <input value={newMed.c} onChange={e=>setNewMed({...newMed, c:e.target.value})} placeholder="예: 외상처치" style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 20px', color:'#fff', fontSize:20, fontWeight:700, outline:'none' }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                <div>
                  <div style={{ fontSize:18, color:C.sub, marginBottom:12, fontWeight:800 }}>현재 수량</div>
                  <input type="number" value={newMed.q} onChange={e=>setNewMed({...newMed, q:parseInt(e.target.value)})} style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 20px', color:'#fff', fontSize:20, fontWeight:700, outline:'none' }} />
                </div>
                <div>
                  <div style={{ fontSize:18, color:C.sub, marginBottom:12, fontWeight:800 }}>최소 재고량</div>
                  <input type="number" value={newMed.m} onChange={e=>setNewMed({...newMed, m:parseInt(e.target.value)})} style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 20px', color:'#fff', fontSize:20, fontWeight:700, outline:'none' }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize:18, color:C.sub, marginBottom:12, fontWeight:800 }}>유통기한 (YYYY-MM-DD)</div>
                <input value={newMed.e} onChange={e=>setNewMed({...newMed, e:e.target.value})} placeholder={todayStr + " (없으면 -)"} style={{ width:'100%', background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 20px', color:'#fff', fontSize:20, fontWeight:700, outline:'none', boxSizing:'border-box' }} />
              </div>
            </div>
            <div style={{ display:'flex', gap:18, marginTop:45 }}>
              <button onClick={()=>setIsMedModalOpen(false)} style={{ flex:1, padding:20, borderRadius:15, background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}`, color:C.sub, fontSize:22, fontWeight:800, cursor:'pointer' }}>취소</button>
              <button onClick={addMed} style={{ flex:2, padding:20, borderRadius:15, background:C.warning, border:'none', color:'#000', fontSize:22, fontWeight:950, cursor:'pointer' }}>재고 등록하기</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes progress-flow { 0% { width: 0%; } 100% { width: 100%; } }
        select {
          -webkit-appearance: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 14 9'%3E%3Cpath d='M1 1l6 6 6-6' stroke='%2394a3b8' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 20px center;
          padding-right: 44px !important;
          box-sizing: border-box;
        }
        .kpi-card:hover { transform: translateY(-8px); background: rgba(17, 19, 24, 0.8) !important; }
        .sys-kpi-card:hover { transform: translateY(-5px); background: rgba(255, 255, 255, 0.05) !important; }
        .premium-btn:hover { filter: brightness(1.2); }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:10px; }
      `}</style>
    </div>
  )
}

function CalendarModal({ onClose, onSelect }) {
  const [viewDate] = useState(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const days = Array.from({ length: firstDay }, () => null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(2,6,23,0.95)', backdropFilter: 'blur(40px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 650, background: '#0a1224', border: '2.5px solid #0dd9c5', borderRadius: 40, padding: 50 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
          <div style={{ fontSize: 42, fontWeight: 950, color: '#fff' }}>{year}년 {month + 1}월</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', width: 60, height: 60, borderRadius: 20, cursor: 'pointer' }}><X size={30}/></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, textAlign: 'center' }}>
          {['일','월','화','수','목','금','토'].map((d,i) => <div key={i} style={{ color: i===0?'#ff4d6d':i===6?'#38bdf8':'#64748b', fontWeight: 900, fontSize: 18, marginBottom: 15 }}>{d}</div>)}
          {days.map((d, i) => {
            const dateKey = d ? `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}` : null;
            return <div key={i} onClick={() => d && onSelect(dateKey)} style={{ height: 65, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 18, fontSize: 24, fontWeight: 800, cursor: d?'pointer':'default', background: 'rgba(255,255,255,0.02)', color: '#fff' }}>{d}</div>
          })}
        </div>
      </div>
    </div>
  )
}


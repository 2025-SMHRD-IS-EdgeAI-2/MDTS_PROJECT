import { useState, useEffect, useRef } from 'react'
import {
  Brain, RotateCcw, TrendingUp, TrendingDown, Minus,
  Heart, Droplets, Thermometer, Activity, Shield, AlertTriangle,
  ShieldAlert, ChevronRight, ChevronLeft, Play, Pause, Clock,
  CheckCircle2, Zap, Radio,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip,
} from 'recharts'

// ═══════════════════════════════════════════════
//  DATA
// ═══════════════════════════════════════════════

const RISK_SCORE = 72

const DIAGNOSES = [
  {
    confidence: 94, title: '급성 심근경색', subtitle: '의심', icd: 'I21.9', severity: 'critical', color: '#ff4d6d',
    desc: '흉통·호흡곤란·혈압 상승(158/95)과 고혈압·고지혈증 병력 종합 분석 결과 급성 심근경색 가능성 매우 높음.',
    actions: [
      { level: 'critical', text: '즉시 원격 진료 연결' },
      { level: 'critical', text: '12유도 심전도 측정 시작' },
      { level: 'critical', text: 'CPR 장비 즉각 준비' },
      { level: 'warn',     text: '아스피린 알레르기 → 클로피도그렐 대체' },
    ],
  },
  {
    confidence: 61, title: '고혈압성 위기', subtitle: '', icd: 'I10', severity: 'high', color: '#ff9f43',
    desc: '수축기 혈압 158mmHg로 고혈압성 긴급증 범위. 기존 병력 및 미복약 가능성 확인 필요.',
    actions: [
      { level: 'high',   text: '혈압 15분 간격 재측정' },
      { level: 'high',   text: '반좌위(45°) 안정 유지' },
      { level: 'normal', text: '암로디핀 복용 여부 확인' },
      { level: 'normal', text: '신경학적 증상 모니터링' },
    ],
  },
  {
    confidence: 38, title: '불안정 협심증', subtitle: '', icd: 'I20.0', severity: 'medium', color: '#a55eea',
    desc: '안정 시 지속되는 흉통 및 ST 변화 가능성. 심근경색과 감별 진단 필요.',
    actions: [
      { level: 'high',   text: '안정 유지 및 활동 즉시 제한' },
      { level: 'high',   text: '산소포화도 지속 모니터링' },
      { level: 'normal', text: '니트로글리세린 투여 검토' },
    ],
  },
]

const VITALS = [
  { label: '심박수',      value: 96,   unit: 'bpm',  normal: '60–100',    status: 'warn',     trend: 'up',   Icon: Heart,       color: '#ff9f43' },
  { label: '수축기 혈압', value: 158,  unit: 'mmHg', normal: '< 120',     status: 'critical', trend: 'up',   Icon: Activity,    color: '#ff4d6d' },
  { label: '산소포화도',  value: 94,   unit: '%',    normal: '95–100',    status: 'warn',     trend: 'down', Icon: Droplets,    color: '#ff9f43' },
  { label: '체온',        value: 37.6, unit: '°C',   normal: '36.5–37.5', status: 'warn',     trend: 'up',   Icon: Thermometer, color: '#ff9f43' },
]

const TREND = [
  { t: '08:00', hr: 78, bp: 142 }, { t: '08:15', hr: 80, bp: 145 },
  { t: '08:30', hr: 82, bp: 148 }, { t: '08:45', hr: 85, bp: 150 },
  { t: '09:00', hr: 89, bp: 153 }, { t: '09:15', hr: 93, bp: 156 },
  { t: '09:30', hr: 96, bp: 158 },
]

const SEV_LABEL = { critical: '위험', high: '주의', medium: '경계' }
const ACT_COLOR = { critical: '#ff4d6d', warn: '#ff9f43', high: '#ff9f43', normal: '#0dd9c5' }
const ACT_BADGE = { critical: '즉시', warn: '주의', high: '우선', normal: '' }

const PROTOCOLS = [
  { id: 'cpr',      label: '심폐소생술', icon: '🫀', color: '#ff4d6d' },
  { id: 'cardiac',  label: '심근경색',   icon: '💓', color: '#ff4d6d' },
  { id: 'bleed',    label: '외상·지혈',  icon: '🩸', color: '#ff9f43' },
  { id: 'shock',    label: '쇼크 대응',  icon: '⚡', color: '#a55eea' },
  { id: 'fracture', label: '골절 고정',  icon: '🦴', color: '#4fc3f7' },
  { id: 'burn',     label: '화상 처치',  icon: '🔥', color: '#ff9f43' },
]

const GUIDES = {
  cpr: {
    title: '심폐소생술 (CPR)', color: '#ff4d6d',
    desc: '의식·호흡이 없을 때 즉시 시행. 4분 이내 시작이 생사를 결정합니다.',
    steps: [
      { icon: '🔍', title: '의식 확인 및 도움 요청', desc: '어깨를 두드리며 "괜찮으세요?" 반응 없으면 즉시 119 신고 및 AED 확보 요청.', tip: '"여기 사람 쓰러졌습니다! AED 가져오세요!"', tipColor: '#ff9f43', timer: null, hasCPR: false },
      { icon: '💪', title: '가슴 압박 30회', desc: '흉골 하부 1/2에 깍지 낀 두 손, 분당 100~120회, 5~6cm 깊이로 강하게 압박.', tip: '팔꿈치를 펴고 체중을 실어 압박. "하나, 둘, 셋…" 30회.', tipColor: '#ff4d6d', timer: null, hasCPR: true },
      { icon: '💨', title: '인공호흡 2회', desc: '기도 확보 후 코를 막고 입에 1초씩 2회 숨을 불어넣습니다.', tip: '가슴이 올라오는지 확인. 과호흡 금지.', tipColor: '#ff9f43', timer: null, hasCPR: false },
      { icon: '⚡', title: 'AED 부착 및 작동', desc: 'AED 전원 켜고 음성 안내에 따라 패드 부착. 분석·충격 시 손을 뗍니다.', tip: '패드 1 → 우측 쇄골 아래  |  패드 2 → 좌측 겨드랑이', tipColor: '#ff9f43', timer: null, hasCPR: false },
    ],
  },
  cardiac: {
    title: '급성 심근경색 응급 처치', color: '#ff4d6d',
    desc: '골든타임 90분 이내 혈관 재개통. 흉통·호흡곤란·식은땀 시 즉시 시행.',
    steps: [
      { icon: '🛏', title: '즉각 안정 및 활동 중단', desc: '즉시 앉히거나 눕히고 모든 신체 활동 중단. 옷깃·벨트를 느슨하게 풀어줍니다.', tip: '반좌위(45°)가 심장 부담을 가장 효과적으로 줄입니다.', tipColor: '#ff9f43', timer: 60, hasCPR: false },
      { icon: '💊', title: '약물 투여 전 알레르기 확인', desc: '아스피린 알레르기 없을 경우에만 300mg 씹어 복용. 알레르기 시 절대 투여 금지.', tip: '⚠ 현재 환자: 아스피린 알레르기 있음 → 투여 금지!', tipColor: '#ff4d6d', timer: null, hasCPR: false },
      { icon: '📊', title: '12유도 심전도 측정', desc: '심전도 기기를 연결하고 측정 후 즉시 원격의료팀에 전송.', tip: '전극 — 흉부 6곳(V1~V6) + 사지 4곳', tipColor: '#0dd9c5', timer: 180, hasCPR: false },
      { icon: '📡', title: '원격 의료진 연결 및 보고', desc: '위성통신으로 원격의료센터 연결 후 바이탈·심전도·증상 발현 시각 보고.', tip: '골든타임 — 증상 발생 후 90분 이내 혈관 재개통 필요.', tipColor: '#ff9f43', timer: null, hasCPR: false },
    ],
  },
  bleed: {
    title: '외상 및 대출혈 지혈', color: '#ff9f43',
    desc: '대량 출혈 시 수 분 이내 쇼크 발생 가능. 신속한 지혈이 생명을 구합니다.',
    steps: [
      { icon: '✋', title: '직접 압박 지혈', desc: '거즈를 상처에 대고 손바닥 전체로 강하게 압박. 거즈가 젖어도 절대 제거하지 말고 덧댑니다.', tip: '최소 10분 이상 압박 유지. 손을 떼면 출혈 재발.', tipColor: '#ff9f43', timer: 600, hasCPR: false },
      { icon: '⏱', title: '지혈대(Tourniquet) 적용', desc: '압박으로 지혈 안 되는 팔다리 대출혈 시, 상처 위 5~7cm에 지혈대 조입니다.', tip: '적용 시각 기록 필수. 2시간 이상 유지 금지.', tipColor: '#ff4d6d', timer: null, hasCPR: false },
      { icon: '⬆', title: '상처 부위 거상', desc: '출혈 부위를 심장보다 높게 유지해 혈압을 낮추고 출혈 속도를 늦춥니다.', tip: '골절 의심 시 거상 전 부목 고정 먼저.', tipColor: '#ff9f43', timer: null, hasCPR: false },
    ],
  },
  shock: {
    title: '쇼크 예방 및 응급 처치', color: '#a55eea',
    desc: '피부 창백·냉습, 의식 저하, 맥박 약화 시 쇼크 의심.',
    steps: [
      { icon: '🛏', title: '쇼크 체위 유지', desc: '편안하게 눕히고 다리를 20~30cm 높여 뇌 혈류를 증가시킵니다.', tip: '의식 없으면 회복 자세(옆으로 눕히기).', tipColor: '#a55eea', timer: null, hasCPR: false },
      { icon: '🌡', title: '보온 처치', desc: '담요·옷으로 감싸 체온 손실 방지 및 저체온증 예방.', tip: '차가운 바닥에 직접 눕히지 마세요.', tipColor: '#a55eea', timer: null, hasCPR: false },
      { icon: '📋', title: '바이탈 지속 관찰', desc: '의식·호흡·맥박 상태를 1분 단위로 체크하고 기록합니다.', tip: '이상 변화 발생 시 즉시 원격의료팀에 보고.', tipColor: '#0dd9c5', timer: null, hasCPR: false },
    ],
  },
  fracture: {
    title: '골절 및 탈구 고정', color: '#4fc3f7',
    desc: '골절 의심 시 함부로 움직이지 말고 즉시 고정.',
    steps: [
      { icon: '🔧', title: '부목 고정', desc: '위아래 관절이 움직이지 않도록 충분히 긴 부목을 대고 붕대로 고정.', tip: '부목 없으면 판자·우산 등 단단한 물건으로 대체 가능.', tipColor: '#4fc3f7', timer: null, hasCPR: false },
      { icon: '🧊', title: '냉찜질 실시', desc: '부목 고정 후 얼음주머니로 냉찜질을 시행합니다.', tip: '얼음 직접 접촉 금지. 수건으로 감싸서 사용.', tipColor: '#4fc3f7', timer: 1200, hasCPR: false },
      { icon: '🩺', title: '말단 순환 확인', desc: '손톱·발톱을 눌러 혈액순환 및 감각 여부를 주기적으로 확인.', tip: '2초 이내 혈색 회복 = 정상.', tipColor: '#4fc3f7', timer: null, hasCPR: false },
    ],
  },
  burn: {
    title: '화상 긴급 냉각 및 보호', color: '#ff9f43',
    desc: '즉각적인 냉각이 조직 손상을 최소화합니다.',
    steps: [
      { icon: '💧', title: '흐르는 물에 20분 냉각', desc: '12~25°C 찬물에 최소 20분 이상 노출시켜 열기를 식힙니다. 수압은 약하게 유지하십시오.', tip: '얼음물 절대 금지 — 저체온증·혈관 수축 위험.', tipColor: '#ff4d6d', timer: 1200, hasCPR: false },
      { icon: '💍', title: '의복 및 장신구 제거', desc: '피부가 붓기 전 반지·시계 등 신속 제거. 피부에 붙은 옷은 억지로 떼지 않음.', tip: '무리하게 당기면 피부가 함께 벗겨질 수 있습니다.', tipColor: '#ff9f43', timer: null, hasCPR: false },
      { icon: '🩹', title: '멸균 드레싱 보호', desc: '냉각 후 거즈로 느슨하게 덮습니다. 물집은 절대 터뜨리지 않습니다.', tip: '연고·치약·된장 도포 금지 — 감염 유발.', tipColor: '#ff4d6d', timer: null, hasCPR: false },
    ],
  },
}

function getRecommended(patient) {
  if (!patient) return null
  const chronic = (patient.chronic || '').toLowerCase()
  const hr = Number(patient.hr) || 0
  const spo2 = Number(patient.spo2) || 0
  const temp = Number(patient.temp) || 0
  const bp = parseInt((patient.bp || patient.vitals?.bp || '0').split('/')[0]) || 0
  const loc = (patient.location || '').toLowerCase()
  if (spo2 < 90 || hr > 120) return 'cpr'
  if (chronic.includes('고혈압') || bp > 150 || hr > 90) return 'cardiac'
  if (loc.includes('기관') || loc.includes('엔진') || loc.includes('갑판')) return 'fracture'
  if (temp >= 38.5) return 'shock'
  return null
}

function calcRiskScore(patient) {
  if (!patient) return 50
  let score = 20
  const hr = Number(patient.hr) || 0
  const spo2 = Number(patient.spo2) || 0
  const temp = Number(patient.temp) || 0
  const bp = parseInt((patient.bp || patient.vitals?.bp || '0').split('/')[0]) || 0
  const chronic = (patient.chronic || '')
  if (bp >= 160) score += 25
  else if (bp >= 140) score += 15
  if (hr > 110 || hr < 50) score += 20
  else if (hr > 90) score += 10
  if (spo2 < 90) score += 20
  else if (spo2 < 95) score += 10
  if (temp >= 39) score += 15
  else if (temp >= 38) score += 8
  const chronicCount = chronic === '없음' ? 0 : chronic.split(',').length
  score += chronicCount * 5
  if (patient.isEmergency) score += 10
  return Math.min(score, 99)
}

function buildDiagnoses(patient) {
  if (!patient) return DIAGNOSES
  const hr = Number(patient.hr) || 0
  const spo2 = Number(patient.spo2) || 0
  const temp = Number(patient.temp) || 0
  const bp = parseInt((patient.bp || patient.vitals?.bp || '0').split('/')[0]) || 0
  const chronic = (patient.chronic || '').toLowerCase()
  const allergies = (patient.allergies || '')
  const loc = (patient.location || '').toLowerCase()
  const results = []

  // 심근경색 / 심장 관련
  if (chronic.includes('고혈압') || bp > 150 || hr > 90) {
    const conf = Math.min(70 + (bp > 155 ? 20 : 0) + (chronic.includes('고지혈') ? 8 : 0) + (hr > 95 ? 5 : 0), 97)
    results.push({
      confidence: conf, title: '급성 심근경색', subtitle: '의심', icd: 'I21.9', severity: 'critical', color: '#ff4d6d',
      desc: `흉통·호흡곤란·혈압 ${bp}mmHg와 ${patient.chronic} 병력 종합 분석 결과 급성 심근경색 가능성 높음.`,
      actions: [
        { level: 'critical', text: '즉시 원격 진료 연결' },
        { level: 'critical', text: '12유도 심전도 측정 시작' },
        { level: 'critical', text: 'CPR 장비 즉각 준비' },
        allergies && !allergies.includes('없음') ? { level: 'warn', text: `${allergies} 알레르기 주의 — 투약 전 확인 필수` } : { level: 'normal', text: '아스피린 300mg 즉시 투여 검토' },
      ],
    })
  }

  // 고혈압성 위기
  if (bp >= 140) {
    const conf = Math.min(40 + (bp - 140) * 1.5, 80)
    results.push({
      confidence: Math.round(conf), title: '고혈압성 위기', subtitle: '', icd: 'I10', severity: 'high', color: '#ff9f43',
      desc: `수축기 혈압 ${bp}mmHg — 고혈압성 긴급증 범위. 기존 병력 및 미복약 가능성 확인 필요.`,
      actions: [
        { level: 'high',   text: '혈압 15분 간격 재측정' },
        { level: 'high',   text: '반좌위(45°) 안정 유지' },
        { level: 'normal', text: `${patient.lastMed || '처방 약물'} 복용 여부 확인` },
        { level: 'normal', text: '신경학적 증상 모니터링' },
      ],
    })
  }

  // 저산소증 / 호흡부전
  if (spo2 < 95) {
    const conf = Math.min(50 + (95 - spo2) * 10, 92)
    results.push({
      confidence: Math.round(conf), title: '저산소혈증', subtitle: '호흡부전 위험', icd: 'R09.02', severity: spo2 < 90 ? 'critical' : 'high', color: spo2 < 90 ? '#ff4d6d' : '#ff9f43',
      desc: `산소포화도 ${spo2}% — 정상 범위(95%) 미달. 기도 확보 및 산소 공급이 즉시 필요합니다.`,
      actions: [
        { level: 'critical', text: '즉시 산소 마스크 착용 (10L/min)' },
        { level: 'high',     text: '기도 개방 및 자세 교정' },
        { level: 'normal',   text: '호흡수·흉부 팽창 확인' },
      ],
    })
  }

  // 발열 / 감염
  if (temp >= 38.0) {
    const conf = Math.min(35 + (temp - 38) * 25, 85)
    results.push({
      confidence: Math.round(conf), title: temp >= 39 ? '패혈증 의심' : '발열 (감염성)', subtitle: '', icd: temp >= 39 ? 'A41.9' : 'R50.9', severity: temp >= 39 ? 'critical' : 'medium', color: temp >= 39 ? '#ff4d6d' : '#a55eea',
      desc: `체온 ${temp}°C 상승. ${temp >= 39 ? '패혈증 초기 징후 가능성 — 즉각 처치 필요.' : '감염성 발열 의심, 원인 파악 필요.'}`,
      actions: [
        { level: temp >= 39 ? 'critical' : 'high', text: '활력징후 연속 모니터링' },
        { level: 'high',   text: '해열제 투여 검토 (38.5°C 이상)' },
        { level: 'normal', text: '수분 공급 및 안정 유지' },
      ],
    })
  }

  // 외상 (위치 기반)
  if (loc.includes('기관') || loc.includes('엔진') || loc.includes('갑판') || loc.includes('화물')) {
    results.push({
      confidence: 45, title: '외상성 손상', subtitle: '위치 기반', icd: 'T14.9', severity: 'medium', color: '#a55eea',
      desc: `${patient.location} 근무 중 발생. 기계·추락 관련 외상 가능성 고려 필요.`,
      actions: [
        { level: 'high',   text: '전신 외상 평가 (ABCDE)' },
        { level: 'high',   text: '출혈 및 골절 부위 확인' },
        { level: 'normal', text: '부목 및 압박 드레싱 준비' },
      ],
    })
  }

  // 기본값 (해당 없을 때)
  if (results.length === 0) return DIAGNOSES
  return results.sort((a, b) => b.confidence - a.confidence)
}

// ═══════════════════════════════════════════════
//  ROOT
// ═══════════════════════════════════════════════

export default function AnalysisEmergency({ patient }) {
  const [diagIdx, setDiagIdx] = useState(0)
  const recommended = getRecommended(patient)
  const [protocolId, setProtocolId] = useState(recommended || 'cpr')
  const [stepIdx, setStepIdx] = useState(0)

  const dynamicDiagnoses = buildDiagnoses(patient)
  const riskScore = calcRiskScore(patient)

  // 환자 실데이터로 바이탈 구성 (박기관만 fallback, 나머지는 측정값만)
  const isPark = patient?.id === 'S26-003'
  const bpRaw = patient?.bp || patient?.vitals?.bp || (isPark ? '158/95' : '-')
  const sbp = bpRaw !== '-' ? (parseInt(bpRaw.split('/')[0]) || 0) : 0
  const hrVal = Number(patient?.hr ?? patient?.vitals?.hr ?? (isPark ? 96 : 0))
  const spo2Val = Number(patient?.spo2 ?? patient?.vitals?.spo2 ?? (isPark ? 98 : 0))
  const tempVal = Number(patient?.temp ?? patient?.vitals?.temp ?? (isPark ? 37.6 : 0))
  const patientVitals = [
    { label: '심박수',      value: hrVal || '-',   unit: 'bpm',  normal: '60–100',    status: !hrVal ? 'normal' : hrVal > 100 || hrVal < 60 ? 'critical' : hrVal > 90 ? 'warn' : 'normal', trend: 'up',   Icon: Heart,       color: !hrVal ? '#475569' : hrVal > 100 ? '#ff4d6d' : '#ff9f43' },
    { label: '수축기 혈압', value: sbp || '-',     unit: 'mmHg', normal: '< 120',     status: !sbp ? 'normal' : sbp > 160 ? 'critical' : sbp > 140 ? 'warn' : 'normal', trend: 'up',   Icon: Activity,    color: !sbp ? '#475569' : sbp > 160 ? '#ff4d6d' : '#ff9f43' },
    { label: '산소포화도',  value: spo2Val || '-', unit: '%',    normal: '95–100',    status: !spo2Val ? 'normal' : spo2Val < 90 ? 'critical' : spo2Val < 95 ? 'warn' : 'normal', trend: 'down', Icon: Droplets,    color: !spo2Val ? '#475569' : spo2Val < 95 ? '#ff4d6d' : '#0dd9c5' },
    { label: '체온',        value: tempVal || '-', unit: '°C',   normal: '36.5–37.5', status: !tempVal ? 'normal' : tempVal >= 39 ? 'critical' : tempVal >= 38 ? 'warn' : 'normal', trend: 'up', Icon: Thermometer, color: !tempVal ? '#475569' : tempVal >= 38 ? '#ff9f43' : '#0dd9c5' },
  ]

  const selectProtocol = (id) => { setProtocolId(id); setStepIdx(0) }
  const goStep = (i) => setStepIdx(Math.max(0, Math.min(i, GUIDES[protocolId].steps.length - 1)))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', height: 'calc(100vh - 72px)', overflow: 'hidden', background: '#020408' }}>
      <EmergencyPanel
        patient={patient} recommended={recommended}
        protocolId={protocolId} selectProtocol={selectProtocol}
        stepIdx={stepIdx} goStep={goStep}
      />
      {/* Divider */}
      <div style={{ background: 'linear-gradient(180deg, transparent, #0dd9c5, transparent)', opacity: 0.3 }} />
      <AIPanel patient={patient} diagIdx={diagIdx} setDiagIdx={setDiagIdx} patientVitals={patientVitals} dynamicDiagnoses={dynamicDiagnoses} riskScore={riskScore} />
    </div>
  )
}

// ═══════════════════════════════════════════════
//  SCI-FI DESIGN SYSTEM
// ═══════════════════════════════════════════════

/* Corner bracket decoration */
function Brackets({ color = '#0dd9c5', size = 14, width = 2 }) {
  const base = { position: 'absolute', width: size, height: size, zIndex: 2 }
  const b = `${width}px solid ${color}`
  return (
    <>
      <div style={{ ...base, top: 0, left: 0, borderTop: b, borderLeft: b }} />
      <div style={{ ...base, top: 0, right: 0, borderTop: b, borderRight: b }} />
      <div style={{ ...base, bottom: 0, left: 0, borderBottom: b, borderLeft: b }} />
      <div style={{ ...base, bottom: 0, right: 0, borderBottom: b, borderRight: b }} />
    </>
  )
}

/* Core bento card with sci-fi + skeuomorphism styling */
function Card({ children, color = '#0dd9c5', glow = false, style = {}, brackets = true, scanLines = false }) {
  return (
    <div style={{
      position: 'relative',
      borderRadius: 14,
      background: `linear-gradient(155deg, ${color}07 0%, #06090f 60%, #020408 100%)`,
      border: `1px solid ${color}28`,
      boxShadow: [
        `inset 0 1px 0 ${color}12`,
        `inset 0 -1px 0 rgba(0,0,0,0.6)`,
        `0 4px 24px rgba(0,0,0,0.7)`,
        glow ? `0 0 32px ${color}18, 0 0 64px ${color}08` : '',
      ].filter(Boolean).join(', '),
      overflow: 'hidden',
      ...style,
    }}>
      {/* Top edge highlight */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${color}50 50%, transparent 100%)`,
        zIndex: 1,
      }} />
      {/* Scan lines texture */}
      {scanLines && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(13,217,197,0.015) 3px, rgba(13,217,197,0.015) 4px)',
        }} />
      )}
      {brackets && <Brackets color={color} />}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}

/* HUD-style section label */
function HudLabel({ children, color = '#0dd9c5', dot = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      {dot && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, animation: 'glowPulse 2s ease infinite' }} />
          <div style={{ width: 20, height: 1, background: `linear-gradient(90deg, ${color}, transparent)` }} />
        </div>
      )}
      <span style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: '2px', textTransform: 'uppercase' }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${color}30, transparent)` }} />
    </div>
  )
}

/* Status indicator dot */
function StatusDot({ color, blink = false }) {
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
      background: color,
      boxShadow: `0 0 8px ${color}`,
      animation: blink ? 'statusBlink 1.2s ease infinite' : 'glowPulse 2s ease infinite',
    }} />
  )
}

// ═══════════════════════════════════════════════
//  AI ANALYSIS PANEL  —  Bento Grid
// ═══════════════════════════════════════════════

function AIPanel({ patient, diagIdx, setDiagIdx, patientVitals, dynamicDiagnoses, riskScore }) {
  const VITALS = patientVitals
  const diagList = dynamicDiagnoses || DIAGNOSES
  const safeIdx = Math.min(diagIdx, diagList.length - 1)
  const diag = diagList[safeIdx]
  const riskColor = riskScore >= 70 ? '#ff4d6d' : riskScore >= 40 ? '#ff9f43' : '#26de81'

  // 실데이터 기반 가상 트렌드 생성 (Task 3-5)
  const currentHr = VITALS.find(v => v.label === '심박수')?.value || 0
  const currentBp = VITALS.find(v => v.label === '수축기 혈압')?.value || 0
  
  const dynamicTrend = [
    { t: '08:00', hr: currentHr - 18, bp: currentBp - 16 },
    { t: '08:15', hr: currentHr - 16, bp: currentBp - 13 },
    { t: '08:30', hr: currentHr - 14, bp: currentBp - 10 },
    { t: '08:45', hr: currentHr - 11, bp: currentBp - 8 },
    { t: '09:00', hr: currentHr - 7, bp: currentBp - 5 },
    { t: '09:15', hr: currentHr - 3, bp: currentBp - 2 },
    { t: '09:30', hr: currentHr, bp: currentBp },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gridTemplateRows: 'auto auto auto auto auto',
      gap: 10,
      padding: 12,
      overflowY: 'auto',
      background: '#020408',
      alignContent: 'start',
    }}>

      {/* ── Row 1a: Patient Info ── */}
      <Card color="#0dd9c5" style={{ gridColumn: '1', padding: '16px' }}>
        <HudLabel color="#0dd9c5">환자 정보</HudLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <StatusDot color="#26de81" blink />
          <span style={{ fontSize: 11, color: '#26de81', fontWeight: 700 }}>MONITORING</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 3 }}>
          {patient?.name || '김선원'}
        </div>
        <div style={{ fontSize: 12, color: '#8da2c0', marginBottom: 10 }}>
          {patient?.age || '-'}세 · {patient?.role || '-'} · {patient?.blood || '-'}형
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.3)' }}>
          <AlertTriangle size={12} color="#ff4d6d" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ff8099' }}>
            {patient?.chronic || '고혈압, 고지혈증'}
          </span>
        </div>
      </Card>

      {/* ── Row 1b: Risk Gauge (spans 2 cols) ── */}
      <Card color={riskColor} glow scanLines style={{ gridColumn: '2/4', padding: '16px' }}>
        <HudLabel color={riskColor}>종합 위험 지표</HudLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Arc gauge */}
          <div style={{ position: 'relative', width: 130, height: 70, flexShrink: 0 }}>
            <svg width="130" height="70" viewBox="0 0 130 70">
              <path d="M 10 65 A 55 55 0 0 1 120 65" stroke="rgba(255,255,255,0.06)" strokeWidth="10" fill="none" strokeLinecap="round" />
              <path d="M 10 65 A 55 55 0 0 1 120 65" stroke={riskColor} strokeWidth="10" fill="none" strokeLinecap="round"
                strokeDasharray={`${Math.PI * 55}`}
                strokeDashoffset={`${Math.PI * 55 * (1 - riskScore / 100)}`}
                style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 6px ${riskColor})` }}
              />
            </svg>
            {/* Pulse rings */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 0 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 950, color: riskColor, lineHeight: 1, animation: 'hudFlicker 8s ease infinite' }}>
                  {riskScore}
                </div>
                <div style={{ fontSize: 10, color: '#4a6080', fontWeight: 700 }}>/ 100</div>
              </div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: riskColor, marginBottom: 6, animation: 'glowPulse 2s ease infinite' }}>
              {riskScore >= 70 ? '위험 — 즉각 처치 필요' : riskScore >= 40 ? '주의 관찰 필요' : '안정 상태'}
            </div>
            {/* Risk bar segments */}
            <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
              {[...Array(10)].map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 6, borderRadius: 2,
                  background: i < Math.floor(riskScore / 10)
                    ? (i < 4 ? '#26de81' : i < 7 ? '#ff9f43' : '#ff4d6d')
                    : 'rgba(255,255,255,0.07)',
                  boxShadow: i < Math.floor(riskScore / 10) ? `0 0 4px currentColor` : 'none',
                  transition: `background 0.3s ${i * 0.05}s`,
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[{ label: '정상', color: '#26de81' }, { label: '주의', color: '#ff9f43' }, { label: '위험', color: '#ff4d6d' }].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                  <span style={{ fontSize: 10, color: '#4a6080', fontWeight: 700 }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Row 2: 3 Diagnosis Cards ── */}
      {diagList.map((d, i) => (
        <Card key={i} color={d.color} glow={safeIdx === i}
          style={{ gridColumn: `${i + 1}`, padding: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
          brackets={safeIdx === i}
        >
          <div onClick={() => setDiagIdx(i)}>
            <div style={{ display: 'flex', align: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{
                fontSize: 22, fontWeight: 950, color: d.color,
                animation: diagIdx === i ? 'hudFlicker 6s ease infinite' : 'none',
              }}>
                {d.confidence}%
              </div>
              <div style={{
                padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 800,
                background: `${d.color}20`, color: d.color, border: `1px solid ${d.color}35`,
                height: 'fit-content',
              }}>
                {SEV_LABEL[d.severity]}
              </div>
            </div>
            {/* Confidence bar */}
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 8 }}>
              <div style={{
                height: '100%', width: `${d.confidence}%`,
                background: `linear-gradient(90deg, ${d.color}60, ${d.color})`,
                boxShadow: `0 0 8px ${d.color}`,
                borderRadius: 2,
              }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: diagIdx === i ? '#fff' : '#8da2c0', marginBottom: 2 }}>
              {d.title}
            </div>
            <div style={{ fontSize: 10, color: '#4a6080', fontWeight: 700 }}>ICD-10: {d.icd}</div>
          </div>
        </Card>
      ))}

      {/* ── Row 3a: Actions (2 cols) ── */}
      <Card color={diag.color} style={{ gridColumn: '1/3', padding: '14px' }}>
        <HudLabel color={diag.color}>권고 즉각 조치</HudLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {diag.actions.map((a, i) => {
            const ac = ACT_COLOR[a.level]
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8,
                background: `${ac}08`, border: `1px solid ${ac}20`,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  background: `${ac}20`, border: `1px solid ${ac}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 950, color: ac,
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 13, color: '#dde9ff', fontWeight: 600, flex: 1 }}>{a.text}</span>
                {ACT_BADGE[a.level] && (
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: `${ac}20`, color: ac, fontWeight: 800 }}>
                    {ACT_BADGE[a.level]}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── Row 3b: Vitals 2×2 (1 col) ── */}
      <Card color="#4fc3f7" style={{ gridColumn: '3', padding: '14px' }}>
        <HudLabel color="#4fc3f7">바이탈</HudLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {VITALS.map((v, i) => {
            const TIcon = v.trend === 'up' ? TrendingUp : v.trend === 'down' ? TrendingDown : Minus
            return (
              <div key={i} style={{
                padding: '8px 10px', borderRadius: 8,
                background: v.status === 'critical' ? 'rgba(255,77,109,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${v.status === 'critical' ? 'rgba(255,77,109,0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <v.Icon size={11} color={v.color} />
                  <span style={{ fontSize: 9, color: '#4a6080', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {v.label}
                  </span>
                  <TIcon size={10} color={v.color} style={{ marginLeft: 'auto' }} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 950, color: v.color, lineHeight: 1 }}>{v.value}</div>
                <div style={{ fontSize: 9, color: '#4a6080', fontWeight: 700 }}>{v.unit} · {v.normal}</div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── Row 4: Trend Chart (full width) ── */}
      <Card color="#4fc3f7" scanLines style={{ gridColumn: '1/4', padding: '14px' }}>
        <HudLabel color="#4fc3f7">바이탈 추이 — 최근 90분</HudLabel>
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={dynamicTrend} margin={{ top: 4, right: 10, bottom: 0, left: -14 }}>
            <defs>
              <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ff4d6d" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ff4d6d" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ff9f43" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ff9f43" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" tick={{ fill: '#4a6080', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="hr" domain={[Math.max(0, currentHr - 40), currentHr + 20]}  tick={{ fill: '#4a6080', fontSize: 10 }} axisLine={false} tickLine={false} width={26} />
            <YAxis yAxisId="bp" orientation="right" domain={[Math.max(0, currentBp - 40), currentBp + 20]} tick={{ fill: '#4a6080', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={{ background: '#06090f', border: '1px solid rgba(13,217,197,0.25)', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: '#8da2c0' }} />
            <Area yAxisId="hr" type="monotone" dataKey="hr" stroke="#ff4d6d" strokeWidth={2} fill="url(#hrGrad)" name="심박수" dot={{ r: 3, fill: '#ff4d6d', strokeWidth: 0 }} />
            <Area yAxisId="bp" type="monotone" dataKey="bp" stroke="#ff9f43" strokeWidth={2} fill="url(#bpGrad)" name="수축기혈압" dot={{ r: 3, fill: '#ff9f43', strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 6 }}>
          <LegendItem color="#ff4d6d" label="심박수 (bpm)" />
          <LegendItem color="#ff9f43" label="수축기 혈압 (mmHg)" />
        </div>
      </Card>

      {/* AI 최종 종합 판정 (full width) */}
      <Card color="#0dd9c5" glow style={{ gridColumn: '1/4', padding: '14px', position: 'relative', overflow: 'hidden' }}>
        {/* Scanning line animation */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #0dd9c5, transparent)', animation: 'hudScan 3s linear infinite', zIndex: 10 }} />
        
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative', zIndex: 5 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'rgba(13,217,197,0.12)', border: '1px solid rgba(13,217,197,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={18} color="#0dd9c5" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: '#0dd9c5', letterSpacing: '2px', textTransform: 'uppercase' }}>
                AI 최종 종합 판정 및 리스크 분석
              </span>
              <StatusDot color="#0dd9c5" />
            </div>
            <p style={{ fontSize: 13, color: '#dde9ff', lineHeight: 1.75, fontWeight: 500, margin: 0 }}>
              현재 위험 지수 <span style={{ color: riskColor, fontWeight: 900 }}>{riskScore >= 70 ? 'CRITICAL' : riskScore >= 40 ? 'WARNING' : 'STABLE'} ({riskScore}/100)</span>.
              {riskScore >= 70 
                ? ' 실시간 바이탈 분석 결과, 다수의 급성 위기 지표가 감지되었습니다. 즉각적인 SOP 가동과 육상 의료진 지원 요청을 강력히 권고합니다.' 
                : ' 지표가 변동성을 보이고 있으나 즉각적인 생명 위협 단계는 아닙니다. 5분 단위 바이탈 재측정과 추이 관찰이 필요합니다.'}
            </p>
          </div>
        </div>
      </Card>

      <style>{`
        @keyframes hudScan {
          0% { top: -2px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════════════
//  EMERGENCY PANEL  —  Bento + Sci-Fi
// ═══════════════════════════════════════════════

function EmergencyPanel({ patient, recommended, protocolId, selectProtocol, stepIdx, goStep }) {
  const guide = GUIDES[protocolId]
  const step  = guide.steps[stepIdx]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#050d1a' }}>

      {/* Protocol tab bar */}
      <div style={{
        padding: '10px 14px',
        background: 'rgba(5,10,20,0.95)',
        borderBottom: '1px solid rgba(13,217,197,0.12)',
        display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0, alignItems: 'center',
      }}>
        {recommended && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
            background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.3)',
            fontSize: 11, color: '#ff4d6d', fontWeight: 800, flexShrink: 0,
            animation: 'glowPulse 2s ease infinite',
          }}>
            <Zap size={12} /> AI 추천
          </div>
        )}
        {PROTOCOLS.map(p => {
          const active = protocolId === p.id
          return (
            <button key={p.id} onClick={() => selectProtocol(p.id)} style={{
              padding: '7px 14px', borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 7,
              background: active
                ? `linear-gradient(135deg, ${p.color}20, ${p.color}08)`
                : 'rgba(255,255,255,0.02)',
              border: `1px solid ${active ? p.color + '50' : 'rgba(255,255,255,0.07)'}`,
              color: active ? '#fff' : '#8da2c0',
              fontSize: 12, fontWeight: 800, cursor: 'pointer',
              boxShadow: active ? `0 0 14px ${p.color}20` : 'none',
              transition: 'all 0.2s', position: 'relative',
            }}>
              <span style={{ fontSize: 14 }}>{p.icon}</span>
              {p.label}
              {p.id === recommended && (
                <div style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: '#ff4d6d', boxShadow: '0 0 6px #ff4d6d', animation: 'statusBlink 1.5s ease infinite' }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Step list + Active step */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr', overflow: 'hidden' }}>

        {/* ── Step list (bento sidebar) ── */}
        <div style={{
          borderRight: '1px solid rgba(13,217,197,0.1)',
          background: 'rgba(4,8,16,0.95)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Protocol header card */}
          <div style={{ padding: '14px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
            <Card color={guide.color} style={{ padding: '12px' }} brackets={false}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 22 }}>{PROTOCOLS.find(p => p.id === protocolId)?.icon}</span>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', lineHeight: 1.3 }}>{guide.title}</div>
              </div>
              <p style={{ fontSize: 11, color: '#8da2c0', lineHeight: 1.6, margin: 0 }}>{guide.desc}</p>
              {patient && (patient.allergies || '').toLowerCase().includes('아스피린') &&
                (protocolId === 'cardiac' || protocolId === 'cpr') && (
                <div style={{
                  marginTop: 8, padding: '6px 10px', borderRadius: 7,
                  background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.3)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <AlertTriangle size={11} color="#ff4d6d" />
                  <span style={{ fontSize: 10, color: '#ff8099', fontWeight: 700 }}>
                    아스피린 알레르기 — 투여 금지
                  </span>
                </div>
              )}
            </Card>
          </div>

          {/* Steps */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <HudLabel color={guide.color}>처치 단계 {guide.steps.length}step</HudLabel>
            {guide.steps.map((s, i) => {
              const isDone   = i < stepIdx
              const isActive = i === stepIdx
              return (
                <div
                  key={i} onClick={() => goStep(i)}
                  style={{
                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                    background: isActive
                      ? `linear-gradient(135deg, ${guide.color}12, ${guide.color}05)`
                      : isDone ? 'rgba(38,222,129,0.04)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isActive ? guide.color + '50' : isDone ? 'rgba(38,222,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    boxShadow: isActive ? `0 0 20px ${guide.color}15` : 'none',
                    transition: 'all 0.2s',
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  {isActive && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${guide.color}, transparent)` }} />
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: isActive ? guide.color : isDone ? 'rgba(38,222,129,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isActive ? 'rgba(255,255,255,0.3)' : isDone ? 'rgba(38,222,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, color: isActive ? '#020408' : isDone ? '#26de81' : '#4a6080',
                      boxShadow: isActive ? `0 0 14px ${guide.color}60` : 'none',
                      transition: 'all 0.2s',
                    }}>
                      {isDone ? <CheckCircle2 size={15} /> : s.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: isActive ? guide.color : '#4a6080', marginBottom: 2, letterSpacing: '0.5px' }}>
                        STEP {i + 1}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#fff' : isDone ? '#5a7090' : '#4a6080', lineHeight: 1.3 }}>
                        {s.title}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Active Step (hero card) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#050d1a' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                {guide.steps.map((_, i) => (
                  <div key={i} style={{
                    flex: i === stepIdx ? 2 : 1, height: 3, borderRadius: 2,
                    background: i < stepIdx ? '#26de81' : i === stepIdx ? guide.color : 'rgba(255,255,255,0.08)',
                    boxShadow: i === stepIdx ? `0 0 8px ${guide.color}` : 'none',
                    transition: 'all 0.3s',
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 11, color: '#4a6080', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {stepIdx + 1} / {guide.steps.length}
              </span>
            </div>

            {/* Step hero card */}
            <Card color={guide.color} glow scanLines style={{ padding: '20px', marginBottom: 12 }}>
              {/* Scan line sweep animation */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
                background: `linear-gradient(180deg, ${guide.color}06, transparent)`,
                animation: 'scanLine 4s linear infinite',
                pointerEvents: 'none', zIndex: 0,
              }} />
              {/* Step label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: guide.color, boxShadow: `0 0 8px ${guide.color}`, animation: 'statusBlink 1.2s ease infinite' }} />
                  <span style={{ fontSize: 10, fontWeight: 800, color: guide.color, letterSpacing: '2px' }}>
                    STEP {stepIdx + 1} — ACTIVE
                  </span>
                </div>
                <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${guide.color}40, transparent)` }} />
              </div>

              {/* Icon + Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{
                  width: 68, height: 68, borderRadius: 18, flexShrink: 0,
                  background: `radial-gradient(circle at 35% 35%, ${guide.color}28, #06090f)`,
                  border: `1.5px solid ${guide.color}50`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 30, boxShadow: `0 0 30px ${guide.color}20, inset 0 1px 0 ${guide.color}30`,
                  animation: 'float 3s ease-in-out infinite',
                }}>
                  {step.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 950, color: '#fff', lineHeight: 1.2 }}>
                    {step.title}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{
                padding: '12px 15px', borderRadius: 10,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                marginBottom: 12,
              }}>
                <p style={{ fontSize: 13, color: '#dde9ff', lineHeight: 1.8, fontWeight: 500, margin: 0 }}>
                  {step.desc}
                </p>
              </div>

              {/* Tip */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '11px 14px', borderRadius: 10,
                background: `${step.tipColor}0c`, border: `1px solid ${step.tipColor}30`,
              }}>
                <AlertTriangle size={14} color={step.tipColor} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 12, color: step.tipColor, fontWeight: 700, lineHeight: 1.65 }}>
                  {step.tip}
                </span>
              </div>
            </Card>

            {step.timer && <StepTimer key={`${protocolId}-${stepIdx}`} seconds={step.timer} color={guide.color} />}
            {step.hasCPR && <CPRMetronome />}

          </div>

          {/* Navigation */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(13,217,197,0.08)',
            background: 'rgba(4,8,16,0.95)',
            display: 'flex', gap: 10, flexShrink: 0,
          }}>
            <button onClick={() => goStep(stepIdx - 1)} disabled={stepIdx === 0} style={{
              padding: '11px 20px', borderRadius: 10,
              background: stepIdx === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: stepIdx === 0 ? '#2a3a52' : '#8da2c0',
              fontSize: 13, fontWeight: 800,
              cursor: stepIdx === 0 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <ChevronLeft size={16} /> 이전
            </button>
            <button onClick={() => goStep(stepIdx + 1)} disabled={stepIdx === guide.steps.length - 1} style={{
              flex: 1, padding: '11px', borderRadius: 10,
              background: stepIdx === guide.steps.length - 1
                ? 'rgba(255,255,255,0.02)'
                : `linear-gradient(135deg, ${guide.color}, ${guide.color}cc)`,
              border: stepIdx === guide.steps.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              color: stepIdx === guide.steps.length - 1 ? '#2a3a52' : '#020408',
              fontSize: 13, fontWeight: 950,
              cursor: stepIdx === guide.steps.length - 1 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: stepIdx === guide.steps.length - 1 ? 'none' : `0 4px 20px ${guide.color}40`,
            }}>
              다음 단계 <ChevronRight size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
//  WIDGETS
// ═══════════════════════════════════════════════

function StepTimer({ seconds, color }) {
  const [remaining, setRemaining] = useState(seconds)
  const [running, setRunning] = useState(false)
  const ref = useRef(null)

  useEffect(() => () => clearInterval(ref.current), [])

  const toggle = () => {
    if (running) { clearInterval(ref.current); setRunning(false) }
    else {
      setRunning(true)
      ref.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) { clearInterval(ref.current); setRunning(false); return 0 }
          return r - 1
        })
      }, 1000)
    }
  }
  const reset = () => { clearInterval(ref.current); setRunning(false); setRemaining(seconds) }

  const pct  = ((seconds - remaining) / seconds) * 100
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <Card color={color} style={{ padding: '14px', marginBottom: 10 }} brackets={false}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Clock size={14} color={color} />
        <span style={{ fontSize: 12, fontWeight: 800, color, flex: 1 }}>처치 타이머</span>
        <span style={{ fontSize: 28, fontWeight: 950, color, fontVariantNumeric: 'tabular-nums', animation: running ? 'hudFlicker 3s ease infinite' : 'none' }}>
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 10 }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          boxShadow: `0 0 8px ${color}`,
          borderRadius: 2, transition: 'width 0.8s linear',
        }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={toggle} style={{
          flex: 1, padding: '9px', borderRadius: 8,
          background: running ? `${color}20` : `${color}14`,
          border: `1px solid ${color}35`,
          color, fontSize: 12, fontWeight: 800, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          boxShadow: running ? `0 0 14px ${color}30` : 'none',
        }}>
          {running ? <><Pause size={13} /> 정지</> : <><Play size={13} /> 시작</>}
        </button>
        <button onClick={reset} style={{
          padding: '9px 14px', borderRadius: 8,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          color: '#4a6080', fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <RotateCcw size={12} /> 초기화
        </button>
      </div>
    </Card>
  )
}

function CPRMetronome() {
  const [active, setActive] = useState(false)
  const [beat,   setBeat]   = useState(false)
  const [count,  setCount]  = useState(0)
  const ref = useRef(null)

  const toggle = () => {
    if (active) { clearInterval(ref.current); setActive(false) }
    else {
      setActive(true)
      ref.current = setInterval(() => { setBeat(b => !b); setCount(c => c + 1) }, 500)
    }
  }
  useEffect(() => () => clearInterval(ref.current), [])

  return (
    <Card color="#ff4d6d" glow={active} style={{ padding: '14px' }} brackets={false}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={toggle} style={{
          width: 46, height: 46, borderRadius: 12, flexShrink: 0,
          background: active
            ? 'linear-gradient(135deg, #ff4d6d, #ff2040)'
            : 'rgba(255,77,109,0.15)',
          border: `1px solid ${active ? 'rgba(255,255,255,0.2)' : 'rgba(255,77,109,0.3)'}`,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: active ? '#fff' : '#ff4d6d',
          boxShadow: active ? '0 4px 20px rgba(255,77,109,0.5)' : 'none',
          transition: 'all 0.2s',
        }}>
          {active ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#ff4d6d', marginBottom: 3 }}>
            CPR 리듬 — 120 bpm
          </div>
          {active
            ? <div style={{ fontSize: 11, color: '#8da2c0' }}>
                압박 횟수: <span style={{ color: '#fff', fontWeight: 900 }}>{count}</span> 회
              </div>
            : <div style={{ fontSize: 11, color: '#4a6080' }}>시작하면 압박 리듬을 알려드립니다</div>
          }
        </div>
        {/* Beat pulse */}
        <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
          {active && beat && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '2px solid #ff4d6d',
              animation: 'ringExpand 0.5s ease-out forwards',
            }} />
          )}
          <div style={{
            position: 'absolute', inset: 4, borderRadius: '50%',
            background: active && beat ? '#ff4d6d' : 'rgba(255,77,109,0.15)',
            boxShadow: active && beat ? '0 0 16px #ff4d6d' : 'none',
            transition: 'all 0.08s',
          }} />
        </div>
      </div>
    </Card>
  )
}

// ─── Micro components ──────────────────────────

function LegendItem({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 12, height: 3, borderRadius: 1.5, background: color, boxShadow: `0 0 4px ${color}` }} />
      <span style={{ fontSize: 10, color: '#4a6080', fontWeight: 700 }}>{label}</span>
    </div>
  )
}

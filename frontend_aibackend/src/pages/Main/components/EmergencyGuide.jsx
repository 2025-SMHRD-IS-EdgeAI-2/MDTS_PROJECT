import { Timer } from 'lucide-react'
import { useState, useEffect } from 'react'
import { StepItem, SymptomTab } from '../../../components/ui'
import { CardiacIllustration, TraumaIllustration, UnconsciousIllustration, RespiratoryIllustration } from '../../../components/EmergencyIllustrations'

const Anim3D = ({ activeEmergencyGuide, activeStep }) => {
  const props = { step: activeStep }
  if (activeEmergencyGuide === 'CARDIAC') return <CardiacIllustration {...props} />
  if (activeEmergencyGuide === 'TRAUMA') return <TraumaIllustration {...props} />
  if (activeEmergencyGuide === 'UNCONSCIOUS') return <UnconsciousIllustration {...props} />
  if (activeEmergencyGuide === 'RESPIRATORY') return <RespiratoryIllustration {...props} />
  return <div style={{ width: 240, height: 260, background: 'rgba(255,255,255,0.03)', borderRadius: 20 }} />
}

export default function EmergencyGuide({ activeEmergencyGuide, setActiveEmergencyGuide, activeStep, setActiveStep }) {
  const GOLDEN_TIME = 42 * 60 + 15 // 42분 15초 (초 단위)
  const [remaining, setRemaining] = useState(GOLDEN_TIME)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(r => (r > 0 ? r - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  const isUrgent = remaining < 10 * 60 // 10분 미만이면 빨간색 강조
  const GUIDES = {
    CARDIAC: {
      steps: [
        { title: '의식 확인 · 도움 요청', desc: '어깨 가볍게 두드림 · 의식 여부 확인 · 주변 도움 요청' },
        { title: '흉부 압박', desc: '100~120회/분 · 5cm 깊이 · 강하고 빠른 압박' },
        { title: 'AED 사용', desc: '자동심장충격기 도착 즉시 패드 부착 · 안내 음성 준수' },
      ],
      illustrations: [
        { color: '#38bdf8', bg: 'rgba(56,189,248,0.05)',  border: 'rgba(56,189,248,0.1)',  label: '의식 확인 가이드' },
        { color: '#38bdf8', bg: 'rgba(56,189,248,0.05)',  border: 'rgba(56,189,248,0.1)',  label: 'CPR 가이드' },
        { color: '#fbbf24', bg: 'rgba(251,191,36,0.05)',  border: 'rgba(251,191,36,0.15)', label: 'AED 사용 가이드' },
      ],
    },
    TRAUMA: {
      steps: [
        { title: '출혈 부위 압박 · 지혈', desc: '거즈 또는 깨끗한 천 · 상처 강하게 압박 · 지혈 유지' },
        { title: '환부 고정 · 거상', desc: '손상 사지 심장보다 높게 유지 · 고정 및 부동화' },
        { title: '쇼크 예방 · 보온', desc: '수평 눕힘 · 보온 유지 · 음식·음료 금지' },
      ],
      illustrations: [
        { color: '#f43f5e', bg: 'rgba(244,63,94,0.05)',   border: 'rgba(244,63,94,0.15)',  label: '지혈 처치 가이드' },
        { color: '#f43f5e', bg: 'rgba(244,63,94,0.05)',   border: 'rgba(244,63,94,0.15)',  label: '환부 고정 가이드' },
        { color: '#94a3b8', bg: 'rgba(148,163,184,0.05)', border: 'rgba(148,163,184,0.15)',label: '쇼크 예방 가이드' },
      ],
    },
    UNCONSCIOUS: {
      steps: [
        { title: '기도 확보', desc: '머리 후굴 · 턱 거상 · 기도 개방' },
        { title: '회복 자세 유지', desc: '측와위 자세 · 기도 폐쇄 방지 · 발 거상' },
        { title: '지속 모니터링', desc: '호흡·맥박 지속 확인 · 의식 회복 여부 관찰' },
      ],
      illustrations: [
        { color: '#fbbf24', bg: 'rgba(251,191,36,0.05)',  border: 'rgba(251,191,36,0.15)', label: '기도 확보 가이드' },
        { color: '#fbbf24', bg: 'rgba(251,191,36,0.05)',  border: 'rgba(251,191,36,0.15)', label: '회복 자세 가이드' },
        { color: '#2dd4bf', bg: 'rgba(45,212,191,0.05)',  border: 'rgba(45,212,191,0.15)', label: '모니터링 가이드' },
      ],
    },
    RESPIRATORY: {
      steps: [
        { title: '상체 거상 · 안정', desc: '좌위 또는 반좌위 유지 · 호흡 편의 확보' },
        { title: '산소 공급', desc: '산소 마스크 착용 · 10~15L/분 공급' },
        { title: '기관지 확장제 투여', desc: '천식·COPD 병력 확인 · 흡입 보조' },
      ],
      illustrations: [
        { color: '#2dd4bf', bg: 'rgba(45,212,191,0.05)', border: 'rgba(45,212,191,0.15)', label: '상체 거상 가이드' },
        { color: '#2dd4bf', bg: 'rgba(45,212,191,0.05)', border: 'rgba(45,212,191,0.15)', label: '산소 공급 가이드' },
        { color: '#2dd4bf', bg: 'rgba(45,212,191,0.05)', border: 'rgba(45,212,191,0.15)', label: '기관지 확장제 가이드' },
      ],
    },
  }

  const guide = GUIDES[activeEmergencyGuide]
  if (!guide) return null
  const illus = guide.illustrations[activeStep - 1]
  const { color, bg, border, label } = illus

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 32, fontWeight: 900 }}>증상별 응급 처치 가이드</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', background: isUrgent ? 'rgba(239,68,68,0.15)' : 'rgba(251,113,133,0.1)', borderRadius: 18, border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.5)' : 'rgba(251,113,133,0.2)'}`, animation: isUrgent ? 'pulse 0.8s infinite' : 'none' }}>
          <Timer size={24} color={isUrgent ? '#ef4444' : '#fb7185'} />
          <span style={{ fontSize: 20, fontWeight: 800, color: isUrgent ? '#ef4444' : '#fb7185' }}>
            골든타임 : {formatTime(remaining)}{remaining === 0 ? ' — 초과!' : ''}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 18, marginBottom: 20 }}>
        <SymptomTab label="흉통/심정지" active={activeEmergencyGuide === 'CARDIAC'} onClick={() => { setActiveEmergencyGuide('CARDIAC'); setActiveStep(1) }} />
        <SymptomTab label="중증 외상/출혈" active={activeEmergencyGuide === 'TRAUMA'} onClick={() => { setActiveEmergencyGuide('TRAUMA'); setActiveStep(1) }} />
        <SymptomTab label="의식 저하" active={activeEmergencyGuide === 'UNCONSCIOUS'} onClick={() => { setActiveEmergencyGuide('UNCONSCIOUS'); setActiveStep(1) }} />
        <SymptomTab label="호흡 곤란" active={activeEmergencyGuide === 'RESPIRATORY'} onClick={() => { setActiveEmergencyGuide('RESPIRATORY'); setActiveStep(1) }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 36 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {guide.steps.map((s, i) => (
            <StepItem key={i} num={i + 1} title={s.title} desc={s.desc} active={activeStep === i + 1} onClick={() => setActiveStep(i + 1)} />
          ))}
        </div>
        <div style={{ background: bg, borderRadius: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `1px solid ${border}`, minHeight: 280, boxShadow: `0 8px 40px ${color}22`, position: 'relative', overflow: 'hidden', padding: '24px 16px' }}>
          <Anim3D activeEmergencyGuide={activeEmergencyGuide} activeStep={activeStep} />
          <div style={{ fontSize: 14, color, fontWeight: 800, letterSpacing: '0.04em', marginTop: 12, textAlign: 'center' }}>{label}</div>
        </div>
      </div>
    </div>
  )
}

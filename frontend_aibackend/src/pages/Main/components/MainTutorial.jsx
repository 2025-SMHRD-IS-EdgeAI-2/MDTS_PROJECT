import React, { useState, useEffect } from 'react'
import { ChevronRight, X, Sparkles, Activity, AlertTriangle, Clock, Camera, User } from 'lucide-react'

const STEPS = [
  {
    id: 'tuto-patient-info',
    title: '선원 상세 정보',
    text: '현재 모니터링 중인 선원의 인적 사항, 기저 질환, 알레르기 정보를 확인할 수 있습니다.',
    icon: <User color="#38bdf8" size={24}/>,
    pos: 'right'
  },
  {
    id: 'tuto-vitals',
    title: '실시간 바이탈 사인',
    text: '심박수, 산소포화도 등 실시간 데이터를 모니터링합니다. 혈압과 체온은 수동으로 입력 및 수정이 가능합니다.',
    icon: <Activity color="#ff4d6d" size={24}/>,
    pos: 'bottom'
  },
  {
    id: 'tuto-ai-chat',
    title: 'AI 증상 분석 및 조치 안내',
    text: '환자 상태를 입력하면 AI가 최적의 응급 처치와 상비약 사용법을 실시간으로 안내합니다.',
    icon: <Sparkles color="#38bdf8" size={24}/>,
    pos: 'top'
  },
  {
    id: 'tuto-emergency-btn',
    title: '긴급 응급처치 액션',
    text: '심정지 등 초응급 상황 발생 시, 즉시 단계별 처치 가이드가 제공되는 전용 응급 모드를 활성화하여 신속하게 대응할 수 있습니다.',
    icon: <AlertTriangle color="#f43f5e" size={24}/>,
    pos: 'left',
    maxWidth: 380,
    offsetY: -360,
    offsetX: 40
  },
  {
    id: 'tuto-timeline',
    title: '상황 대응 타임라인',
    text: '사고 발생 시점부터 현재까지의 모든 처치 이력과 바이탈 변화를 시간순으로 기록하고 확인합니다.',
    icon: <Clock color="#38bdf8" size={24}/>,
    pos: 'left',
    maxWidth: 380,
    offsetX: 80
  },
  {
    id: 'tuto-trauma-btn',
    title: 'AI 외상 촬영 분석',
    text: '카메라로 외상 부위를 촬영하면 AI가 상처의 종류와 심각도를 분석하여 최적의 처치법을 제안합니다.',
    icon: <Camera color="#38bdf8" size={24}/>,
    pos: 'top-left',
    maxWidth: 380,
    offsetY: -40,
    offsetX: -100
  }
]

export default function MainTutorial({ onFinish }) {
  const [step, setStep] = useState(0)
  const [box, setBox] = useState(null)
  const cur = STEPS[step]

  useEffect(() => {
    let retryCount = 0
    const maxRetries = 20 // 2초 동안 시도

    const updateBox = () => {
      const el = document.getElementById(cur.id)
      if (el) {
        const r = el.getBoundingClientRect()
        // 요소가 화면에 나타났는지 확인 (좌표가 0이면 아직 준비 안됨)
        if (r.width > 0 && r.height > 0) {
          setBox({ top: r.top, left: r.left, width: r.width, height: r.height })
          return true
        }
      }
      return false
    }

    const timer = setInterval(() => {
      if (updateBox() || ++retryCount >= maxRetries) {
        clearInterval(timer)
        if (retryCount >= maxRetries) {
          console.warn(`Tutorial target not found: ${cur.id}`)
          // 최후의 수단: 기본 위치라도 잡음 (중앙)
          setBox({ top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 100, width: 200, height: 200 })
        }
      }
    }, 100)

    window.addEventListener('resize', updateBox)
    return () => {
      clearInterval(timer)
      window.removeEventListener('resize', updateBox)
    }
  }, [step])

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else onFinish()
  }

  const prev = () => {
    if (step > 0) setStep(s => s - 1)
  }

  if (!box) return null

  const padding = 10
  const spotlight = {
    top: box.top - padding,
    left: box.left - padding,
    width: box.width + padding * 2,
    height: box.height + padding * 2
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, overflow: 'hidden' }}>
      {/* 배경 마스크 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        clipPath: `polygon(
          0% 0%, 0% 100%, 
          ${spotlight.left}px 100%, 
          ${spotlight.left}px ${spotlight.top}px, 
          ${spotlight.left + spotlight.width}px ${spotlight.top}px, 
          ${spotlight.left + spotlight.width}px ${spotlight.top + spotlight.height}px, 
          ${spotlight.left}px ${spotlight.top + spotlight.height}px, 
          ${spotlight.left}px 100%, 100% 100%, 100% 0%
        )`
      }} />

      {/* 강조 테두리 */}
      <div style={{
        position: 'absolute',
        top: spotlight.top, left: spotlight.left,
        width: spotlight.width, height: spotlight.height,
        border: '3px solid #38bdf8',
        borderRadius: 16,
        boxShadow: '0 0 30px rgba(56,189,248,0.5)',
        pointerEvents: 'none',
        transition: 'all 0.3s ease'
      }} />

      {/* 가이드 카드 */}
      <div style={{
        position: 'absolute',
        ...getCardPos(cur.pos, spotlight, cur.offsetY ?? 0, cur.offsetX ?? 0, cur.maxWidth ?? 560),
        minWidth: 320,
        maxWidth: cur.maxWidth ?? 560,
        width: 'max-content',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: '24px 28px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        animation: 'fadeInUp 0.3s ease-out',
        zIndex: 100000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#38bdf8', letterSpacing: '1px' }}>GUIDE {step + 1}/{STEPS.length}</span>
          <button onClick={onFinish} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4 }}><X size={18}/></button>
        </div>

        <div style={{ fontSize: 27, fontWeight: 900, color: '#fff', marginBottom: 10, wordBreak: 'keep-all' }}>{cur.title}</div>
        <div style={{ fontSize: 20, color: '#94a3b8', lineHeight: 1.6, marginBottom: 24, fontWeight: 500, wordBreak: 'keep-all', whiteSpace: 'pre-wrap' }}>{cur.text}</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {step > 0 ? (
            <button onClick={prev} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 19, fontWeight: 700, cursor: 'pointer' }}>이전 단계</button>
          ) : <div />}
          <button onClick={next} style={{
            padding: '10px 20px', borderRadius: 8, background: '#38bdf8', color: '#000',
            border: 'none', fontWeight: 900, fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.2s'
          }}>
            {step === STEPS.length - 1 ? '시작하기' : '다음'} <ChevronRight size={16}/>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function getCardPos(pos, spotlight, offsetY = 0, offsetX = 0, cardW = 560) {
  const margin = 20
  const cardH = 280
  const vw = window.innerWidth
  const vh = window.innerHeight
  const pad = 10

  const clampL = (l) => Math.max(pad, Math.min(l + offsetX, vw - cardW - pad))
  const clampT = (t) => Math.max(pad, Math.min(t + offsetY, vh - cardH - pad))

  switch (pos) {
    case 'right': return { top: clampT(spotlight.top), left: clampL(spotlight.left + spotlight.width + margin) }
    case 'left':  return { top: clampT(spotlight.top), left: clampL(spotlight.left - cardW - margin) }
    case 'bottom': return { top: clampT(spotlight.top + spotlight.height + margin), left: clampL(spotlight.left + spotlight.width / 2 - cardW / 2) }
    case 'top': return { top: clampT(spotlight.top - margin - cardH), left: clampL(spotlight.left + spotlight.width / 2 - cardW / 2) }
    case 'top-right': return { top: clampT(spotlight.top - margin - cardH), left: clampL(spotlight.left) }
    case 'top-left': return { top: clampT(spotlight.top - margin - cardH), left: clampL(spotlight.left + spotlight.width - cardW) }
    default: return { top: clampT(spotlight.top), left: clampL(spotlight.left + spotlight.width + margin) }
  }
}

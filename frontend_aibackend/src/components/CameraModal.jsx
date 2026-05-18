import { useState } from 'react'
import { X, Camera, Loader } from 'lucide-react'

const GUIDE_STEPS = [
  { step: 1, title: '상처 세척', desc: '흐르는 물에 15분 이상 세척', icon: '💧', color: 'var(--blue-400)' },
  { step: 2, title: '지혈 처치', desc: '거즈로 5분 이상 압박 지혈', icon: '🩹', color: 'var(--orange-400)' },
  { step: 3, title: '소독', desc: '포비돈 요오드로 소독', icon: '✨', color: 'var(--teal-400)' },
  { step: 4, title: '드레싱', desc: '멸균 거즈로 상처 피복', icon: '🏥', color: 'var(--green-400)' },
]

export default function CameraModal({ onClose }) {
  const [phase, setPhase] = useState('capture') // capture | analyzing | result
  const [currentStep, setCurrentStep] = useState(0)

  const handleCapture = () => {
    setPhase('analyzing')
    setTimeout(() => {
      setPhase('result')
      // Auto-advance animation
      let step = 0
      const timer = setInterval(() => {
        step++
        if (step >= GUIDE_STEPS.length) { clearInterval(timer); return }
        setCurrentStep(step)
      }, 1800)
    }, 2200)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(5,13,26,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        background: 'var(--navy-800)', border: '1px solid var(--border)',
        borderRadius: 20, width: 520, maxHeight: '88vh', overflow: 'auto',
        padding: 28, position: 'relative',
      }} className="fade-in">
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text-secondary)',
          display: 'flex',
        }}><X size={16} /></button>

        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>
          📷 외상 촬영 — AI 응급처치 분석
        </div>

        {/* Capture phase */}
        {phase === 'capture' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '100%', height: 240,
              background: 'var(--navy-900)', borderRadius: 12,
              border: '2px dashed var(--border)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 20, color: 'var(--text-muted)',
            }}>
              <Camera size={40} style={{ marginBottom: 10, opacity: 0.4 }} />
              <div style={{ fontSize: 13 }}>카메라 또는 이미지 업로드</div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={handleCapture} style={{
                padding: '11px 24px',
                background: 'linear-gradient(135deg, var(--teal-400), var(--teal-500))',
                border: 'none', borderRadius: 10, cursor: 'pointer',
                color: '#fff', fontSize: 13, fontWeight: 700,
              }}>📷 촬영 시작</button>
              <button onClick={handleCapture} style={{
                padding: '11px 24px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
                borderRadius: 10, cursor: 'pointer',
                color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600,
              }}>이미지 업로드</button>
            </div>
          </div>
        )}

        {/* Analyzing phase */}
        {phase === 'analyzing' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              border: '3px solid var(--teal-400)',
              borderTopColor: 'transparent',
              margin: '0 auto 20px',
              animation: 'spin 1s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>AI 분석 중...</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>상처 유형 판별 및 응급처치 가이드 생성</div>
          </div>
        )}

        {/* Result phase */}
        {phase === 'result' && (
          <div>
            {/* Analysis result */}
            <div style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: 20,
              background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.3)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red-400)', marginBottom: 4 }}>🔍 AI 분석 결과</div>
              <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>열상 (중등도) — 즉각 처치 필요</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>상처 깊이 약 0.5~1cm 추정 · 감염 위험 주의</div>
            </div>

            {/* Animated guide steps */}
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>응급처치 가이드</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {GUIDE_STEPS.map((g, i) => {
                const visible = i <= currentStep
                return (
                  <div key={i} style={{
                    display: 'flex', gap: 14, alignItems: 'center',
                    padding: '12px 14px', borderRadius: 10,
                    background: i === currentStep ? `${g.color}12` : visible ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                    border: `1px solid ${i === currentStep ? g.color + '44' : 'var(--border)'}`,
                    opacity: visible ? 1 : 0.3,
                    transform: visible ? 'translateX(0)' : 'translateX(-10px)',
                    transition: 'all 0.5s ease',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: `${g.color}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20,
                    }}>{g.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: i === currentStep ? g.color : 'var(--text-primary)' }}>
                        Step {g.step}. {g.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{g.desc}</div>
                    </div>
                    {i === currentStep && (
                      <div style={{ fontSize: 11, fontWeight: 600, color: g.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: g.color, animation: 'pulse-dot 1s infinite' }} />
                        진행
                      </div>
                    )}
                    {i < currentStep && (
                      <span style={{ fontSize: 16 }}>✅</span>
                    )}
                  </div>
                )
              })}
            </div>

            <button onClick={onClose} style={{
              width: '100%', marginTop: 20, padding: '11px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
              borderRadius: 10, cursor: 'pointer',
              color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600,
            }}>닫기</button>
          </div>
        )}
      </div>
    </div>
  )
}

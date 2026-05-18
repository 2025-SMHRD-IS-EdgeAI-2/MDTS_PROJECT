import { useEffect, useState } from 'react'
import { Wifi, WifiOff, Brain, LogOut, Database } from 'lucide-react'
import logoImg from '../assets/logo.png'

const NAV = [
  { id: 'main',      label: '메인' },
  { id: 'crew',      label: '선원 관리' },
  { id: 'chart',     label: '환자 차트' },
  { id: 'emergency', label: '응급 처치' },
  { id: 'settings',  label: '시스템 설정' },
]

const normalizeBase = (value) => String(value || '').replace(/\/+$/, '')

const getApiBase = () => {
  const envBase = normalizeBase(import.meta.env?.VITE_LEGACY_API_BASE)
  if (envBase) return envBase
  if (typeof window === 'undefined') return 'http://localhost:4000/api'
  return `http://${window.location.hostname}:4000/api`
}

export default function Layout({ activePage, onNavigate, auth, onLogout, isOnline = true }) {
  const [ollamaState, setOllamaState] = useState({ connected: false, status: 'checking' })
  const [isTogglingOllama, setIsTogglingOllama] = useState(false)
  const ollamaOnline = Boolean(ollamaState.connected)

  useEffect(() => {
    let cancelled = false

    const checkOllama = async () => {
      try {
        const response = await fetch(`${getApiBase()}/ai/ollama-health`, { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))
        if (!cancelled) {
          setOllamaState({
            connected: Boolean(response.ok && payload.connected),
            status: response.ok && payload.connected ? 'online' : 'down',
            modelCount: payload.model_count || 0,
          })
        }
      } catch (error) {
        if (!cancelled) {
          setOllamaState({ connected: false, status: 'down', reason: error.message })
        }
      }
    }

    checkOllama()
    const timer = window.setInterval(checkOllama, 5000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const toggleOllama = async () => {
    if (isTogglingOllama) return
    setIsTogglingOllama(true)
    setOllamaState(prev => ({ ...prev, status: prev.connected ? 'stopping' : 'starting' }))

    try {
      const response = await fetch(`${getApiBase()}/ai/ollama-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: ollamaOnline ? 'stop' : 'start' }),
      })
      const payload = await response.json().catch(() => ({}))
      const health = payload.health || {}
      setOllamaState({
        connected: Boolean(response.ok && health.connected),
        status: response.ok && health.connected ? 'online' : 'down',
        modelCount: health.model_count || 0,
        reason: payload.error || health.reason || '',
      })
    } catch (error) {
      setOllamaState({ connected: false, status: 'down', reason: error.message })
    } finally {
      setIsTogglingOllama(false)
    }
  }

  return (
    <header style={{
      height: 72,
      background: 'var(--navy-950)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 32px',
      gap: 0,
      flexShrink: 0,
      zIndex: 50,
    }}>
      {/* Logo */}
      <div 
        onClick={() => {
          document.activeElement?.blur();
          toggleOllama();
        }}
        style={{ 
          display: 'flex', alignItems: 'center', gap: 12, marginRight: 48, flexShrink: 0,
          cursor: 'pointer' 
        }}
      >
        <div style={{
          width: 50,
          height: 50,
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: ollamaOnline ? 'rgba(13,217,197,0.14)' : 'rgba(244,63,94,0.12)',
          border: `1.5px solid ${ollamaOnline ? 'rgba(13,217,197,0.75)' : 'rgba(244,63,94,0.55)'}`,
          boxShadow: ollamaOnline ? '0 0 22px rgba(13,217,197,0.65), inset 0 0 16px rgba(13,217,197,0.18)' : '0 0 14px rgba(244,63,94,0.34)',
          transition: 'all 0.35s ease',
          position: 'relative',
          animation: ollamaOnline ? 'ollamaGlow 2.4s ease-in-out infinite' : 'none',
        }}>
          <img src={logoImg} alt="Logo" style={{
            width: 38,
            height: 38,
            objectFit: 'contain',
            filter: ollamaOnline ? 'drop-shadow(0 0 8px rgba(13,217,197,0.9)) saturate(1.25)' : 'grayscale(0.8) opacity(0.72)',
            transition: 'all 0.35s ease',
          }} />
          <span style={{
            position: 'absolute',
            right: -3,
            bottom: -3,
            width: 13,
            height: 13,
            borderRadius: '50%',
            background: ollamaOnline ? '#26de81' : '#f43f5e',
            border: '2px solid #020617',
            boxShadow: ollamaOnline ? '0 0 12px #26de81' : '0 0 10px #f43f5e',
          }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{
            fontSize: 24,
            fontWeight: 950,
            color: ollamaOnline ? '#5fffe8' : '#f43f5e',
            letterSpacing: '-0.8px',
            textShadow: ollamaOnline ? '0 0 12px rgba(13,217,197,0.7)' : 'none',
            transition: 'all 0.35s ease',
          }}>MDTS</span>
          <span style={{
            fontSize: 11,
            fontWeight: 900,
            color: ollamaOnline ? '#26de81' : '#fb7185',
            letterSpacing: '0.6px',
          }}>
            {isTogglingOllama || ollamaState.status === 'starting' || ollamaState.status === 'stopping'
              ? (ollamaOnline ? 'AI STOPPING' : 'AI STARTING')
              : (ollamaOnline ? `AI ONLINE${ollamaState.modelCount ? ` · ${ollamaState.modelCount}` : ''}` : 'AI OFFLINE')}
          </span>
        </div>
      </div>

      {/* Nav tabs */}
      <nav style={{ display: 'flex', gap: 8, flex: 1, height: '100%' }}>
        {NAV.map(({ id, label, badge }) => {
          const active = activePage === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              style={{
                padding: '0 32px',
                height: '100%',
                border: 'none', cursor: 'pointer',
                background: active ? 'rgba(13,217,197,0.1)' : 'transparent',
                color: active ? 'var(--teal-400)' : 'var(--text-secondary)',
                fontSize: 28, fontWeight: active ? 950 : 500,
                transition: 'all 0.15s',
                position: 'relative',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              {label}
              {active && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: 4, background: 'var(--teal-400)',
                }} />
              )}
              {badge && (
                <span style={{
                  marginLeft: 6, background: 'var(--red-400)',
                  color: '#fff', fontSize: 14, fontWeight: 900,
                  padding: '2px 9px', borderRadius: 12,
                }}>{badge}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Right info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        
        {/* 데이터 동기화 상태 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#38bdf8' }}>
            <Database size={16} />
            <span style={{ fontSize: 16, fontWeight: 900 }}>전송 대기 : 2건</span>
          </div>
          <div style={{ fontSize: 13, color: '#475569', fontWeight: 700 }}>최근 전송 : 10:24:15</div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 24px', borderRadius: 12,
          background: isOnline ? 'rgba(38,222,129,0.1)' : 'rgba(244,63,94,0.15)',
          border: `2px solid ${isOnline ? 'rgba(38,222,129,0.4)' : 'rgba(244,63,94,0.5)'}`,
          animation: isOnline ? 'none' : 'blink 4s infinite',
          boxShadow: isOnline ? 'none' : '0 0 15px rgba(244,63,94,0.3)'
        }}>
          {isOnline ? <Wifi size={24} color="#26de81" /> : <WifiOff size={24} color="#f43f5e" />}
          <span style={{ fontSize: '20px', fontWeight: 900, color: isOnline ? '#26de81' : '#f43f5e', letterSpacing: '0.5px' }}>
            {isOnline ? '네트워크 온라인' : '오프라인 모드 작동 중'}
          </span>
        </div>
        <style>{`
          @keyframes ollamaGlow {
            0% { box-shadow: 0 0 16px rgba(13,217,197,0.45), inset 0 0 12px rgba(13,217,197,0.14); }
            50% { box-shadow: 0 0 30px rgba(13,217,197,0.85), inset 0 0 20px rgba(13,217,197,0.24); }
            100% { box-shadow: 0 0 16px rgba(13,217,197,0.45), inset 0 0 12px rgba(13,217,197,0.14); }
          }
          @keyframes blink {
            0% { opacity: 1; }
            50% { opacity: 0.6; }
            100% { opacity: 1; }
          }
        `}</style>
        {auth && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderLeft: '1px solid var(--border)', paddingLeft: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{auth.shipNo}</span>
              <span style={{ margin: '0 6px', color: 'var(--border)' }}>|</span>
              <span style={{ color: 'var(--text-secondary)' }}>{auth.deviceNo}</span>
            </div>
            <button 
              onClick={onLogout}
              title="로그아웃"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
                padding: '6px', borderRadius: 6, transition: '0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,77,109,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <LogOut size={20} />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}


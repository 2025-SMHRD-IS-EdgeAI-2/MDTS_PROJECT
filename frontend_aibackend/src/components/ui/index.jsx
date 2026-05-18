import { Edit3, ChevronRight, AlertCircle } from 'lucide-react'

export function NavTab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ 
      background: 'none', border: 'none', padding: '0 28px', height: '100%',
      color: active ? '#38bdf8' : '#64748b', fontSize: 24, fontWeight: 900,
      borderBottom: `5px solid ${active ? '#38bdf8' : 'transparent'}`,
      cursor: 'pointer', transition: '0.2s'
    }}>{label}</button>
  )
}

export function DashboardVital({ label, value, unit, color, editable, onEdit, live, isConnected = true, valueSize = 44 }) {
  const baseColor = isConnected ? color : '#fbbf24';
  const glowColor = isConnected ? `${color}33` : '#fbbf2433';
  
  return (
    <div style={{
      position: 'relative',
      padding: '1.2px',
      borderRadius: '24px',
      background: 'rgba(255, 255, 255, 0.05)',
      overflow: 'hidden',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      minHeight: 135,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 회전하는 빛 레이어 (오로라 스타일 : 로그인 박스와 동일한 청록색 #00e5cc 고정) */}
      {isConnected && (
        <div style={{ 
          position: 'absolute', top: '-100%', left: '-100%', width: '300%', height: '300%', 
          background: `conic-gradient(from 0deg, transparent 0%, rgba(0, 229, 204, 0.3) 20%, #fff 35%, #00e5cc 50%, rgba(0, 229, 204, 0.3) 70%, transparent 100%)`, 
          animation: 'borderRotate 6s linear infinite', transformOrigin: 'center',
          opacity: 0.6,
          filter: 'blur(15px)' 
        }} />
      )}

      {/* 내부 콘텐츠 카드 */}
      <div style={{ 
        flex: 1,
        background: isConnected 
          ? 'rgba(2, 12, 22, 0.95)' 
          : 'rgba(45, 35, 10, 0.95)', 
        backdropFilter: 'blur(40px)', 
        borderRadius: '23px', 
        padding: '16px 18px',
        position: 'relative', 
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        {/* 상단 : 라벨(좌) 및 상태 점/편집 버튼(우) */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{
              fontSize: 21, fontWeight: 950,
              color: isConnected ? 'rgba(255,255,255,0.9)' : '#fbbf24',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              textShadow: isConnected ? '0 0 10px rgba(255,255,255,0.2)' : 'none',
              marginTop: -2
            }}>
              {label}
            </div>
            {/* 정상 범위 정보 */}
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.25)', fontWeight: 300, letterSpacing: '0.3px' }}>
              {label === '심박수' ? '60-100' : 
               label === '산소포화도' ? '95-100' : 
               label === '호흡수' ? '12-20' : 
               label.includes('혈압') ? '90/60-140/90' : 
               label.includes('체온') ? '36.1-37.2' : ''}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {editable && isConnected && (
              <button 
                onClick={onEdit} 
                style={{ 
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                  color: '#00e5cc', cursor: 'pointer', borderRadius: 10,
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: '0.2s', marginTop: -4
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 229, 204, 0.15)';
                  e.currentTarget.style.borderColor = '#00e5cc';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <Edit3 size={16} />
              </button>
            )}

            {live && isConnected && (
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: color,
                boxShadow: `0 0 12px ${color}`,
                animation: 'pulse-dot 1.5s ease-in-out infinite'
              }} />
            )}

            {!isConnected && (
              <div style={{ color: '#fbbf24', animation: 'pulse 2s infinite' }}>
                <AlertCircle size={18} />
              </div>
            )}
          </div>
        </div>
        
        {/* 중앙/하단 : 값 및 단위 (우측 하단 배치) */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', width: '100%', gap: 6 }}>
          {isConnected ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ 
                fontSize: valueSize, 
                fontWeight: 950, 
                background: 'linear-gradient(135deg, #39ff6a 0%, #00ffcc 50%, #00e5ff 100%)', 
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-1.5px', 
                whiteSpace: 'nowrap'
              }}>{(value === null || value === undefined || isNaN(value) && typeof value !== 'string') ? '-' : value}</span>
              <span style={{ 
                fontSize: 14, 
                color: 'rgba(0, 255, 204, 0.5)', 
                fontWeight: 800,
                marginBottom: 4
              }}>{unit}</span>
            </div>
          ) : (
            <div style={{ paddingBottom: 4 }}>
              <div style={{ fontSize: 17, fontWeight: 950, color: '#fbbf24' }}>CHECK SENSOR</div>
              <div style={{ fontSize: 11, color: 'rgba(251, 191, 36, 0.4)', fontWeight: 700 }}>연결 확인 필요</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function TimelineItem({ time, label, detail, highlight }) {
  return (
    <div style={{ marginBottom: 48, position: 'relative' }}>
      <div style={{ position: 'absolute', left: -45, top: 12, width: 20, height: 20, borderRadius: '50%', background: highlight ? '#f43f5e' : '#38bdf8', boxShadow: highlight ? '0 0 25px #f43f5e' : '0 0 15px rgba(56,189,248,0.4)' }} />
      <div style={{ fontSize: 18.5, color: '#64748b', marginBottom: 8, fontWeight: 700 }}>{time}</div>
      <div style={{ fontSize: 22, fontWeight: 950, color: highlight ? '#fb7185' : '#e2e8f0', letterSpacing: '-0.5px', lineHeight: 1.3 }}>{label}</div>
      <div style={{ fontSize: 24, color: '#94a3b8', marginTop: 12, lineHeight: 1.6 }}>{detail}</div>
    </div>
  )
}

export function StepItem({ num, title, desc, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', gap: 20, padding: 20, borderRadius: 20, cursor: 'pointer',
        background: active ? 'rgba(56,189,248,0.08)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${active ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.05)'}`,
        transition: 'all 0.2s',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: active ? 'linear-gradient(135deg,#38bdf8,#0ea5e9)' : '#1e293b',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 900, color: active ? '#000' : '#64748b',
      }}>{num}</div>
      <div>
        <div style={{ fontSize: 18.5, fontWeight: 800, marginBottom: 4, color: active ? '#38bdf8' : '#fff' }}>{title}</div>
        <div style={{ fontSize: 17, color: active ? '#cbd5e1' : '#94a3b8', lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  )
}

export function SymptomTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 24px', borderRadius: 12, border: `1px solid ${active ? '#38bdf8' : 'rgba(255,255,255,0.05)'}`,
        background: active ? '#38bdf8' : 'rgba(255,255,255,0.03)',
        color: active ? '#000' : '#64748b',
        fontWeight: 800, fontSize: 20, cursor: 'pointer',
      }}
    >{label}</button>
  )
}

export function InfoItem({ label, value, span = 1, size }) {
  const valueSize = size === 'xl_ultra' ? 32 : (size === 'xl_max' ? 28 : (size === 'xl_plus' ? 25 : (size === 'xl' ? 22 : (size === 'large' ? 18 : 13))))
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <div style={{ fontSize: 18, color: '#64748b', marginBottom: 8, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: valueSize, fontWeight: 800 }}>{value}</div>
    </div>
  )
}

export function ActionBtn({ icon, label, highlight, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      style={{ 
        width: '100%', padding: '16px 20px', borderRadius: 14, 
        background: active ? 'rgba(56,189,248,0.15)' : (highlight ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.02)'), 
        border: `1px solid ${active || highlight ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.05)'}`,
        color: active || highlight ? '#38bdf8' : '#94a3b8', 
        fontSize: 14, fontWeight: 800,
        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left',
        transition: '0.2s',
      }}
    >
      <div style={{ color: active || highlight ? '#38bdf8' : '#64748b' }}>{icon}</div>
      <span style={{ flex: 1 }}>{label}</span>
      <ChevronRight size={16} style={{ transform: active ? 'rotate(90deg)' : 'none', transition: '0.2s', opacity: 0.5 }} />
    </button>
  )
}

export function LoginInput({ icon, placeholder, value, onChange, focused, setFocused }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: focused ? 'rgba(56,189,248,0.06)' : 'rgba(255,255,255,0.04)', borderRadius: 13, padding: '0 18px', border: `1px solid ${focused ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.08)'}`, transition: 'all 0.2s', boxShadow: focused ? '0 0 0 3px rgba(56,189,248,0.08)' : 'none' }}>
      <div style={{ color: focused ? '#38bdf8' : '#475569', transition: 'color 0.2s' }}>{icon}</div>
      <input
        placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 14, height: 52, outline: 'none' }}
      />
    </div>
  )
}

export function SettingCard({ icon, title, desc, children }) {
  return (
    <div style={{ background: '#0f172a', borderRadius: 24, padding: 32, border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ color: '#38bdf8' }}>{icon}</div>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{title}</h3>
          <p style={{ fontSize: 14, color: '#64748b' }}>{desc}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

export function IdPhoto({ name, size = 52 }) {
  const bgColors = ['#e2e8f0', '#cbd5e1', '#d1d5db', '#bfdbfe']
  const bgColor = bgColors[name.length % bgColors.length]
  
  return (
    <div style={{ 
      width: size, height: size, borderRadius: '12%', overflow: 'hidden', 
      background: bgColor, border: '1.5px solid rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
    }}>
      <svg viewBox="0 0 100 100" style={{ width: '90%', height: '90%', marginTop: '10%' }}>
        {/* 머리 실루엣 (한국인 스타일의 단정한 헤어) */}
        <path d="M30 40 Q50 15 70 40 L75 55 Q75 65 50 65 Q25 65 25 55 Z" fill="#1a1a1a" />
        {/* 얼굴 */}
        <path d="M35 45 Q50 35 65 45 L65 65 Q50 80 35 65 Z" fill="#ffdbac" />
        {/* 목 */}
        <path d="M45 65 L55 65 L55 75 L45 75 Z" fill="#f1c27d" />
        {/* 정장/셔츠 카라 */}
        <path d="M20 85 Q50 70 80 85 L85 100 L15 100 Z" fill="#2d3748" />
        <path d="M45 75 L50 85 L55 75 Z" fill="#fff" /> {/* 와이셔츠 깃 */}
      </svg>
      {/* 증명사진 광택 효과 */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)' }} />
    </div>
  )
}

export function ModalField({ label, value, onChange, placeholder, readOnly }) {
  return (
    <div>
      <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 8, fontWeight: 700 }}>{label}</label>
      <input 
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{ 
          width: '100%', background: readOnly ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)', 
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 18px', 
          color: readOnly ? '#475569' : '#fff', outline: 'none', fontSize: 16
        }} 
      />
    </div>
  )
}

export function AlertModal({ isOpen, title, message, onConfirm, onCancel, type = 'info', isConfirm = false }) {
  if (!isOpen) return null

  const colors = {
    info: '#38bdf8',
    warning: '#fbbf24',
    danger: '#f43f5e',
    success: '#10b981'
  }
  const color = colors[type] || colors.info

  return (
    <div style={{ 
      position: 'fixed', inset: 0, zIndex: 9999, 
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20
    }}>
      <div style={{ 
        width: '100%', maxWidth: 480, background: '#0f172a', 
        border: `2px solid ${color}44`, borderRadius: 24, padding: 40,
        boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 20px ${color}11`,
        animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20 }}>
          <div style={{ 
            width: 12, height: 32, background: color, borderRadius: 4,
            boxShadow: `0 0 15px ${color}66`
          }} />
          <h2 style={{ fontSize: 28, fontWeight: 950, color: '#fff', letterSpacing: '-0.5px' }}>
            {title || (isConfirm ? '확인' : '알림')}
          </h2>
        </div>
        <div style={{ 
          fontSize: 20, color: '#94a3b8', lineHeight: 1.6, marginBottom: 40, 
          whiteSpace: 'pre-wrap', fontWeight: 600
        }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {isConfirm && (
            <button 
              onClick={onCancel}
              style={{ 
                flex: 1, padding: '18px', borderRadius: 16, 
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8',
                fontSize: 20, fontWeight: 950, cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              취소
            </button>
          )}
          <button 
            onClick={onConfirm}
            style={{ 
              flex: 2, padding: '18px', borderRadius: 16, 
              background: color, border: 'none', color: '#000',
              fontSize: 20, fontWeight: 950, cursor: 'pointer',
              transition: 'all 0.2s', boxShadow: `0 8px 20px ${color}33`
            }}
            onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.1)'}
            onMouseOut={e => e.currentTarget.style.filter = 'none'}
          >
            {isConfirm ? '확인' : '닫기'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}

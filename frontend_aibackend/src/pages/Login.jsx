import { useState } from 'react'
import { Database, Settings, Ship } from 'lucide-react'
import logoImg from '../assets/logo.png'
import { logActivity } from '../utils/api'

export default function Login({ onLogin }) {
  const [loginData, setLoginData] = useState({ serial: 'SN-0001', device: 'MED-01', ship: 'KOREA STAR' })
  const [focusedField, setFocusedField] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!loginData.serial.trim()) { setError('시리얼 넘버를 입력하세요.'); return }
    if (!loginData.device.trim()) { setError('기기 번호를 입력하세요.'); return }
    if (!loginData.ship.trim()) { setError('선박 번호를 입력하세요.'); return }
    setError('')
    setLoading(true)
    try {
      await logActivity({
        event_type: 'LOGIN',
        serial_number: loginData.serial.trim(),
        device_number: loginData.device.trim(),
        ship_number: loginData.ship.trim(),
        action_detail: 'LOGIN_PAGE_SUBMIT',
      })
    } catch (error) {
      console.warn('[mdts-login] activity log write failed:', error.message)
    }
    setLoading(false)
    onLogin(loginData)
  }

  return (
    <div style={{
      height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 100% 90% at 82% 52%, #041c2e 0%, #020e1c 55%, #010810 100%)', 
      color: '#fff', fontFamily: 'Pretendard, sans-serif', overflow: 'hidden', position: 'relative'
    }}>
      
      {/* 배경 장식 (은은한 빛) */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 120% 100% at 50% 50%, transparent 40%, rgba(1, 8, 16, 0.6) 100%)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '100px', maxWidth: '1300px', width: '100%', padding: '0 60px', position: 'relative', zIndex: 10 }}>
        
        {/* 좌측 헤드라인 섹션 */}
        <div style={{ flex: 1 }}>
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '10px', 
            background: 'rgba(0, 229, 200, 0.08)', padding: '6px 16px', 
            borderRadius: '30px', border: '1px solid rgba(0, 229, 200, 0.25)',
            marginBottom: '16px'
          }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00e5cc', boxShadow: '0 0 8px #00e5cc' }} />
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#00e5cc', letterSpacing: '2px' }}>MDTS (Medical + Digitising)</span>
          </div>

          <div style={{ marginBottom: '40px' }}>
            <h1 style={{ fontSize: '56px', fontWeight: '950', lineHeight: '1.2', letterSpacing: '-2px', margin: 0, color: '#fff' }}>
              선박용 엣지 AI<br />
              <span style={{
                fontSize: '56px',
                background: 'linear-gradient(90deg, #39ff6a 0%, #00ffcc 55%, #00e5ff 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                display: 'inline-block'
              }}>
                응급 가이드 솔루션
              </span>
            </h1>
            <p style={{ 
              fontSize: '18px', 
              color: '#94a3b8', 
              lineHeight: '1.6', 
              marginTop: '24px', 
              fontWeight: 500,
              maxWidth: '560px'
            }}>
              본 서비스에서 제공하는 분석 결과는 AI 알고리즘에 기초한 참고용 정보이며<br />의사의 확진을 대체할 수 없습니다.            </p>
          </div>

        </div>

        {/* 우측 로그인 카드 섹션 (흐르는 빛 효과 구현) */}
        <div style={{ width: '460px', position: 'relative' }}>
          <div style={{ 
            position: 'relative', padding: '1.5px', borderRadius: '28px', 
            background: 'rgba(0, 229, 200, 0.1)', overflow: 'hidden' 
          }}>
            {/* 회전하는 빛 레이어 */}
            <div style={{ 
              position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', 
              background: 'conic-gradient(transparent, transparent, transparent, #00e5cc)', 
              animation: 'borderRotate 4s linear infinite', transformOrigin: 'center' 
            }} />

            {/* 내부 폼 카드 */}
            <div style={{ 
              background: 'rgba(2, 12, 22, 0.92)', backdropFilter: 'blur(40px)', 
              borderRadius: '26.5px', padding: '48px 44px', position: 'relative', zIndex: 2 
            }}>
              <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                  <img src={logoImg} alt="MDTS Logo" style={{ width: '100px', height: '100px', objectFit: 'contain' }} />
                </div>
                <h3 style={{ fontSize: '26px', fontWeight: '900', letterSpacing: '0.3px', marginBottom: '7px', color: '#fff' }}>MDTS</h3>
                <p style={{ fontSize: '20.8px', color: 'rgba(0, 200, 180, 0.75)', fontWeight: '600' }}>
                  바다 위 어디서든, 멈추지 않는 의료 AI
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <LoginInput icon={<Database size={20}/>} placeholder="시리얼 넘버" value={loginData.serial} onChange={v => { setLoginData({...loginData, serial: v}); setError('') }} focused={focusedField === 'serial'} onFocus={() => setFocusedField('serial')} onBlur={() => setFocusedField(null)} />
                <LoginInput icon={<Settings size={20}/>} placeholder="기기 번호" value={loginData.device} onChange={v => { setLoginData({...loginData, device: v}); setError('') }} focused={focusedField === 'device'} onFocus={() => setFocusedField('device')} onBlur={() => setFocusedField(null)} />
                <LoginInput icon={<Ship size={20}/>} placeholder="선박 번호" value={loginData.ship} onChange={v => { setLoginData({...loginData, ship: v}); setError('') }} focused={focusedField === 'ship'} onFocus={() => setFocusedField('ship')} onBlur={() => setFocusedField(null)} />

                {error && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#ff4d6d', fontWeight: 700 }}>
                    ⚠ {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: '10px', padding: '22px', borderRadius: '18px',
                    background: loading ? 'rgba(0,200,180,0.4)' : 'linear-gradient(90deg, #00c9b1, #00a8e8)', color: '#000',
                    border: 'none', fontWeight: '900', fontSize: '19px', cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 28px rgba(0, 200, 180, 0.4)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {loading ? '접속 중...' : '시스템 접속'}
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes borderRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}


function LoginInput({ icon, placeholder, value, onChange, focused, onFocus, onBlur }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: '16px', padding: '0 20px', 
      border: `1.5px solid ${focused ? '#00e5cc' : 'rgba(255, 255, 255, 0.08)'}`,
      height: '60px', transition: 'all 0.2s',
      boxShadow: focused ? '0 0 15px rgba(0, 229, 200, 0.1)' : 'none'
    }}>
      <div style={{ color: focused ? '#00e5cc' : '#64748b', transition: 'color 0.2s' }}>{icon}</div>
      <input
        placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: '15px', outline: 'none', fontWeight: '500' }}
      />
    </div>
  )
}

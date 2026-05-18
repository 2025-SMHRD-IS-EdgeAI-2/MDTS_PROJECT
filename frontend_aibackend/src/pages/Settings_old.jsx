import { useState } from 'react'
import { Radio, Check, RefreshCw, Ship, Wifi, WifiOff, Volume2, Bell, Shield } from 'lucide-react'

const CHANNELS = [
  { id: 'ch16', label: 'CH 16', desc: '국제 조난·호출 채널 (항상 청취)', type: 'distress', freq: '156.800 MHz' },
  { id: 'ch06', label: 'CH 06', desc: '선박간 통신', type: 'intership', freq: '156.300 MHz' },
  { id: 'ch70', label: 'CH 70', desc: 'DSC 디지털 조난 통보', type: 'dsc', freq: '156.525 MHz' },
  { id: 'ch22a', label: 'CH 22A', desc: '해안경비대 통신', type: 'coast', freq: '157.100 MHz' },
  { id: 'ch68', label: 'CH 68', desc: '레저선박 채널', type: 'leisure', freq: '156.425 MHz' },
  { id: 'ch77', label: 'CH 77', desc: '선박간 작업채널', type: 'work', freq: '156.875 MHz' },
  { id: 'custom', label: '직접 입력', desc: '사용자 정의 채널', type: 'custom', freq: '' },
]

const CHANNEL_COLORS = {
  distress: 'var(--red-400)',
  intership: 'var(--teal-400)',
  dsc: 'var(--orange-400)',
  coast: 'var(--blue-400)',
  leisure: 'var(--green-400)',
  work: 'var(--text-secondary)',
  custom: 'var(--text-muted)',
}

export default function Settings() {
  const [activeChannel, setActiveChannel] = useState('ch16')
  const [customFreq, setCustomFreq] = useState('')
  const [volume, setVolume] = useState(80)
  const [squelch, setSquelch] = useState(5)
  const [alerts, setAlerts] = useState({ emergency: true, lowStock: true, vitalAlert: true, connection: false })
  const [shipInfo, setShipInfo] = useState({ name: 'KOREA STAR-7', mmsi: '440YOUR_DB_PASSWORD6', callsign: 'HLKR7' })

  const toggleAlert = k => setAlerts(a => ({ ...a, [k]: !a[k] }))

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100vh - 46px)', overflow: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        {/* Channel switching */}
        <div style={{ background: 'rgba(15,32,64,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Radio size={16} color="var(--teal-400)" />
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>무선 채널 설정</div>
          </div>

          {/* Active channel display */}
          <div style={{
            padding: '14px', borderRadius: 10, marginBottom: 16,
            background: 'rgba(13,217,197,0.08)', border: '1px solid rgba(13,217,197,0.3)',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'rgba(13,217,197,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Radio size={22} color="var(--teal-400)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>현재 통신 채널</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--teal-400)' }}>
                {CHANNELS.find(c => c.id === activeChannel)?.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {activeChannel === 'custom' ? customFreq || '주파수 입력 필요' : CHANNELS.find(c => c.id === activeChannel)?.freq}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green-400)', marginLeft: 'auto', marginBottom: 4, animation: 'pulse-dot 2s infinite' }} />
              <div style={{ fontSize: 11, color: 'var(--green-400)', fontWeight: 600 }}>송수신 중</div>
            </div>
          </div>

          {/* Channel list */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {CHANNELS.map(ch => {
              const color = CHANNEL_COLORS[ch.type]
              const isActive = activeChannel === ch.id
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id)}
                  style={{
                    padding: '10px 12px', borderRadius: 9, border: '1px solid',
                    borderColor: isActive ? color : 'var(--border)',
                    background: isActive ? `${color}12` : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer', textAlign: 'left', position: 'relative',
                    transition: 'all 0.15s',
                  }}
                >
                  {isActive && (
                    <div style={{
                      position: 'absolute', top: 6, right: 6,
                      width: 18, height: 18, borderRadius: '50%',
                      background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={11} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                  <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? color : 'var(--text-primary)', marginBottom: 3 }}>{ch.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>{ch.desc}</div>
                  {ch.freq && <div style={{ fontSize: 10, color: isActive ? color : 'var(--text-muted)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{ch.freq}</div>}
                  {ch.id === 'custom' && isActive && (
                    <input
                      value={customFreq}
                      onChange={e => setCustomFreq(e.target.value)}
                      placeholder="156.XXX MHz"
                      onClick={e => e.stopPropagation()}
                      style={{
                        marginTop: 6, width: '100%', background: 'var(--navy-800)',
                        border: '1px solid var(--teal-400)', borderRadius: 5, padding: '4px 8px',
                        color: 'var(--text-primary)', fontSize: 11, outline: 'none',
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Volume & Squelch */}
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <SliderControl label="볼륨" value={volume} setValue={setVolume} max={100} icon={<Volume2 size={13} />} />
            <SliderControl label="스켈치" value={squelch} setValue={setSquelch} max={9} icon={<Radio size={13} />} />
          </div>
        </div>

        {/* Right: Ship info + Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Ship info */}
          <div style={{ background: 'rgba(15,32,64,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Ship size={15} color="var(--blue-400)" />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>선박 정보</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: '선박명', key: 'name' },
                { label: 'MMSI 번호', key: 'mmsi' },
                { label: '호출 부호', key: 'callsign' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
                  <input
                    value={shipInfo[key]}
                    onChange={e => setShipInfo(s => ({ ...s, [key]: e.target.value }))}
                    style={{
                      width: '100%', background: 'var(--navy-800)', border: '1px solid var(--border)',
                      borderRadius: 7, padding: '8px 10px', color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                    }}
                  />
                </div>
              ))}
              <button style={{
                padding: '9px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, var(--teal-400), var(--teal-500))',
                cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}><RefreshCw size={13} />정보 저장</button>
            </div>
          </div>

          {/* Alerts */}
          <div style={{ background: 'rgba(15,32,64,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Bell size={15} color="var(--orange-400)" />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>알림 설정</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'emergency', label: '응급 상황 알림', desc: '응급 발생 시 즉각 알림', color: 'var(--red-400)' },
                { key: 'lowStock', label: '의약품 부족 알림', desc: '재고 최솟값 도달 시', color: 'var(--orange-400)' },
                { key: 'vitalAlert', label: '바이탈 이상 알림', desc: '정상 범위 이탈 시', color: 'var(--orange-400)' },
                { key: 'connection', label: '연결 상태 알림', desc: '네트워크 변화 시', color: 'var(--blue-400)' },
              ].map(({ key, label, desc, color }) => (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 8,
                  background: alerts[key] ? `${color}08` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${alerts[key] ? color + '30' : 'var(--border)'}`,
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
                  </div>
                  <Toggle value={alerts[key]} onChange={() => toggleAlert(key)} color={color} />
                </div>
              ))}
            </div>
          </div>

          {/* Security */}
          <div style={{ background: 'rgba(15,32,64,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Shield size={14} color="var(--teal-400)" />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>보안</div>
            </div>
            <button style={{
              width: '100%', padding: '9px', borderRadius: 8,
              background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.3)',
              cursor: 'pointer', color: 'var(--red-400)', fontSize: 12, fontWeight: 600,
            }}>로그아웃</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SliderControl({ label, value, setValue, max, icon }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal-400)', marginLeft: 'auto' }}>{value}</span>
      </div>
      <input type="range" min={0} max={max} value={value} onChange={e => setValue(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--teal-400)' }} />
    </div>
  )
}

function Toggle({ value, onChange, color }) {
  return (
    <button onClick={onChange} style={{
      width: 38, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
      background: value ? color : 'var(--navy-700)',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 2, left: value ? 20 : 2,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

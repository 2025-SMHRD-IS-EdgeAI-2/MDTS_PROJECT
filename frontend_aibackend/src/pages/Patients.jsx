import { useState } from 'react'
import { Search, Heart, Thermometer, Activity, ChevronRight, Phone, FileText, User, AlertCircle, Clock, ShieldCheck, Weight, Ruler, HeartPulse, Wind, Brain } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts'

const PATIENTS = [
  {
    id: 1, name: '강바다', age: 58, role: '선장 (Captain)', blood: 'O+', risk: 'high',
    bp: '-', hr: '-', temp: '-', spo2: '-', weight: 82, height: 172,
    conditions: ['만성 고혈압', '협심증 의증'],
    history: [
      { date: '2026-04-10', type: '응급', note: '야간 당직 중 흉통 호소, 니트로글리세린 투여' },
      { date: '2026-03-15', type: '검진', note: '혈압 관리 주의 권고' },
    ],
    trend: [ { d: '월', hr: 88 }, { d: '화', hr: 92 }, { d: '수', hr: 95 }, { d: '목', hr: 90 }, { d: '금', hr: 94 }, { d: '토', hr: 92 }, { d: '일', hr: 92 } ],
    radar: [ { sub: '심박', val: 50 }, { sub: '혈압', val: 30 }, { sub: '체온', val: 80 }, { sub: '산소', val: 60 }, { sub: 'BMI', val: 40 } ],
  },
  {
    id: 2, name: '이해무', age: 45, role: '기관장 (Chief Engineer)', blood: 'A+', risk: 'medium',
    bp: '-', hr: '-', temp: '-', spo2: '-', weight: 78, height: 176,
    conditions: ['열성 질환', '탈수 증상'],
    history: [
      { date: '2026-04-12', type: '내과', note: '기관실 고온 작업 후 발열 및 오한 발생' },
    ],
    trend: [ { d: '월', hr: 72 }, { d: '화', hr: 75 }, { d: '수', hr: 82 }, { d: '목', hr: 85 }, { d: '금', hr: 80 }, { d: '토', hr: 78 }, { d: '일', hr: 78 } ],
    radar: [ { sub: '심박', val: 75 }, { sub: '혈압', val: 65 }, { sub: '체온', val: 40 }, { sub: '산소', val: 95 }, { sub: 'BMI', val: 70 } ],
  },
  {
    id: 3, name: '박선교', age: 32, role: '1등 항해사 (1st Officer)', blood: 'B-', risk: 'low',
    bp: '-', hr: '-', temp: '-', spo2: '-', weight: 70, height: 180,
    conditions: ['정상', '피로 누적'],
    history: [
      { date: '2026-04-01', type: '일반', note: '수면 부족으로 인한 가벼운 어지럼증' },
    ],
    trend: [ { d: '월', hr: 62 }, { d: '화', hr: 65 }, { d: '수', hr: 64 }, { d: '목', hr: 68 }, { d: '금', hr: 66 }, { d: '토', hr: 64 }, { d: '일', hr: 64 } ],
    radar: [ { sub: '심박', val: 90 }, { sub: '혈압', val: 95 }, { sub: '체온', val: 98 }, { sub: '산소', val: 99 }, { sub: 'BMI', val: 85 } ],
  },
  {
    id: 4, name: '최파도', age: 29, role: '갑판원 (Deckhand)', blood: 'AB+', risk: 'high',
    bp: '-', hr: '-', temp: '-', spo2: '-', weight: 75, height: 174,
    conditions: ['저체온증', '골절 의심'],
    history: [
      { date: '2026-04-14', type: '응급', note: '작업 중 해상 추락 후 구조, 저체온증 집중 관리' },
    ],
    trend: [ { d: '월', hr: 70 }, { d: '화', hr: 72 }, { d: '수', hr: 75 }, { d: '목', hr: 110 }, { d: '금', hr: 105 }, { d: '토', hr: 105 }, { d: '일', hr: 105 } ],
    radar: [ { sub: '심박', val: 40 }, { sub: '혈압', val: 80 }, { sub: '체온', val: 20 }, { sub: '산소', val: 50 }, { sub: 'BMI', val: 80 } ],
  },
]

const RISK_COLOR = { low: '#26de81', medium: '#fb923c', high: '#ef4444' }
const RISK_BG = { low: 'rgba(38,222,129,0.1)', medium: 'rgba(251,146,60,0.1)', high: 'rgba(239,68,68,0.1)' }

export default function Patients() {
  const [selected, setSelected] = useState(PATIENTS[0])
  const [query, setQuery] = useState('')

  const filtered = PATIENTS.filter(p =>
    p.name.includes(query) || p.role.includes(query)
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', height: 'calc(100vh - 72px)', background: '#020617', color: '#f1f5f9', overflow: 'hidden', fontFamily: '"Pretendard", sans-serif' }}>
      
      {/* ── 좌측 환자 리스트 영역 ── */}
      <div style={{ borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', background: '#030816' }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Activity color="#0dd9c5" size={24} />
            <h1 style={{ fontSize: 22, fontWeight: 950, margin: 0, letterSpacing: '-0.5px' }}>선원 환자 차트</h1>
          </div>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} size={16} />
            <input
              placeholder="환자 검색..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 12px 12px 42px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(p => {
            const active = selected?.id === p.id
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                style={{
                  padding: '16px', borderRadius: 16, textAlign: 'left', cursor: 'pointer', transition: '0.2s',
                  background: active ? 'rgba(13,217,197,0.08)' : 'rgba(255,255,255,0.01)',
                  border: `1.5px solid ${active ? '#0dd9c5' : 'transparent'}`,
                  boxShadow: active ? '0 4px 20px rgba(0,0,0,0.4)' : 'none'
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: `linear-gradient(135deg, ${RISK_COLOR[p.risk]}22, ${RISK_COLOR[p.risk]}11)`,
                    border: `1.5px solid ${RISK_COLOR[p.risk]}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <User color={RISK_COLOR[p.risk]} size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontSize: 17, fontWeight: 800, color: active ? '#fff' : '#cbd5e1' }}>{p.name}</span>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_COLOR[p.risk], boxShadow: `0 0 10px ${RISK_COLOR[p.risk]}` }} />
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>{p.role.split('(')[0]}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 우측 환자 상세 차트 영역 ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {selected && (
          <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* 상단 슬림 프로필 헤더 */}
            <div style={{ 
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', 
              borderRadius: 24, padding: '24px 32px', display: 'flex', gap: 32, alignItems: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}>
              <div style={{ width: 84, height: 84, borderRadius: 20, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${RISK_COLOR[selected.risk]}44` }}>
                <User size={42} color={RISK_COLOR[selected.risk]} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                  <h2 style={{ fontSize: 32, fontWeight: 950, margin: 0, letterSpacing: '-1px' }}>{selected.name}</h2>
                  <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, background: RISK_BG[selected.risk], color: RISK_COLOR[selected.risk], fontWeight: 900, border: `1px solid ${RISK_COLOR[selected.risk]}33` }}>{selected.risk.toUpperCase()} SEVERITY</span>
                </div>
                <div style={{ display: 'flex', gap: 20, fontSize: 14, color: '#94a3b8', fontWeight: 700 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={14} /> {selected.role}</div>
                  <span>나이: {selected.age}세</span>
                  <span style={{ color: '#ff4d6d' }}>혈액형: {selected.blood}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Weight size={14} /> {selected.weight}kg</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Ruler size={14} /> {selected.height}cm</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button style={{ height: 48, padding: '0 24px', borderRadius: 14, background: '#0dd9c5', color: '#020617', border: 'none', fontWeight: 950, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}><Phone size={18} /> 원격진료</button>
                <button style={{ height: 48, padding: '0 24px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={18} /> 기록 작성</button>
              </div>
            </div>

            {/* 3컬럼 메인 그리드 */}
            <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr 340px', gap: 20 }}>
              
              {/* 1. 바이탈 수치 */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <VitalCard label="혈압" value={selected.bp} unit="mmHg" color="#fb923c" icon={<Activity size={16}/>} />
                <VitalCard label="심박수" value={selected.hr} unit="bpm" color="#ef4444" icon={<HeartPulse size={16}/>} />
                <VitalCard label="체온" value={selected.temp} unit="°C" color="#38bdf8" icon={<Thermometer size={16}/>} />
                <VitalCard label="산소" value={selected.spo2} unit="%" color="#2dd4bf" icon={<Wind size={16}/>} />
                <div style={{ gridColumn: 'span 2', marginTop: 8, padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#4a6080', marginBottom: 12 }}>ACTIVE CONDITIONS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selected.conditions.map(c => (
                      <div key={c} style={{ fontSize: 13, fontWeight: 800, color: '#fff', background: 'rgba(56,189,248,0.1)', padding: '6px 12px', borderRadius: 8 }}>{c}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. 주간 심박 트렌드 */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: '24px', height: 400 }}>
                <h3 style={{ fontSize: 16, fontWeight: 900, color: '#0dd9c5', marginBottom: 20 }}>WEEKLY VITAL TREND</h3>
                <div style={{ height: 'calc(100% - 40px)' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={selected.trend}>
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={RISK_COLOR[selected.risk]} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={RISK_COLOR[selected.risk]} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="d" stroke="#1e293b" hide />
                      <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 12 }} />
                      <Area type="monotone" dataKey="hr" stroke={RISK_COLOR[selected.risk]} strokeWidth={3} fill="url(#chartGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 3. 건강 지수 레이더 */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, padding: '24px' }}>
                <h3 style={{ fontSize: 16, fontWeight: 900, color: '#0dd9c5', marginBottom: 10 }}>HEALTH RADAR</h3>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={selected.radar}>
                      <PolarGrid stroke="rgba(255,255,255,0.05)" />
                      <PolarAngleAxis dataKey="sub" tick={{ fill: '#4a6080', fontSize: 11 }} />
                      <Radar dataKey="val" stroke={RISK_COLOR[selected.risk]} fill={RISK_COLOR[selected.risk]} fillOpacity={0.3} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* AI 분석 섹션 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 24 }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(13,217,197,0.05) 0%, rgba(0,168,150,0.02) 100%)', border: '1px solid rgba(13,217,197,0.15)', borderRadius: 28, padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <Brain size={20} color="#0dd9c5" />
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0dd9c5', margin: 0 }}>AI CLINICAL INTELLIGENCE</h3>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 16, borderLeft: '4px solid #ef4444' }}>
                  <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 900, marginBottom: 6 }}>CRITICAL INSIGHT</div>
                  <p style={{ fontSize: 15, color: '#e2e8f0', margin: 0, lineHeight: 1.6, fontWeight: 700 }}>심혈관계 스트레스 징후가 포착되니 지속적 모니터링이 필요합니다.</p>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 28, padding: 28 }}>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 20 }}>24H RISK PROJECTION</h3>
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[{ t: '현재', r: 30 }, { t: '+4h', r: 35 }, { t: '+8h', r: 55 }, { t: '+12h', r: 45 }, { t: '+16h', r: 60 }, { t: '+20h', r: 75 }, { t: '+24h', r: 65 }]}>
                      <defs>
                        <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="step" dataKey="r" stroke="#ef4444" strokeWidth={3} fill="url(#riskGradient)" strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 히스토리 */}
            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 24, padding: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 20 }}>MEDICAL TIMELINE</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 16 }}>
                {selected.history.map((h, i) => (
                  <div key={i} style={{ padding: '16px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', display: 'flex', gap: 16 }}>
                    <AlertCircle size={20} color={h.type === '응급' ? '#ef4444' : '#38bdf8'} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: '#fff' }}>[{h.type}] {h.date}</div>
                      <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>{h.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

function VitalCard({ label, value, unit, icon, color }) {
  return (
    <div style={{ padding: '16px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4a6080', fontSize: 11, fontWeight: 900, marginBottom: 8 }}>
        <div style={{ color }}>{icon}</div> {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 950 }}>{value}</span>
        <span style={{ fontSize: 12, color: '#4a6080' }}>{unit}</span>
      </div>
    </div>
  )
}


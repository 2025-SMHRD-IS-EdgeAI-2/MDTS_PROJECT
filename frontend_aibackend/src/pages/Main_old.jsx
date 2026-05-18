import { useState, useEffect } from 'react'
import { Send, Activity, Clock, Edit3, AlertCircle, Radio, CheckCircle2, History, Sparkles, RotateCcw } from 'lucide-react'
import profileImg from '../assets/CE.jpeg'

const HISTORY_DATA = [
  { date: '2026-04-07', type: '응급', label: '흉통 호소', detail: '아스피린 300mg 투여, 원격진료 연결', color: '#ff4d6d', doctor: '부산원격의료센터 최의사' },
  { date: '2026-04-01', type: '정기', label: '월간 정기검진', detail: '혈압 145/90 — 고혈압 약 조정', color: '#ff9f43', doctor: '선내 의무관' },
  { date: '2026-03-18', type: '처치', label: '손 찰과상 드레싱', detail: '멸균 드레싱 교체 처치', color: '#0dd9c5', doctor: '선내 의무관' },
  { date: '2026-03-05', type: '정기', label: '월간 정기검진', detail: '전반적 양호, 혈압 약 지속 복용', color: '#ff9f43', doctor: '선내 의무관' },
  { date: '2026-02-14', type: '응급', label: '심계항진 증상', detail: '심전도 정상, 안정 취함', color: '#ff4d6d', doctor: '부산원격의료센터 최의사' },
]

const TX_LOG = [
  { time: '09:31', type: '전송완료', msg: '바이탈 데이터 패킷 #47', ok: true },
  { time: '09:20', type: '전송완료', msg: '심전도 파형 스냅샷', ok: true },
  { time: '09:10', type: '전송대기', msg: '환자 차트 업데이트', ok: false },
  { time: '09:05', type: '전송완료', msg: '위성 통신 핸드셰이크', ok: true },
  { time: '08:55', type: '전송완료', msg: '주간 활동 보고서 전송', ok: true },
  { time: '08:40', type: '전송완료', msg: '센서 모듈 자가진단 패킷', ok: true },
  { time: '08:30', type: '전송실패', msg: '외부 기상 데이터 수신', ok: false },
  { time: '08:15', type: '전송완료', msg: '바이탈 데이터 패킷 #46', ok: true },
]

export default function Main() {
  const [prompt, setPrompt] = useState('')
  
  // 실시간 심박수 시뮬레이션
  const [hr, setHr] = useState(82)
  useEffect(() => {
    const t = setInterval(() => {
      setHr(h => Math.max(60, Math.min(120, h + Math.round((Math.random() - 0.5) * 3))))
    }, 3000)
    return () => clearInterval(t)
  }, [])

  const bp = '128/84'
  const bt = '36.7'
  const historyFilter = '전체'
  const [txLog] = useState(TX_LOG)

  const send = () => {
    if (!prompt.trim()) return
    setPrompt('')
  }

  const filteredHistory = historyFilter === '전체'
    ? HISTORY_DATA
    : HISTORY_DATA.filter(h => h.type === historyFilter)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '400px 1fr 420px',
      height: 'calc(100vh - 72px)',
      width: '100vw',
      overflow: 'hidden',
      background: '#050d1a'
    }}>

      {/* ── 1. 좌측 패널: 프로필 및 히스토리 ── */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        borderRight: '1.5px solid rgba(13,217,197,0.15)',
        background: 'rgba(10,22,40,0.95)',
        padding: '24px', overflowY: 'auto', minHeight: 0
      }}>
        <div style={{
          background: 'rgba(15, 32, 64, 0.4)',
          borderRadius: 24, padding: '32px 24px', marginBottom: 20
        }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 32 }}>
            <div style={{
              width: 110, height: 110, borderRadius: 24,
              border: '2.5px solid #00d2ff', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0, 210, 255, 0.05)'
            }}>
              <img src={profileImg} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', marginBottom: 4 }}>김항해</div>
              <div style={{ fontSize: 20, color: '#8da2c0', fontWeight: 600 }}>기관장</div>
              <div style={{ fontSize: 16, color: '#4a6080', marginTop: 4 }}>ID : S2026-026</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 15, color: '#4a6080', fontWeight: 700, marginBottom: 8 }}>나이/성별</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>55세 / 남</div>
            </div>
            <div>
              <div style={{ fontSize: 15, color: '#4a6080', fontWeight: 700, marginBottom: 8 }}>혈액형</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>A+형</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24 }}>
            <div style={{ fontSize: 16, color: '#4a6080', fontWeight: 700, marginBottom: 12 }}>과거력 (Past History)</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.6 }}>
              고혈압 (2022~)<br />
              페니실린 알레르기 있음
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <RotateCcw size={18} color="#00d2ff" />
            <span style={{ fontSize: 18, fontWeight: 800, color: '#00d2ff' }}>최근 진료 이력</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#00d2ff' }}>2026-03-15</span>
              <span style={{ fontSize: 14, color: '#4a6080' }}>단순 감기</span>
            </div>
            <div style={{ fontSize: 16, color: '#8da2c0', lineHeight: 1.6 }}>
              - 처방 : 타이레놀 500mg<br />
              - 특이사황 : 알레르기 반응 없음
            </div>
          </div>
        </div>

        <button style={{
          marginTop: 20, width: '100%', height: 72, borderRadius: 20,
          background: '#ff4d6d', color: '#fff', fontSize: 22, fontWeight: 900,
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 12, boxShadow: '0 8px 20px rgba(255, 77, 109, 0.3)'
        }}>
          <AlertCircle size={24} />
          응급 처치 액션 시작
        </button>
      </div>

      {/* ── 2. 중앙 패널: 상단 바이탈 모니터링 & 타임라인 ── */}
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1.5px solid rgba(13,217,197,0.15)', background: '#050d1a' }}>
        <div style={{ padding: '20px 32px', background: 'rgba(10,22,40,0.95)', borderBottom: '1.5px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Activity size={20} color="#00d2ff" />
            <span style={{ fontSize: 14, fontWeight: 900, color: '#00d2ff', letterSpacing: '0.5px' }}>VITAL SENSOR REAL-TIME MONITORING</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            <SensorCard label="심박수" value={hr} unit="bpm" color="#ff4d6d" status="live" />
            <SensorCard label="산소포화도" value="98" unit="%" color="#00d2ff" status="live" />
            <SensorCard label="호흡수" value="17" unit="/min" color="#26de81" status="live" />
            <SensorCard label="혈압 (입력)" value={bp} unit="mmHg" color="#fff" status="manual" />
            <SensorCard label="체온 (입력)" value={bt} unit="°C" color="#ff9f43" status="manual" />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
          <div style={{ position: 'relative', marginLeft: 14 }}>
            <div style={{ position: 'absolute', left: 48, top: 0, bottom: 0, width: 2, background: 'rgba(13,217,197,0.1)' }} />
            {filteredHistory.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 32, marginBottom: 40 }}>
                <div style={{ minWidth: 56, textAlign: 'right', paddingTop: 18 }}><span style={{ fontSize: 14, color: '#4a6080', fontWeight: 700 }}>{item.date.slice(5)}</span></div>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: item.color, zIndex: 1, marginTop: 18, border: '5px solid #050d1a', boxShadow: `0 0 15px ${item.color}88`, flexShrink: 0 }} />
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(13,217,197,0.12)', borderRadius: 20, padding: '24px 28px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}><span style={{ fontSize: 14, padding: '4px 14px', borderRadius: 8, background: `${item.color}20`, color: item.color, fontWeight: 800 }}>{item.type}</span><span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{item.label}</span></div>
                  <div style={{ fontSize: 18, color: '#8da2c0', lineHeight: 1.7 }}>{item.detail}</div>
                  <div style={{ marginTop: 14, fontSize: 14, color: '#4a6080', fontWeight: 500 }}>담당: 선내 의무관</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px 32px', background: 'rgba(10,22,40,0.95)', borderTop: '1.5px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', gap: 12, background: 'rgba(15,32,64,0.6)', padding: '10px 16px', borderRadius: 16, border: '1px solid rgba(13,217,197,0.2)' }}>
            <Sparkles size={20} color="#0dd9c5" style={{ marginTop: 12 }} />
            <input
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="환자 증상 입력 또는 AI 의료 어시스턴트에게 질문하기..."
              style={{ flex: 1, background: 'none', border: 'none', padding: '12px 0', color: '#fff', fontSize: 17, outline: 'none' }}
            />
            <button onClick={send} style={{ padding: '0 24px', borderRadius: 12, background: '#00d2ff', border: 'none', color: '#050d1a', cursor: 'pointer', fontSize: 16, fontWeight: 900 }}>분석 실행</button>
          </div>
        </div>
      </div>

      {/* ── 3. 우측 패널: 실시간 전송 로그 ── */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        background: 'rgba(10,22,40,0.85)',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 18, fontWeight: 900, color: '#0dd9c5', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.7px' }}>
          <History size={17} color="#0dd9c5" /> 실시간 전송 로그
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
          {txLog.map((log, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px', borderRadius: 14,
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${log.ok ? 'rgba(38,222,129,0.2)' : 'rgba(255,159,67,0.25)'}`,
            }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: log.ok ? '#26de81' : '#ff9f43' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#e8f0fe' }}>{log.msg}</div>
                <div style={{ fontSize: 13, color: '#4a6080', marginTop: 3 }}>{log.time} · {log.type}</div>
              </div>
              {log.ok ? <CheckCircle2 size={18} color="#26de81" /> : <RotateCcw size={18} color="#ff9f43" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SensorCard({ label, value, unit, color, status }) {
  return (
    <div style={{
      padding: '16px 12px', borderRadius: 16,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      textAlign: 'center', position: 'relative'
    }}>
      <div style={{ fontSize: 13, color: '#4a6080', fontWeight: 700, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
        <span style={{ fontSize: 26, fontWeight: 900, color }}>{value}</span>
        <span style={{ fontSize: 13, color: '#4a6080', fontWeight: 600 }}>{unit}</span>
      </div>
      {status === 'live' && (
        <div style={{ position: 'absolute', top: 10, right: 10, width: 5, height: 5, borderRadius: '50%', background: color, animation: 'pulse-dot 1.2s infinite' }} />
      )}
      {status === 'manual' && (
        <Edit3 size={11} color="#4a6080" style={{ position: 'absolute', top: 10, right: 10 }} />
      )}
    </div>
  )
}

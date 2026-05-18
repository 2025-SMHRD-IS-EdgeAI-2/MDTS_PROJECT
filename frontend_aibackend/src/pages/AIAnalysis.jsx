import { useState, useEffect, useRef } from 'react'
import { Brain, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Heart, Droplets, Thermometer, Activity, Zap, Shield, RotateCcw, Camera, Upload, X, ChevronRight, Sparkles, ScanLine, AlertCircle } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'

const RISK_SCORE = 72

const DIAGNOSES = [
  { confidence:94, title:'급성 심근경색 의심', icd:'I21.9', severity:'critical', color:'#ff4d6d',
    desc:'흉통, 호흡곤란, 혈압 상승(158/95) 및 고혈압·고지혈증 병력 종합 — 급성 심근경색 가능성 매우 높음.',
    actions:['즉시 원격 진료 연결','12유도 심전도 측정','CPR 장비 대기','아스피린 알레르기 → 클로피도그렐 대체'], },
  { confidence:61, title:'고혈압성 위기', icd:'I10', severity:'high', color:'#ff9f43',
    desc:'수축기 혈압 158mmHg 이상으로 고혈압성 긴급증 범위. 기존 병력 및 미복약 가능성 검토 필요.',
    actions:['혈압 15분 간격 재측정','안정 취하게 하기','암로디핀 복용 확인','신경학적 증상 모니터링'], },
  { confidence:38, title:'불안정 협심증', icd:'I20.0', severity:'medium', color:'#a55eea',
    desc:'안정 시에도 지속되는 흉통과 ST 변화 가능성. 심근경색과 감별 진단 필요.',
    actions:['안정 취하게 하기','산소포화도 지속 모니터링','니트로글리세린 투여 검토'], },
]

const VITAL_DATA = [
  { label:'심박수',    value:96,   unit:'bpm', normal:'60-100', warn:true,  trend:'up',   color:'#ff9f43', icon:<Heart size={13}/> },
  { label:'수축기혈압',value:158,  unit:'mmHg',normal:'<120',   warn:true,  trend:'up',   color:'#ff4d6d', icon:<Activity size={13}/> },
  { label:'산소포화도',value:94,   unit:'%',   normal:'95-100', warn:true,  trend:'down', color:'#ff9f43', icon:<Droplets size={13}/> },
  { label:'체온',      value:37.6, unit:'°C',  normal:'36.5-37.5',warn:true,trend:'up',  color:'#ff9f43', icon:<Thermometer size={13}/> },
]

const RADAR_DATA = [
  {sub:'심장',val:28},{sub:'혈압',val:22},{sub:'호흡',val:55},{sub:'체온',val:62},{sub:'산소',val:50},{sub:'의식',val:85}
]

const TREND_DATA = [
  {t:'08:00',hr:78,bp:142},{t:'08:15',hr:80,bp:145},{t:'08:30',hr:82,bp:148},
  {t:'08:45',hr:85,bp:150},{t:'09:00',hr:89,bp:153},{t:'09:15',hr:93,bp:156},{t:'09:30',hr:96,bp:158}
]

// 외상 부위별 AI 판단
const TRAUMA_RESULTS = {
  head: { label:'두부 외상', severity:'high', color:'#ff4d6d',
    desc:'두부 열상 확인. 뇌진탕 가능성 있음. 즉각적인 의식 수준 확인 필요.',
    guide:'cpr', actions:['의식 및 동공 반사 확인','목 고정 유지','바이탈 모니터링','원격 신경과 전문의 연결'] },
  chest: { label:'흉부 외상', severity:'critical', color:'#ff4d6d',
    desc:'흉부 타박상 및 기흉 의심. 호흡 곤란 동반 여부 즉시 확인.',
    guide:'cardiac', actions:['호흡음 청진','산소 공급','흉부 X-ray 검토','원격진료 즉시 연결'] },
  limb: { label:'사지 골절/열상', severity:'medium', color:'#ff9f43',
    desc:'사지 골절 또는 열상으로 추정. 즉각적인 고정 및 지혈 처치 필요.',
    guide:'fracture', actions:['부목 고정','지혈 처치','냉찜질','통증 관리'] },
  burn: { label:'화상 (2도 추정)', severity:'medium', color:'#ff9f43',
    desc:'피부 발적 및 수포 형성. 2도 화상 추정. 즉각적인 냉각 처치 필요.',
    guide:'burn', actions:['15분 냉각 처치','물집 보존','멸균 드레싱','감염 예방'] },
}

export default function AIAnalysis({ patient, onNavigate }) {
  const [activeIdx, setActiveIdx]     = useState(0)
  const [scanning, setScanning]       = useState(true)
  const [progress, setProgress]       = useState(0)
  const [mode, setMode]               = useState('vital')   // 'vital' | 'trauma'
  const [traumaImg, setTraumaImg]     = useState(null)
  const [traumaArea, setTraumaArea]   = useState('chest')
  const [traumaResult, setTraumaResult] = useState(null)
  const [traumaScanning, setTraumaScanning] = useState(false)
  const [traumaProgress, setTraumaProgress] = useState(0)
  const [captureModal, setCaptureModal] = useState(null)  // null | 'scanning' | 'success' | 'error'
  const [scanProgress, setScanProgress] = useState(0)
  const fileRef = useRef(null)

  useEffect(()=>{
    const t = setInterval(()=>setProgress(p=>{ if(p>=100){setScanning(false);clearInterval(t);return 100} return p+5 }),70)
    return ()=>clearInterval(t)
  },[])

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    setTraumaResult(null)
    setCaptureModal('scanning')
    setScanProgress(0)
    let p = 0
    const t = setInterval(() => {
      p += Math.random() * 8 + 4
      if (p >= 100) {
        clearInterval(t)
        setScanProgress(100)
        const ok = Math.random() > 0.2  // 80% 성공
        setTimeout(() => {
          if (ok) {
            setTraumaImg(url)
            setCaptureModal('success')
          } else {
            setCaptureModal('error')
          }
        }, 300)
      } else {
        setScanProgress(Math.min(p, 99))
      }
    }, 60)
  }

  const closeCaptureModal = () => {
    setCaptureModal(null)
    setScanProgress(0)
    if (fileRef.current) fileRef.current.value = ''
  }

  const retryCapture = () => {
    closeCaptureModal()
    setTimeout(() => fileRef.current?.click(), 100)
  }

  const analyzeTrauma = () => {
    setTraumaScanning(true)
    setTraumaProgress(0)
    const t = setInterval(()=>setTraumaProgress(p=>{
      if(p>=100){clearInterval(t);setTraumaScanning(false);setTraumaResult(TRAUMA_RESULTS[traumaArea]);return 100}
      return p+4
    }),60)
  }

  const rescan = () => { setScanning(true); setProgress(0) }

  if (scanning && progress < 100) {
    return (
      <div style={{ height:'calc(100vh - 44px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#050d1a', gap:28 }}>
        <div style={{ position:'relative', width:140, height:140 }}>
          {/* 원형 진행 — CSS border 방식 (no SVG) */}
          <div style={{
            width:140, height:140, borderRadius:'50%',
            background:`conic-gradient(#0dd9c5 ${progress*3.6}deg, rgba(13,217,197,0.1) 0deg)`,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 0 30px rgba(13,217,197,0.2)'
          }}>
            <div style={{ width:110, height:110, borderRadius:'50%', background:'#050d1a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 }}>
              <Brain size={32} color="#0dd9c5" style={{ animation:'stepPulse 1s infinite' }}/>
              <span style={{ fontSize:18, fontWeight:900, color:'#0dd9c5' }}>{progress}%</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:18, fontWeight:900, color:'#fff', marginBottom:7 }}>AI 분석 중...</div>
          <div style={{ fontSize:13, color:'#8da2c0' }}>
            {progress<30?'바이탈 데이터 수집':progress<60?'병력 데이터 분석':progress<85?'진단 모델 추론':'결과 생성 중'}
          </div>
        </div>
      </div>
    )
  }

  const diag = DIAGNOSES[activeIdx]

  const isCapScanning = captureModal === 'scanning'
  const isCapSuccess  = captureModal === 'success'

  return (
    <>
    {captureModal && (
      <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(2,8,18,0.88)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:340, borderRadius:24, overflow:'hidden', boxShadow:'0 30px 80px rgba(0,0,0,0.7)', border:`2px solid ${isCapScanning?'rgba(13,217,197,0.3)':isCapSuccess?'rgba(38,222,129,0.4)':'rgba(255,77,109,0.4)'}`, background:'rgba(8,16,32,0.98)' }}>
          <div style={{ height:4, background: isCapScanning?'linear-gradient(90deg,#0dd9c5,#4fc3f7)':isCapSuccess?'linear-gradient(90deg,#26de81,#0dd9c5)':'linear-gradient(90deg,#ff4d6d,#ff9f43)' }}/>
          <div style={{ padding:'32px 28px 28px' }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:22 }}>
              {isCapScanning ? (
                <div style={{ width:88, height:88, borderRadius:'50%', background:`conic-gradient(#0dd9c5 ${scanProgress*3.6}deg, rgba(13,217,197,0.08) 0deg)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:66, height:66, borderRadius:'50%', background:'#050d1a', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <ScanLine size={30} color="#0dd9c5" style={{ animation:'stepPulse 1s infinite' }}/>
                  </div>
                </div>
              ) : isCapSuccess ? (
                <div style={{ width:88, height:88, borderRadius:'50%', background:'rgba(38,222,129,0.12)', border:'2px solid rgba(38,222,129,0.35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <CheckCircle2 size={44} color="#26de81"/>
                </div>
              ) : (
                <div style={{ width:88, height:88, borderRadius:'50%', background:'rgba(255,77,109,0.12)', border:'2px solid rgba(255,77,109,0.35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <AlertCircle size={44} color="#ff4d6d"/>
                </div>
              )}
            </div>
            <div style={{ textAlign:'center', marginBottom:24 }}>
              <div style={{ fontSize:19, fontWeight:900, color:'#fff', marginBottom:8 }}>
                {isCapScanning ? '사진 스캔 중...' : isCapSuccess ? '촬영 완료' : '촬영 오류'}
              </div>
              <div style={{ fontSize:13, color:'#8da2c0', lineHeight:1.7 }}>
                {isCapScanning
                  ? <>이미지 품질 및 초점을 분석하고 있습니다.<br/><span style={{ color:'#0dd9c5', fontWeight:700 }}>{Math.round(scanProgress)}%</span> 완료</>
                  : isCapSuccess
                  ? <>이미지가 정상적으로 스캔되었습니다.<br/>AI 외상 분석을 시작할 수 있습니다.</>
                  : <>이미지를 인식하지 못했습니다.<br/>선명한 사진으로 다시 촬영해 주세요.</>
                }
              </div>
            </div>
            {isCapScanning && (
              <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,0.07)', overflow:'hidden', marginBottom:24 }}>
                <div style={{ height:'100%', width:`${scanProgress}%`, background:'linear-gradient(90deg,#0dd9c5,#4fc3f7)', borderRadius:2, transition:'width 0.1s' }}/>
              </div>
            )}
            {!isCapScanning && (
              <div style={{ display:'flex', gap:10 }}>
                {isCapSuccess ? (
                  <>
                    <button onClick={closeCaptureModal} style={{ flex:1, padding:'12px', borderRadius:12, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#8da2c0', fontSize:13, fontWeight:700, cursor:'pointer' }}>닫기</button>
                    <button onClick={closeCaptureModal} style={{ flex:2, padding:'12px', borderRadius:12, background:'linear-gradient(135deg,#26de81,#0dd9c5)', border:'none', color:'#050d1a', fontSize:13, fontWeight:900, cursor:'pointer' }}>AI 분석 시작</button>
                  </>
                ) : (
                  <>
                    <button onClick={closeCaptureModal} style={{ flex:1, padding:'12px', borderRadius:12, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#8da2c0', fontSize:13, fontWeight:700, cursor:'pointer' }}>취소</button>
                    <button onClick={retryCapture} style={{ flex:2, padding:'12px', borderRadius:12, background:'linear-gradient(135deg,#ff4d6d,#ff9f43)', border:'none', color:'#fff', fontSize:13, fontWeight:900, cursor:'pointer' }}>다시 촬영</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    <div style={{ display:'grid', gridTemplateColumns:'280px 1fr 260px', height:'calc(100vh - 44px)', overflow:'hidden', background:'#050d1a' }}>

      {/* ── 좌: 모드 선택 + 진단 목록 ── */}
      <div style={{ borderRight:'1.5px solid rgba(13,217,197,0.13)', background:'rgba(8,18,35,0.98)', padding:'18px 16px', overflowY:'auto', display:'flex', flexDirection:'column', gap:14 }}>
        {/* 모드 탭 */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <button onClick={()=>setMode('vital')} style={{ padding:'9px', borderRadius:10, border:`2px solid ${mode==='vital'?'#0dd9c5':'rgba(255,255,255,0.07)'}`, background:mode==='vital'?'rgba(13,217,197,0.1)':'transparent', color:mode==='vital'?'#0dd9c5':'#8da2c0', fontSize:11, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            <Brain size={13}/> 바이탈 분석
          </button>
          <button onClick={()=>setMode('trauma')} style={{ padding:'9px', borderRadius:10, border:`2px solid ${mode==='trauma'?'#ff9f43':'rgba(255,255,255,0.07)'}`, background:mode==='trauma'?'rgba(255,159,67,0.1)':'transparent', color:mode==='trauma'?'#ff9f43':'#8da2c0', fontSize:11, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            <Camera size={13}/> 외상 촬영
          </button>
        </div>

        {mode==='vital' && <>
          {/* 위험도 게이지 */}
          <RiskGauge score={RISK_SCORE}/>
          {/* 환자 요약 */}
          <div style={{ padding:'12px 14px', borderRadius:12, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize:9, color:'#4a6080', fontWeight:800, marginBottom:7, textTransform:'uppercase', letterSpacing:'0.5px' }}>분석 대상</div>
            <div style={{ fontSize:14, fontWeight:800, color:'#fff' }}>{patient?.name || '김태양'}</div>
            <div style={{ fontSize:11, color:'#8da2c0', marginTop:2 }}>{patient?.age}세 · {patient?.role} · {patient?.blood}형</div>
            <div style={{ fontSize:10, color:'#ff9f43', marginTop:5, fontWeight:600 }}>⚠ {patient?.chronic}</div>
          </div>
          {/* 진단 목록 */}
          <div style={{ fontSize:10, fontWeight:900, color:'#0dd9c5', textTransform:'uppercase', letterSpacing:'0.5px' }}>감별 진단</div>
          {DIAGNOSES.map((d,i)=>(
            <button key={i} onClick={()=>setActiveIdx(i)} style={{
              padding:'12px', borderRadius:13, textAlign:'left', cursor:'pointer', width:'100%',
              background:activeIdx===i?`${d.color}12`:'rgba(255,255,255,0.02)',
              border:`1.5px solid ${activeIdx===i?d.color:'rgba(255,255,255,0.05)'}`,
              transition:'all 0.2s', animation:`slideInLeft 0.28s ease ${i*0.08}s both`
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                <span style={{ fontSize:12, padding:'2px 7px', borderRadius:6, background:`${d.color}20`, color:d.color, fontWeight:900 }}>{d.confidence}%</span>
                <span style={{ fontSize:12, fontWeight:800, color:activeIdx===i?'#fff':'#8da2c0' }}>{d.title}</span>
              </div>
              <div style={{ fontSize:10, color:'#4a6080' }}>ICD-10: {d.icd}</div>
            </button>
          ))}
          <button onClick={rescan} style={{ padding:'8px', borderRadius:9, background:'rgba(13,217,197,0.07)', border:'1px solid rgba(13,217,197,0.2)', color:'#0dd9c5', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            <RotateCcw size={12}/> 재분석
          </button>
        </>}

        {mode==='trauma' && <>
          <div style={{ fontSize:10, fontWeight:900, color:'#ff9f43', textTransform:'uppercase', letterSpacing:'0.5px' }}>외상 부위 선택</div>
          {[['chest','흉부'],['head','두부'],['limb','사지'],['burn','화상']].map(([k,l])=>(
            <button key={k} onClick={()=>setTraumaArea(k)} style={{
              padding:'10px 13px', borderRadius:10, textAlign:'left', cursor:'pointer', width:'100%',
              background:traumaArea===k?'rgba(255,159,67,0.1)':'rgba(255,255,255,0.02)',
              border:`1.5px solid ${traumaArea===k?'#ff9f43':'rgba(255,255,255,0.06)'}`,
              color:traumaArea===k?'#ff9f43':'#8da2c0', fontSize:12, fontWeight:700
            }}>{l}</button>
          ))}
          {/* 이미지 업로드 */}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }}/>
          <button onClick={()=>fileRef.current.click()} style={{ padding:'12px', borderRadius:12, background:'rgba(79,195,247,0.08)', border:'2px dashed rgba(79,195,247,0.3)', color:'#4fc3f7', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
            <Upload size={14}/> 사진 업로드 / 촬영
          </button>
          {traumaImg && (
            <div style={{ position:'relative', borderRadius:12, overflow:'hidden', border:'1.5px solid rgba(79,195,247,0.3)' }}>
              <img src={traumaImg} alt="trauma" style={{ width:'100%', height:160, objectFit:'cover' }}/>
              <button onClick={()=>{setTraumaImg(null);setTraumaResult(null)}} style={{ position:'absolute', top:6, right:6, width:24, height:24, borderRadius:'50%', background:'rgba(0,0,0,0.6)', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={13}/></button>
            </div>
          )}
          {traumaImg && !traumaResult && (
            <button onClick={analyzeTrauma} disabled={traumaScanning} style={{ padding:'12px', borderRadius:12, background:traumaScanning?'rgba(255,159,67,0.1)':'linear-gradient(135deg,#ff9f43,#e8760a)', border:'none', color:traumaScanning?'#ff9f43':'#050d1a', fontSize:13, fontWeight:900, cursor:traumaScanning?'wait':'pointer' }}>
              {traumaScanning ? `분석 중... ${traumaProgress}%` : 'AI 외상 분석 시작'}
            </button>
          )}
          {traumaResult && (
            <div style={{ padding:'12px', borderRadius:12, background:`${traumaResult.color}0e`, border:`1.5px solid ${traumaResult.color}30` }}>
              <div style={{ fontSize:11, fontWeight:900, color:traumaResult.color, marginBottom:5 }}>{traumaResult.label}</div>
              <div style={{ fontSize:11, color:'#e8f0fe', lineHeight:1.6, marginBottom:8 }}>{traumaResult.desc}</div>
              <button onClick={()=>onNavigate('emergency')} style={{ width:'100%', padding:'8px', borderRadius:9, background:`${traumaResult.color}18`, border:`1px solid ${traumaResult.color}30`, color:traumaResult.color, fontSize:11, fontWeight:800, cursor:'pointer' }}>
                응급처치 가이드 보기 →
              </button>
            </div>
          )}
        </>}
      </div>

      {/* ── 중앙: 진단 상세 / 외상 결과 ── */}
      <div style={{ borderRight:'1.5px solid rgba(13,217,197,0.13)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {mode==='vital' && <>
          <div style={{ padding:'18px 24px', background:`linear-gradient(135deg,${diag.color}12,rgba(8,18,35,0.9))`, borderBottom:`1.5px solid ${diag.color}28`, flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <div style={{ width:40, height:40, borderRadius:11, background:`${diag.color}18`, border:`1.5px solid ${diag.color}40`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Zap size={19} color={diag.color}/>
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:900, color:'#fff' }}>{diag.title}</div>
                <div style={{ display:'flex', gap:7, marginTop:3 }}>
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:5, background:`${diag.color}22`, color:diag.color, fontWeight:800 }}>신뢰도 {diag.confidence}%</span>
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:5, background:'rgba(255,255,255,0.05)', color:'#8da2c0', fontWeight:600 }}>ICD-10: {diag.icd}</span>
                </div>
              </div>
            </div>
            <p style={{ fontSize:12, color:'#8da2c0', lineHeight:1.65 }}>{diag.desc}</p>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
            <div style={{ fontSize:11, fontWeight:900, color:diag.color, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>즉각 조치 사항</div>
            {diag.actions.map((a,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px', borderRadius:12, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', marginBottom:8, animation:`slideInLeft 0.3s ease ${i*0.07}s both` }}>
                <div style={{ width:24, height:24, borderRadius:7, flexShrink:0, background:`${diag.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:diag.color }}>{i+1}</div>
                <span style={{ fontSize:13, color:'#e8f0fe', lineHeight:1.6 }}>{a}</span>
              </div>
            ))}
            <div style={{ marginTop:20, fontSize:11, fontWeight:900, color:'#0dd9c5', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>바이탈 추이</div>
            <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:14, padding:'14px' }}>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={TREND_DATA}>
                  <XAxis dataKey="t" tick={{ fill:'#4a6080', fontSize:10 }} axisLine={false} tickLine={false}/>
                  <YAxis yAxisId="hr" domain={[60,120]} tick={{ fill:'#4a6080', fontSize:10 }} axisLine={false} tickLine={false} width={28}/>
                  <YAxis yAxisId="bp" orientation="right" domain={[120,180]} tick={{ fill:'#4a6080', fontSize:10 }} axisLine={false} tickLine={false} width={32}/>
                  <Tooltip contentStyle={{ background:'#0a1628', border:'1px solid rgba(13,217,197,0.2)', borderRadius:8, fontSize:11 }} labelStyle={{ color:'#8da2c0' }}/>
                  <Line yAxisId="hr" type="monotone" dataKey="hr" stroke="#ff4d6d" strokeWidth={2.5} dot={{ r:3, fill:'#ff4d6d' }} name="심박수"/>
                  <Line yAxisId="bp" type="monotone" dataKey="bp" stroke="#ff9f43" strokeWidth={2.5} dot={{ r:3, fill:'#ff9f43' }} name="수축기혈압"/>
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', gap:16, justifyContent:'center', marginTop:6 }}>
                {[['#ff4d6d','심박수 (bpm)'],['#ff9f43','수축기혈압 (mmHg)']].map(([c,l])=>(
                  <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:10, height:3, borderRadius:2, background:c }}/>
                    <span style={{ fontSize:10, color:'#4a6080' }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={()=>onNavigate('emergency')} style={{ marginTop:16, width:'100%', padding:'11px', borderRadius:11, background:`${diag.color}12`, border:`1.5px solid ${diag.color}30`, color:diag.color, fontSize:12, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
              <ChevronRight size={14}/> 응급처치 가이드로 이동
            </button>
          </div>
        </>}

        {mode==='trauma' && (
          <div style={{ flex:1, overflowY:'auto', padding:'24px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent: traumaResult?'flex-start':'center' }}>
            {!traumaImg && (
              <div style={{ textAlign:'center', color:'#4a6080' }}>
                <Camera size={48} style={{ marginBottom:14, opacity:0.4 }}/>
                <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>외상 사진을 업로드하세요</div>
                <div style={{ fontSize:12, lineHeight:1.6 }}>부위 선택 후 사진을 업로드하면<br/>AI가 즉시 외상을 분석합니다.</div>
              </div>
            )}
            {traumaImg && !traumaResult && !traumaScanning && (
              <div style={{ textAlign:'center' }}>
                <img src={traumaImg} alt="" style={{ maxWidth:'100%', maxHeight:300, borderRadius:14, border:'1.5px solid rgba(79,195,247,0.3)', objectFit:'cover' }}/>
                <div style={{ marginTop:12, fontSize:13, color:'#8da2c0' }}>좌측에서 AI 분석을 시작하세요</div>
              </div>
            )}
            {traumaScanning && (
              <div style={{ textAlign:'center' }}>
                <div style={{ width:100, height:100, borderRadius:'50%', background:`conic-gradient(#ff9f43 ${traumaProgress*3.6}deg, rgba(255,159,67,0.1) 0deg)`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                  <div style={{ width:76, height:76, borderRadius:'50%', background:'#050d1a', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Brain size={28} color="#ff9f43" style={{ animation:'stepPulse 0.8s infinite' }}/>
                  </div>
                </div>
                <div style={{ fontSize:15, fontWeight:800, color:'#ff9f43' }}>외상 분석 중... {traumaProgress}%</div>
              </div>
            )}
            {traumaResult && (
              <div style={{ width:'100%' }}>
                <div style={{ padding:'16px', borderRadius:15, background:`${traumaResult.color}0e`, border:`1.5px solid ${traumaResult.color}30`, marginBottom:16 }}>
                  <div style={{ fontSize:15, fontWeight:900, color:traumaResult.color, marginBottom:6 }}>{traumaResult.label} — AI 분석 완료</div>
                  <p style={{ fontSize:13, color:'#e8f0fe', lineHeight:1.65 }}>{traumaResult.desc}</p>
                </div>
                <div style={{ fontSize:11, fontWeight:900, color:'#8da2c0', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>권고 처치</div>
                {traumaResult.actions.map((a,i)=>(
                  <div key={i} style={{ display:'flex', gap:10, padding:'10px 13px', borderRadius:10, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', marginBottom:7 }}>
                    <div style={{ width:22, height:22, borderRadius:6, background:`${traumaResult.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:traumaResult.color, flexShrink:0 }}>{i+1}</div>
                    <span style={{ fontSize:12, color:'#e8f0fe', lineHeight:1.6 }}>{a}</span>
                  </div>
                ))}
                <button onClick={()=>onNavigate('emergency')} style={{ marginTop:12, width:'100%', padding:'12px', borderRadius:11, background:`${traumaResult.color}14`, border:`1.5px solid ${traumaResult.color}30`, color:traumaResult.color, fontSize:13, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                  <ChevronRight size={15}/> 응급처치 가이드로 이동
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 우: 바이탈 분석 + 레이더 ── */}
      <div style={{ padding:'18px 16px', overflowY:'auto', background:'rgba(6,14,28,0.98)', display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ fontSize:10, fontWeight:900, color:'#0dd9c5', textTransform:'uppercase', letterSpacing:'0.6px' }}>바이탈 분석</div>
        {VITAL_DATA.map((v,i)=>(
          <div key={i} style={{ padding:'11px 13px', borderRadius:12, background:v.warn?`${v.color}08`:'rgba(255,255,255,0.02)', border:`1px solid ${v.warn?v.color+'25':'rgba(255,255,255,0.05)'}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:7, background:`${v.color}18`, display:'flex', alignItems:'center', justifyContent:'center', color:v.color }}>{v.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10, color:'#4a6080', fontWeight:700 }}>{v.label}</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
                  <span style={{ fontSize:18, fontWeight:900, color:v.color }}>{v.value}</span>
                  <span style={{ fontSize:10, color:'#4a6080' }}>{v.unit}</span>
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                {v.trend==='up' ? <TrendingUp size={14} color="#ff4d6d"/> : <TrendingDown size={14} color="#ff4d6d"/>}
                <div style={{ fontSize:9, color:'#4a6080', marginTop:1 }}>정상 {v.normal}</div>
              </div>
            </div>
          </div>
        ))}

        {/* 레이더 */}
        <div style={{ padding:'14px', borderRadius:14, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#8da2c0', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.5px' }}>신체기능 종합 지수</div>
          <ResponsiveContainer width="100%" height={160}>
            <RadarChart data={RADAR_DATA}>
              <PolarGrid stroke="rgba(13,217,197,0.1)"/>
              <PolarAngleAxis dataKey="sub" tick={{ fill:'#4a6080', fontSize:10 }}/>
              <Radar dataKey="val" stroke="#ff4d6d" fill="#ff4d6d" fillOpacity={0.13} strokeWidth={2}/>
            </RadarChart>
          </ResponsiveContainer>
          <div style={{ textAlign:'center', fontSize:9, color:'#4a6080' }}>낮을수록 해당 기능 위험도 높음</div>
        </div>

        {/* AI 소견 */}
        <div style={{ padding:'13px', borderRadius:13, background:'rgba(13,217,197,0.05)', border:'1px solid rgba(13,217,197,0.18)' }}>
          <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:8 }}>
            <Shield size={13} color="#0dd9c5"/>
            <span style={{ fontSize:10, fontWeight:900, color:'#0dd9c5', textTransform:'uppercase', letterSpacing:'0.5px' }}>AI 종합 소견</span>
          </div>
          <p style={{ fontSize:12, color:'#e8f0fe', lineHeight:1.7 }}>
            <span style={{ color:'#ff4d6d', fontWeight:800 }}>위험 수준 (72/100)</span>. 급성 심근경색 의심 징후 복수 항목 감지. 즉각적 원격 의료진 연결과 CPR 준비 강력 권고.
          </p>
        </div>
      </div>
    </div>
    </>
  )
}

function RiskGauge({ score }) {
  const color = score>=70?'#ff4d6d':score>=40?'#ff9f43':'#26de81'
  return (
    <div style={{ padding:'18px', borderRadius:16, textAlign:'center', background:`${color}0e`, border:`1.5px solid ${color}28` }}>
      <div style={{ position:'relative', width:130, height:76, margin:'0 auto 10px' }}>
        {/* CSS-only half gauge (no SVG) */}
        <div style={{
          width:130, height:65, borderRadius:'65px 65px 0 0',
          background:`conic-gradient(from 180deg, ${color} 0deg, ${color} ${score*1.8}deg, rgba(255,255,255,0.07) ${score*1.8}deg)`,
          overflow:'hidden', position:'relative',
        }}>
          <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:86, height:43, borderRadius:'43px 43px 0 0', background:'#050d1a' }}/>
        </div>
        <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', textAlign:'center' }}>
          <div style={{ fontSize:22, fontWeight:900, color, lineHeight:1 }}>{score}</div>
          <div style={{ fontSize:9, color:'#4a6080' }}>/ 100</div>
        </div>
      </div>
      <div style={{ fontSize:12, fontWeight:900, color }}>{score>=70?'위험 — 즉각 조치 필요':score>=40?'주의 상태':'양호'}</div>
      <div style={{ fontSize:10, color:'#4a6080', marginTop:2 }}>종합 위험도 점수</div>
    </div>
  )
}


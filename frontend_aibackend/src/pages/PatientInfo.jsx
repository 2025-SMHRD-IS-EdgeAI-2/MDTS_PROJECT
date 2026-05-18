import { useState, useEffect } from 'react'
import {
  User, AlertCircle, Pill, FileText, Heart, Droplets, Activity, Edit3, Check,
  MapPin, Phone, Clock, History, Satellite, Upload, Radio, RotateCcw,
  CheckCircle2, ChevronRight, Plus, Save, X,
} from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { resolveAvatarUrl } from '../utils/avatar'

/* ── 진료 이력 데이터 ── */
const HISTORY = [
  { date:'2026-04-07', type:'응급',  label:'흉통·호흡곤란',    detail:'아스피린 알레르기 확인 → 클로피도그렐 75mg 투여, 원격진료 연결',   doctor:'부산원격의료센터 최원장', color:'#ff4d6d' },
  { date:'2026-04-01', type:'정기',  label:'월간 정기검진',     detail:'혈압 145/90 — 고혈압 약 용량 조정 (암로디핀 5mg→10mg)',           doctor:'선내 의무관', color:'#ff9f43' },
  { date:'2026-03-18', type:'처치',  label:'손 찰과상 드레싱',  detail:'멸균 드레싱 3회 교체. 완치 확인.',                                  doctor:'선내 의무관', color:'#0dd9c5' },
  { date:'2026-03-05', type:'정기',  label:'월간 정기검진',     detail:'전반적 양호. 혈압약 지속 복용 권고.',                               doctor:'선내 의무관', color:'#ff9f43' },
  { date:'2026-02-14', type:'응급',  label:'심계항진 증상',     detail:'심전도 정상. 30분 안정 후 회복.',                                   doctor:'부산원격의료센터 최원장', color:'#ff4d6d' },
  { date:'2026-01-10', type:'입선',  label:'승선 전 건강검진',  detail:'혈압 고위험군 판정. 지속 모니터링 지시.',                           doctor:'부산 해양병원', color:'#4fc3f7' },
  { date:'2025-12-20', type:'정기',  label:'분기 건강검진',     detail:'체중 증가 확인. 식단 조절 권고.',                                   doctor:'선내 의무관', color:'#ff9f43' },
  { date:'2025-11-05', type:'처치',  label:'발목 염좌 처치',    detail:'탄력 붕대 처치, 3일 안정 지시.',                                    doctor:'선내 의무관', color:'#0dd9c5' },
]

const TX_INIT = [
  { time:'09:31', msg:'바이탈 패킷 #47', ok:true  },
  { time:'09:20', msg:'심전도 스냅샷',   ok:true  },
  { time:'09:10', msg:'환자 차트 업데이트', ok:false },
  { time:'08:55', msg:'바이탈 패킷 #46', ok:true  },
]

function useVitals(base=84) {
  const [hr,  setHr]   = useState(base)
  const [hist,setHist] = useState(Array.from({length:20},(_,i)=>({t:i,v:base})))
  useEffect(()=>{
    const id=setInterval(()=>{
      const n=Math.max(60,Math.min(130,hr+Math.round((Math.random()-.5)*3)))
      setHr(n); setHist(h=>[...h.slice(1),{t:Date.now(),v:n}])
    },2000); return ()=>clearInterval(id)
  },[hr])
  return {hr,hist}
}

/* ── 메모 추가 모달 ── */
function NoteModal({ onSave, onClose }) {
  const [text,setText]=useState('')
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200 }}>
      <div style={{ background:'#0a1628',border:'1.5px solid rgba(13,217,197,0.3)',borderRadius:16,padding:'22px 24px',width:400,animation:'fadeInUp 0.2s ease both' }}>
        <div style={{ fontSize:14,fontWeight:900,color:'#fff',marginBottom:14 }}>진료 메모 추가</div>
        <textarea value={text} onChange={e=>setText(e.target.value)} rows={4}
          placeholder="처치 내용, 메모 등 입력..."
          style={{ width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(13,217,197,0.2)',borderRadius:9,padding:'10px 12px',color:'#fff',fontSize:13,outline:'none',resize:'vertical' }}
        />
        <div style={{ display:'flex',gap:9,marginTop:12 }}>
          <button onClick={()=>onSave(text)} style={{ flex:1,padding:'10px',borderRadius:9,background:'linear-gradient(135deg,#0dd9c5,#09b8a6)',border:'none',color:'#050d1a',fontSize:13,fontWeight:800,cursor:'pointer' }}>저장</button>
          <button onClick={onClose} style={{ padding:'10px 16px',borderRadius:9,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',color:'#8da2c0',fontSize:13,cursor:'pointer' }}>취소</button>
        </div>
      </div>
    </div>
  )
}

export default function PatientInfo({ patient }) {
  const isPark = patient.id === 'S26-003'
  const {hr,hist} = useVitals(patient.hr || (isPark ? 84 : 0))
  

  const [bp,  setBp]  = useState(patient.bp   || (isPark ? '158/95' : '-'))
  const [bt,  setBt]  = useState(String(patient.temp || (isPark ? '37.6' : '-')))
  const [spo2]        = useState(patient.spo2 || (isPark ? 94 : '-'))
  const [editBp, setEditBp] = useState(false)
  const [editBt, setEditBt] = useState(false)

  const [histFilter, setHistFilter] = useState('전체')
  const [histItems,  setHistItems]  = useState(HISTORY)
  const [showNote,   setShowNote]   = useState(false)

  const [txLog,   setTxLog]   = useState(TX_INIT)
  const [txStatus,setTxStatus]= useState('idle')

  const filteredH = histFilter==='전체' ? histItems : histItems.filter(h=>h.type===histFilter)

  const sendVitals = () => {
    setTxStatus('sending')
    setTimeout(()=>{
      setTxStatus('done')
      const now=new Date()
      const ts=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      setTxLog(l=>[{time:ts,msg:`바이탈 패킷 #${48+l.length}`,ok:true},...l.slice(0,5)])
      setTimeout(()=>setTxStatus('idle'),2500)
    },2000)
  }

  const [chartTxStatus, setChartTxStatus] = useState('idle')
  const sendChart = () => {
    setChartTxStatus('sending')
    setTimeout(()=>{
      setChartTxStatus('done')
      const now=new Date()
      const ts=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      setTxLog(l=>[{time:ts,msg:`환자 차트 전송 완료 (${patient?.name||'환자'})`,ok:true},...l.slice(0,5)])
      setTimeout(()=>setChartTxStatus('idle'),2500)
    },2200)
  }

  const [remoteTxStatus, setRemoteTxStatus] = useState('idle')
  const requestRemote = () => {
    setRemoteTxStatus('sending')
    setTimeout(()=>{
      setRemoteTxStatus('done')
      const now=new Date()
      const ts=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      setTxLog(l=>[{time:ts,msg:`원격 진료 요청 전송 — 부산 원격의료센터`,ok:true},...l.slice(0,5)])
      setTimeout(()=>setRemoteTxStatus('idle'),2500)
    },1800)
  }

  const [emergencyTxStatus, setEmergencyTxStatus] = useState('idle')
  const sendEmergency = () => {
    setEmergencyTxStatus('sending')
    setTimeout(()=>{
      setEmergencyTxStatus('done')
      const now=new Date()
      const ts=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      setTxLog(l=>[{time:ts,msg:`비상 연락망 발송 → ${patient?.emergencyName||'보호자'}`,ok:true},...l.slice(0,5)])
      setTimeout(()=>setEmergencyTxStatus('idle'),2500)
    },1500)
  }

  const addNote = (text) => {
    if (!text.trim()) return
    const now=new Date()
    const dateStr=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
    setHistItems(h=>[{date:dateStr,type:'처치',label:'진료 메모',detail:text,doctor:'선내 의무관',color:'#0dd9c5'},...h])
    setShowNote(false)
  }

  return (
    <div style={{
      display:'grid', gridTemplateColumns:'300px 1fr 280px',
      height:'calc(100vh - 44px)', overflow:'hidden', background:'#050d1a',
    }}>
      {showNote && <NoteModal onSave={addNote} onClose={()=>setShowNote(false)}/>}

      {/* ══ 좌: 환자 정보 ══ */}
      <div style={{ borderRight:'1.5px solid rgba(13,217,197,0.13)', background:'rgba(7,15,30,0.98)', overflowY:'auto', padding:'16px 14px', display:'flex', flexDirection:'column', gap:10 }}>
        <SL icon={<User size={13} color="#0dd9c5"/>}>환자 정보</SL>

        {/* 프로필 카드 */}
        <div style={{ background:'linear-gradient(135deg,rgba(13,217,197,0.11),rgba(13,217,197,0.02))', border:'1.5px solid rgba(13,217,197,0.26)', borderRadius:16, padding:'16px' }}>
          <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:13 }}>
            <div style={{ width:56, height:56, borderRadius:13, border:'2px solid #0dd9c5', overflow:'hidden', boxShadow:'0 0 14px rgba(13,217,197,0.2)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#0a1628' }}>
              <img
                src={resolveAvatarUrl(patient.avatar)}
                onError={(event) => { event.currentTarget.src = resolveAvatarUrl(null) }}
                alt=""
                style={{ width:'100%', height:'100%', objectFit:'cover' }}
              />
            </div>
            <div>
              <div style={{ fontSize:17, fontWeight:900, color:'#fff' }}>{patient.name}</div>
              <div style={{ fontSize:11, color:'#8da2c0', marginTop:2 }}>{patient.role} · {patient.age}세 · {patient.blood}형</div>
              <div style={{ fontSize:10, color:'#0dd9c5', marginTop:2, fontWeight:600 }}>{patient.id}</div>
            </div>
          </div>

          {/* 기본 정보 그리드 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7, borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:11 }}>
            <IR label="생년월일"  value={patient.dob}/>
            <IR label="성별"      value={patient.gender||'남'}/>
            <IR label="신장"      value={`${patient.height}cm`}/>
            <IR label="체중"      value={`${patient.weight}kg`}/>
            <IR label="혈액형"    value={`${patient.blood}형`}/>
            <IR label="승선일"    value={patient.embark}/>
            <div style={{ gridColumn:'span 2' }}>
              <IR label="연락처"  value={patient.contact} full/>
            </div>
            <div style={{ gridColumn:'span 2' }}>
              <IR label="비상연락" value={`${patient.emergencyContact?.name} (${patient.emergencyContact?.phone})`} full/>
            </div>
            <div style={{ gridColumn:'span 2', padding:'8px 10px', background:'rgba(255,77,109,0.08)', borderRadius:8, border:'1px solid rgba(255,77,109,0.16)' }}>
              <div style={{ fontSize:9, color:'#ff4d6d', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 }}>현재 위치</div>
              <div style={{ fontSize:11, color:'#fff', fontWeight:600, display:'flex', gap:4, alignItems:'center' }}>
                <MapPin size={10} color="#ff4d6d"/>{patient.location}
              </div>
            </div>
          </div>
        </div>

        {/* 의료 정보 — 전부 펼침 */}
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          <MC icon={<AlertCircle size={12} color="#ff9f43"/>} label="보유 질환"  value={patient.chronic}   color="#ff9f43"/>
          <MC icon={<AlertCircle size={12} color="#ff4d6d"/>} label="알레르기"  value={patient.allergies}  color="#ff4d6d"/>
          <MC icon={<Pill        size={12} color="#0dd9c5"/>} label="최근 투약"  value={patient.lastMed}    color="#0dd9c5"/>
          <MC icon={<FileText   size={12} color="#4fc3f7"/>} label="특이사항"   value={patient.note}       color="#4fc3f7"/>
        </div>

        {/* 바이탈 */}
        <SL icon={<Activity size={13} color="#0dd9c5"/>}>주요 바이탈</SL>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <VL label="심박수" value={hr}   unit="bpm"  color="#ff4d6d" icon={<Heart size={10}/>}    sparkData={hist}/>
          <VL label="산소포화도" value={spo2} unit="%" color="#00d2ff" icon={<Droplets size={10}/>} warn={spo2<95}/>
          <VE label="혈압"  value={bp}   unit="mmHg"  color="#a55eea" isEditing={editBp} setEditing={setEditBp} onSave={setBp}/>
          <VE label="체온"  value={bt}   unit="°C"    color="#ff9f43" isEditing={editBt} setEditing={setEditBt} onSave={setBt}/>
        </div>

        {/* 의사 지시 */}
        <div style={{ padding:'11px 13px', borderRadius:12, background:'rgba(13,217,197,0.05)', border:'1px solid rgba(13,217,197,0.16)' }}>
          <div style={{ fontSize:9, color:'#0dd9c5', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>최신 의사 지시사항</div>
          <div style={{ fontSize:12, color:'#e8f0fe', lineHeight:1.6 }}>"심근경색 프로토콜 유지, 15분 간격 혈압·심전도 재전송 요망"</div>
          <div style={{ fontSize:10, color:'#4a6080', marginTop:4 }}>— 부산원격의료센터 최원장 · 09:25</div>
        </div>
      </div>

      {/* ══ 중앙: 이력 조회 ══ */}
      <div style={{ borderRight:'1.5px solid rgba(13,217,197,0.13)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* 헤더 */}
        <div style={{ padding:'11px 18px', background:'rgba(7,15,30,0.96)', borderBottom:'1.5px solid rgba(13,217,197,0.11)', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <History size={14} color="#0dd9c5"/>
          <span style={{ fontSize:13, fontWeight:900, color:'#fff', letterSpacing:'0.4px' }}>진료 이력 조회</span>
          <div style={{ marginLeft:'auto', display:'flex', gap:5, flexWrap:'wrap' }}>
            {['전체','응급','정기','처치','입선'].map(f=>(
              <button key={f} onClick={()=>setHistFilter(f)} style={{
                padding:'3px 10px', borderRadius:6, fontSize:10, fontWeight:700, cursor:'pointer',
                border:`1.5px solid ${histFilter===f?'#0dd9c5':'rgba(255,255,255,0.07)'}`,
                background:histFilter===f?'rgba(13,217,197,0.12)':'transparent',
                color:histFilter===f?'#0dd9c5':'#8da2c0'
              }}>{f}</button>
            ))}
          </div>
          <button onClick={()=>setShowNote(true)} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:7, background:'rgba(13,217,197,0.1)', border:'1px solid rgba(13,217,197,0.25)', color:'#0dd9c5', fontSize:10, fontWeight:800, cursor:'pointer', flexShrink:0 }}>
            <Plus size={11}/> 메모 추가
          </button>
        </div>

        {/* 요약 통계 */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, padding:'12px 18px', borderBottom:'1px solid rgba(255,255,255,0.04)', flexShrink:0 }}>
          {[
            ['총 진료', `${histItems.length}회`, '2026년 기준', '#0dd9c5'],
            ['응급 처치', `${histItems.filter(h=>h.type==='응급').length}회`, '전체 이력',   '#ff4d6d'],
            ['최근 검진', '7일 전',               '2026-04-01',              '#ff9f43'],
            ['담당 의사', '2인',                  '선내+원격',                '#a55eea'],
          ].map(([l,v,s,c])=>(
            <div key={l} style={{ padding:'9px 11px', borderRadius:10, background:`${c}0c`, border:`1px solid ${c}1e`, textAlign:'center' }}>
              <div style={{ fontSize:9, color:'#8da2c0', fontWeight:600, marginBottom:3 }}>{l}</div>
              <div style={{ fontSize:15, fontWeight:900, color:c }}>{v}</div>
              <div style={{ fontSize:9, color:'#4a6080', marginTop:1 }}>{s}</div>
            </div>
          ))}
        </div>

        {/* 타임라인 */}
        <div style={{ flex:1, overflowY:'auto', padding:'14px 18px' }}>
          <div style={{ position:'relative', marginLeft:8 }}>
            <div style={{ position:'absolute', left:44, top:0, bottom:0, width:2, background:'rgba(13,217,197,0.07)' }}/>
            {filteredH.map((h,i)=>(
              <div key={i} style={{ display:'flex', gap:14, marginBottom:16, animation:`slideInLeft 0.25s ease ${i*0.04}s both` }}>
                {/* 날짜 */}
                <div style={{ minWidth:42, textAlign:'right', paddingTop:12, fontSize:9, color:'#4a6080', fontWeight:600, lineHeight:1.2 }}>
                  {h.date.slice(5)}
                </div>
                {/* 도트 */}
                <div style={{ width:12, height:12, borderRadius:'50%', background:h.color, flexShrink:0, marginTop:14, border:'3px solid #050d1a', boxShadow:`0 0 6px ${h.color}55`, zIndex:1 }}/>
                {/* 카드 */}
                <div style={{ flex:1, background:'rgba(255,255,255,0.025)', border:'1px solid rgba(13,217,197,0.07)', borderRadius:11, padding:'10px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
                    <span style={{ fontSize:9, padding:'2px 6px', borderRadius:4, background:`${h.color}1c`, color:h.color, fontWeight:800 }}>{h.type}</span>
                    <span style={{ fontSize:12, fontWeight:800, color:'#fff' }}>{h.label}</span>
                    <span style={{ marginLeft:'auto', fontSize:9, color:'#4a6080' }}>{h.date}</span>
                  </div>
                  <div style={{ fontSize:11, color:'#8da2c0', lineHeight:1.6 }}>{h.detail}</div>
                  <div style={{ marginTop:4, fontSize:9, color:'#4a6080' }}>담당: {h.doctor}</div>
                </div>
              </div>
            ))}
            {filteredH.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px 0', color:'#4a6080', fontSize:13 }}>해당 유형의 이력이 없습니다.</div>
            )}
          </div>
        </div>
      </div>

      {/* ══ 우: 데이터 전송 ══ */}
      <div style={{ background:'rgba(6,12,26,0.98)', overflowY:'auto', padding:'16px 14px', display:'flex', flexDirection:'column', gap:12 }}>
        <SL icon={<Satellite size={13} color="#0dd9c5"/>}>데이터 전송</SL>

        {/* 위성 연결 상태 */}
        <div style={{ padding:'13px', borderRadius:13, background:'linear-gradient(135deg,rgba(13,217,197,0.1),rgba(13,217,197,0.02))', border:'1.5px solid rgba(13,217,197,0.24)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:10 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:'rgba(13,217,197,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Satellite size={16} color="#0dd9c5"/>
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:800, color:'#0dd9c5' }}>위성통신 연결됨</div>
              <div style={{ fontSize:9, color:'#8da2c0' }}>VSAT · 신호강도 87%</div>
            </div>
            <div style={{ marginLeft:'auto', width:8, height:8, borderRadius:'50%', background:'#26de81', animation:'pulse-dot 1.5s infinite' }}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
            {[['지연','340ms'],['대역폭','2.4Mbps'],['수신센터','부산 해사'],['마지막 동기','09:31']].map(([l,v])=>(
              <div key={l} style={{ padding:'5px 7px', borderRadius:6, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize:8, color:'#4a6080', fontWeight:700 }}>{l}</div>
                <div style={{ fontSize:11, fontWeight:700, color:'#e8f0fe' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 전송 버튼 */}
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          <TxB icon={<Activity size={14}/>} label="바이탈 즉시 전송"   sub={`HR ${hr}bpm · BP ${bp} · Temp ${bt}°C`}  color="#0dd9c5" status={txStatus} onClick={sendVitals}/>
          <TxB icon={<FileText size={14}/>} label="환자 차트 전송"     sub="최신 진료기록 및 처방 포함"                  color="#4fc3f7" status={chartTxStatus}   onClick={sendChart}/>
          <TxB icon={<Radio    size={14}/>} label="원격 진료 요청"     sub="부산 원격의료센터 영상 연결"                  color="#a55eea" status={remoteTxStatus}  onClick={requestRemote}/>
          <TxB icon={<Phone    size={14}/>} label="비상 연락망 발송"   sub={`${patient.emergency || '비상연락처'}`}     color="#ff9f43" status={emergencyTxStatus} onClick={sendEmergency}/>
        </div>

        {/* 전송 로그 */}
        <SL icon={<Clock size={13} color="#0dd9c5"/>}>전송 로그</SL>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {txLog.map((l,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:9, background:'rgba(255,255,255,0.02)', border:`1px solid ${l.ok?'rgba(38,222,129,0.1)':'rgba(255,159,67,0.15)'}` }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:l.ok?'#26de81':'#ff9f43', flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#e8f0fe' }}>{l.msg}</div>
                <div style={{ fontSize:9, color:'#4a6080' }}>{l.time}</div>
              </div>
              {l.ok ? <CheckCircle2 size={12} color="#26de81"/> : <RotateCcw size={12} color="#ff9f43"/>}
            </div>
          ))}
        </div>

        {/* 패킷 현황 */}
        <SL icon={<Upload size={13} color="#0dd9c5"/>}>금일 전송 현황</SL>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {[['바이탈 데이터',47,50,'#0dd9c5'],['영상/이미지',12,20,'#4fc3f7'],['차트 문서',8,8,'#26de81'],['경보 알림',3,3,'#ff9f43']].map(([l,s,t,c])=>(
            <div key={l} style={{ padding:'8px 10px', borderRadius:9, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:11, color:'#8da2c0', fontWeight:600 }}>{l}</span>
                <span style={{ fontSize:11, color:c, fontWeight:800 }}>{s}/{t}</span>
              </div>
              <div style={{ height:3, borderRadius:2, background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${Math.round(s/t*100)}%`, borderRadius:2, background:c, transition:'width 0.5s' }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── 서브 컴포넌트 ── */
function SL({ icon, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, fontWeight:900, color:'#0dd9c5', marginBottom:0, textTransform:'uppercase', letterSpacing:'0.7px' }}>
      {icon}{children}
    </div>
  )
}
function IR({ label, value }) {
  return (
    <div>
      <div style={{ fontSize:8, color:'rgba(255,255,255,0.3)', marginBottom:1, textTransform:'uppercase', letterSpacing:'0.4px' }}>{label}</div>
      <div style={{ fontSize:11, color:'#fff', fontWeight:600 }}>{value||'—'}</div>
    </div>
  )
}
function MC({ icon, label, value, color }) {
  return (
    <div style={{ padding:'9px 11px', borderRadius:10, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.04)', display:'flex', alignItems:'center', gap:9 }}>
      <div style={{ width:27, height:27, borderRadius:7, background:`${color}14`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:8, color:'#4a6080', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.4px' }}>{label}</div>
        <div style={{ fontSize:11, fontWeight:700, color:'#fff' }}>{value||'없음'}</div>
      </div>
    </div>
  )
}
function VL({ label, value, unit, color, icon, sparkData, warn }) {
  return (
    <div style={{ padding:'10px 8px', borderRadius:11, background:warn?`${color}0c`:'rgba(255,255,255,0.02)', border:`1px solid ${warn?color+'28':'rgba(255,255,255,0.04)'}`, textAlign:'center', position:'relative' }}>
      <div style={{ position:'absolute', top:6, right:6, width:5, height:5, borderRadius:'50%', background:color, animation:'pulse-dot 1.2s infinite' }}/>
      <div style={{ fontSize:9, color:'#8da2c0', fontWeight:700, marginBottom:2, display:'flex', alignItems:'center', justifyContent:'center', gap:2 }}>{icon}{label}</div>
      <div style={{ fontSize:20, fontWeight:900, color }}>{value}</div>
      <div style={{ fontSize:8, color:'#4a6080' }}>{unit}</div>
      {sparkData && <div style={{ height:20, marginTop:2 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={sparkData}><Area type="monotone" dataKey="v" stroke={color} fill={`${color}16`} strokeWidth={1.5} dot={false}/></AreaChart></ResponsiveContainer></div>}
    </div>
  )
}
function VE({ label, value, unit, color, isEditing, setEditing, onSave }) {
  const [tmp,setTmp]=useState(value)
  return (
    <div onClick={()=>!isEditing&&setEditing(true)} style={{ padding:'10px 8px', borderRadius:11, background:'rgba(255,255,255,0.025)', border:`1px solid ${isEditing?'#0dd9c5':'rgba(255,255,255,0.06)'}`, textAlign:'center', cursor:'pointer', position:'relative' }}>
      <div style={{ position:'absolute', top:6, right:6 }}>{isEditing?<Check size={10} color="#0dd9c5"/>:<Edit3 size={9} color="#4a6080"/>}</div>
      <div style={{ fontSize:9, color:'#8da2c0', fontWeight:700, marginBottom:2 }}>{label}</div>
      {isEditing ? (
        <input autoFocus value={tmp} onChange={e=>setTmp(e.target.value)} onBlur={()=>{onSave(tmp);setEditing(false)}} onKeyDown={e=>e.key==='Enter'&&(onSave(tmp),setEditing(false))} style={{ width:'78%', background:'none', border:'none', borderBottom:'2px solid #0dd9c5', color:'#fff', fontSize:16, fontWeight:900, textAlign:'center', outline:'none' }}/>
      ) : (
        <div style={{ fontSize:20, fontWeight:900, color }}>{value}</div>
      )}
      <div style={{ fontSize:8, color:'#4a6080' }}>{unit}</div>
    </div>
  )
}
function TxB({ icon, label, sub, color, status, onClick }) {
  const busy=status==='sending', done=status==='done'
  return (
    <button onClick={onClick} disabled={busy} style={{ padding:'10px 12px', borderRadius:11, background:done?'rgba(38,222,129,0.07)':`${color}0d`, border:`1.5px solid ${done?'#26de81':color}2e`, cursor:busy?'wait':'pointer', display:'flex', alignItems:'center', gap:9, width:'100%', opacity:busy?0.7:1, textAlign:'left', transition:'all 0.25s' }}>
      <div style={{ width:30, height:30, borderRadius:8, background:done?'rgba(38,222,129,0.16)':`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', color:done?'#26de81':color, animation:busy?'spin 1s linear infinite':'none' }}>
        {done?<CheckCircle2 size={14}/>:busy?<RotateCcw size={14}/>:icon}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:11, fontWeight:800, color:done?'#26de81':'#e8f0fe' }}>{busy?'전송 중...':done?'전송 완료!':label}</div>
        <div style={{ fontSize:9, color:'#4a6080', marginTop:1 }}>{sub}</div>
      </div>
      {!busy&&!done&&<ChevronRight size={12} color="#4a6080"/>}
    </button>
  )
}


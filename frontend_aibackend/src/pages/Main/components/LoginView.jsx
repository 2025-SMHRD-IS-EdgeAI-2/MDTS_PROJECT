import { useState } from 'react'
import { Database, Settings, Ship } from 'lucide-react'
import { LoginInput } from '../../../components/ui/index.jsx'
import MdtsLogo from '../../../components/MdtsLogo.jsx'

// 레이더 중심 (우측, 폼과 겹치지 않음)
const RX = 1200, RY = 460
// 30% 스케일 업
const RS = 1.3

export default function LoginView({ onLogin, loginData, setLoginData }) {
  const [focusedField, setFocusedField] = useState(null)

  return (
    <div
      style={{ height:'100vh', display:'flex', flexDirection:'column', color:'#fff', fontFamily:'Pretendard', overflow:'hidden', position:'relative', cursor:'default' }}
    >
      {/* ══ 다크 배경 ══ */}
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 100% 90% at 82% 52%, #041c2e 0%, #020e1c 55%, #010810 100%)', pointerEvents:'none' }}/>

      {/* ══ SVG — 그리드 + 레이더 + 선박 ══ */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}
           viewBox="0 0 1440 860" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="glow2"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="shipGlow"><feGaussianBlur stdDeviation="18" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="ecgGlow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#00e5cc" stopOpacity="0.09"/>
            <stop offset="100%" stopColor="#00e5cc" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="ecgFade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="rgba(0,229,200,0)"/>
            <stop offset="15%"  stopColor="#00e5cc"/>
            <stop offset="85%"  stopColor="#00e5cc"/>
            <stop offset="100%" stopColor="rgba(0,229,200,0)"/>
          </linearGradient>
          <linearGradient id="wakeL" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="rgba(150,240,230,0)"/>
            <stop offset="100%" stopColor="rgba(150,240,230,0.22)"/>
          </linearGradient>
        </defs>

        {/* 그리드 */}
        {Array.from({length:19}).map((_,i)=>(
          <line key={`h${i}`} x1="0" y1={45+i*46} x2="1440" y2={45+i*46} stroke="#00e5cc" strokeWidth="0.4" opacity="0.07"/>
        ))}
        {Array.from({length:21}).map((_,i)=>(
          <line key={`v${i}`} x1={i*76} y1="0" x2={i*76} y2="860" stroke="#00e5cc" strokeWidth="0.4" opacity="0.07"/>
        ))}

        {/* ── 레이더 배경 글로우 ── */}
        <circle cx={RX} cy={RY} r={Math.round(330*RS)} fill="url(#radarBg)"/>
        <circle cx={RX} cy={RY} r={Math.round(200*RS)} fill="url(#radarBg)" opacity="1.6"/>

        {/* ── 레이더 동심원 (×1.3) ── */}
        {[65,130,195,260].map((r,i)=>(
          <circle key={r} cx={RX} cy={RY} r={Math.round(r*RS)}
            fill="none" stroke="#00e5cc"
            strokeWidth={i===3?1:0.7} opacity={0.15+i*0.045}
            filter="url(#glow2)"
            style={{animation:`radarRingPulse ${3+i*0.4}s ease-in-out infinite ${i*0.3}s`}}/>
        ))}

        {/* 십자선 */}
        <line x1={RX-Math.round(310*RS)} y1={RY} x2={RX+Math.round(210*RS)} y2={RY}
          stroke="#00e5cc" strokeWidth="0.6" opacity="0.22" filter="url(#glow2)"/>
        <line x1={RX} y1={RY-Math.round(320*RS)} x2={RX} y2={RY+Math.round(300*RS)}
          stroke="#00e5cc" strokeWidth="0.6" opacity="0.22" filter="url(#glow2)"/>

        {/* 각도선 */}
        {[45,135,225,315].map(deg=>{
          const r=deg*Math.PI/180, ext=Math.round(260*RS)
          return <line key={deg} x1={RX} y1={RY} x2={RX+Math.cos(r)*ext} y2={RY+Math.sin(r)*ext}
            stroke="#00e5cc" strokeWidth="0.45" opacity="0.12"/>
        })}

        {/* 눈금 */}
        {[130,260].map(rv=>Array.from({length:24}).map((_,i)=>{
          const a=i/24*2*Math.PI, r=Math.round(rv*RS)
          return <line key={`${rv}${i}`}
            x1={RX+Math.cos(a)*r}       y1={RY+Math.sin(a)*r}
            x2={RX+Math.cos(a)*(r+5)}   y2={RY+Math.sin(a)*(r+5)}
            stroke="#00e5cc" strokeWidth="0.8" opacity="0.28"/>
        }))}

        {/* ── 선박 (×1.3 scale) ── */}
        <g transform={`translate(${RX-30},${RY+10}) rotate(-18) scale(${RS})`} filter="url(#shipGlow)">
          <ellipse cx="0" cy="8" rx="185" ry="48" fill="rgba(0,200,180,0.1)"/>
          <path d="M-190,-22 C-178,-42 -140,-48 -78,-50 L78,-48 C126,-44 162,-32 186,-8 C190,-1 186,10 168,27 C146,42 98,50 38,50 L-78,48 C-140,46 -178,40 -190,22 Z"
            fill="#0c1a26" stroke="rgba(0,200,180,0.22)" strokeWidth="0.8"/>
          <path d="M-190,-22 C-178,-42 -140,-48 -78,-50 L78,-48 C126,-44 162,-32 186,-8"
            fill="none" stroke="rgba(0,220,200,0.38)" strokeWidth="1.6"/>
          {[[-178,-32,50,64],[-116,-35,55,70],[-50,-36,55,72],[18,-35,52,70],[80,-29,42,58]].map(([x,y,w,h],i)=>(
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} rx="3" fill="#081220" stroke="rgba(0,180,160,0.22)" strokeWidth="0.8"/>
              <line x1={x+w/2} y1={y} x2={x+w/2} y2={y+h} stroke="rgba(0,180,160,0.14)" strokeWidth="0.5"/>
            </g>
          ))}
          <rect x="-186" y="-18" width="22" height="36" rx="2" fill="#14263a" stroke="rgba(0,220,200,0.38)" strokeWidth="0.8"/>
          <rect x="-186" y="-28" width="22" height="14" rx="2" fill="#1c3048" stroke="rgba(0,220,200,0.3)" strokeWidth="0.6"/>
          {[[-182,-25],[-174,-25],[-166,-25]].map(([wx,wy],i)=>(
            <rect key={i} x={wx} y={wy} width="6" height="5" rx="1" fill="rgba(0,220,200,0.5)"/>
          ))}
          <line x1="-175" y1="-28" x2="-175" y2="-56" stroke="rgba(0,200,180,0.5)" strokeWidth="1.2"/>
          <line x1="-175" y1="-56" x2="-148" y2="-40" stroke="rgba(0,200,180,0.28)" strokeWidth="0.8"/>
          <circle cx="-175" cy="-58" r="2.5" fill="#00e5cc" opacity="0.85"
            style={{animation:'mastLight 2s ease-in-out infinite'}}/>
          <rect x="134" y="-19" width="36" height="38" rx="3" fill="#10202e" stroke="rgba(0,180,160,0.18)" strokeWidth="0.7"/>
          <circle cx="184" cy="-2" r="3" fill="#00e5cc" opacity="0.88"
            style={{animation:'mastLight 1.5s ease-in-out infinite 0.3s'}}/>
          <path d="M-190,-22 C-220,-36 -248,-26 -238,-7 C-228,12 -205,17 -190,22"
            fill="none" stroke="url(#wakeL)" strokeWidth="2.5" opacity="0.55"/>
          <path d="M186,-8 C208,-20 220,-10 215,1 C210,14 200,18 186,10"
            fill="none" stroke="rgba(150,240,230,0.22)" strokeWidth="2"/>
        </g>

        {/* 레이더 도트 */}
        {[{a:25,r:130},{a:100,r:195},{a:195,r:130},{a:270,r:260},{a:330,r:195}].map(({a,r},i)=>{
          const rad=a*Math.PI/180, rr=Math.round(r*RS)
          return <circle key={i} cx={RX+Math.cos(rad)*rr} cy={RY+Math.sin(rad)*rr}
            r="3.5" fill="#00e5cc" opacity="0.7" filter="url(#glow2)"
            style={{animation:`dotBlink ${1.5+i*0.3}s ease-in-out infinite ${i*0.4}s`}}/>
        })}

        {/* 좌표 텍스트 */}
        <text x={RX+Math.round(134*RS)} y={RY-10} fontSize="8" fill="#00e5cc" opacity="0.35" fontFamily="monospace">169nm</text>
        <text x={RX+Math.round(264*RS)} y={RY-10} fontSize="8" fill="#00e5cc" opacity="0.25" fontFamily="monospace">338nm</text>
        <text x={RX+4} y={RY-Math.round(320*RS)} fontSize="8" fill="#00e5cc" opacity="0.28" fontFamily="monospace">N</text>

        {/* ── ECG 라인 (배경 좌하단) ── */}
        <g transform="translate(30,790)">
          <rect x="0" y="-8" width="400" height="52" rx="5"
            fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
          <text x="10" y="6" fontSize="9" fill="#64748b" fontFamily="Pretendard" fontWeight="700" letterSpacing="1">ECG · LIVE</text>
          <svg x="0" y="10" width="400" height="35" viewBox="0 0 400 35" style={{overflow:'hidden'}}>
            <g style={{animation:'ecgScroll 3s linear infinite'}}>
              <path d="M-360,18 L-300,18 L-295,16 L-290,2 L-285,34 L-280,18 L-270,18
                       M-180,18 L-120,18 L-115,16 L-110,2 L-105,34 L-100,18 L-90,18
                       M0,18 L60,18 L65,16 L70,2 L75,34 L80,18 L90,18
                       M90,18 L150,18 L155,16 L160,2 L165,34 L170,18 L180,18
                       M180,18 L240,18 L245,16 L250,2 L255,34 L260,18 L270,18
                       M270,18 L330,18 L335,16 L340,2 L345,34 L350,18 L400,18
                       M400,18 L460,18 L465,16 L470,2 L475,34 L480,18 L490,18"
                fill="none" stroke="url(#ecgFade)" strokeWidth="1.8"
                strokeLinecap="round" filter="url(#ecgGlow)"/>
            </g>
          </svg>
        </g>
      </svg>

      {/* ══ 레이더 스캔 회전 ══ */}
      <div style={{
        position:'absolute',
        left:`calc(${(RX/1440)*100}% - ${Math.round(270*RS)}px)`,
        top: `calc(${(RY/860)*100}% - ${Math.round(270*RS)}px)`,
        width:Math.round(540*RS), height:Math.round(540*RS),
        borderRadius:'50%', overflow:'hidden',
        pointerEvents:'none', zIndex:4,
      }}>
        <div style={{
          position:'absolute', inset:0, borderRadius:'50%',
          background:'conic-gradient(from 0deg, rgba(0,229,200,0.3) 0deg, rgba(0,229,200,0.06) 38deg, transparent 65deg, transparent 360deg)',
          animation:'radarScan 6s linear infinite',
        }}/>
      </div>


      {/* ══ 비네트 ══ */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:5,
        background:'radial-gradient(ellipse 120% 100% at 50% 50%, transparent 40%, rgba(1,8,16,0.6) 100%)' }}/>

      {/* ══ 상단 네비 바 ══ */}
      <div style={{ position:'relative', zIndex:10, padding:'22px 48px' }}/>

      {/* ══ 메인 콘텐츠 ══ */}
      <div style={{ position:'relative', zIndex:12, flex:1 }}>
        <div style={{ position:'absolute', left:52, top:'38%', transform:'translateY(-50%)' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:16, background:'rgba(0,229,200,0.08)', border:'1px solid rgba(0,229,200,0.25)', borderRadius:30, padding:'6px 16px' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#00e5cc', boxShadow:'0 0 8px #00e5cc', animation:'loginPulse 2s infinite' }}/>
            <span style={{ fontSize:13, fontWeight:700, color:'#00e5cc', letterSpacing:2.5 }}>Maritime Medical AI System</span>
          </div>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:60, fontWeight:950, lineHeight:1.1, letterSpacing:-2, color:'#ffffff', filter:'drop-shadow(0 4px 24px rgba(0,0,0,0.6))' }}>선박 탑재형<br/>엣지 의료 지원</div>
            <div style={{ fontSize:60, fontWeight:800, lineHeight:1.1, fontStyle:'italic', letterSpacing:-1, marginTop:8, background:'linear-gradient(90deg,#39ff6a 0%,#00ffcc 55%,#00e5ff 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', filter:'drop-shadow(0 2px 20px rgba(0,255,180,0.4))', paddingRight:24, paddingBottom:8 }}>AI Medical System</div>
          </div>
          <div style={{ display:'flex', gap:28 }}>
            {[{val:'24H',label:'실시간 바이탈'},{val:'4종',label:'응급처치 분류'},{val:'99%',label:'오프라인 가용'},{val:'12단계',label:'처치 프로토콜'}].map(({val,label})=>(
              <div key={val}>
                <div style={{ fontSize:26, fontWeight:950, color:'#fff', lineHeight:1, letterSpacing:-0.5 }}>{val}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 로그인 폼 */}
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:460 }}>
          <div style={{ position:'relative', padding:1.5, borderRadius:28, background:'rgba(0,229,200,0.1)', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:'-50%', left:'-50%', width:'200%', height:'200%', background:'conic-gradient(transparent,transparent,transparent,#00e5cc)', animation:'borderRotate 4s linear infinite', transformOrigin:'center' }}/>
            <div style={{ background:'rgba(2,12,22,0.88)', backdropFilter:'blur(40px)', borderRadius:26.5, padding:'48px 44px', position:'relative', zIndex:2 }}>
              <div style={{ textAlign:'center', marginBottom:36 }}>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
                  <MdtsLogo size={100} />
                </div>
                <div style={{ fontSize:26, fontWeight:900, letterSpacing:0.3, marginBottom:7 }}>MDTS</div>
                <div style={{ fontSize:20.8, color:'rgba(0,200,180,0.75)' }}>바다 위 어디서든, 멈추지 않는 의료 AI</div>
              </div>
              <form onSubmit={onLogin} style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <LoginInput icon={<Database size={20}/>} placeholder="시리얼 넘버" value={loginData.serial} onChange={v=>setLoginData({...loginData,serial:v})} focused={focusedField==='serial'} setFocused={v=>setFocusedField(v?'serial':null)}/>
                <LoginInput icon={<Settings size={20}/>} placeholder="기기 번호"   value={loginData.device} onChange={v=>setLoginData({...loginData,device:v})}  focused={focusedField==='device'}  setFocused={v=>setFocusedField(v?'device':null)}/>
                <LoginInput icon={<Ship size={20}/>}     placeholder="선박 번호"   value={loginData.ship}   onChange={v=>setLoginData({...loginData,ship:v})}    focused={focusedField==='ship'}    setFocused={v=>setFocusedField(v?'ship':null)}/>
                <button type="submit" style={{ marginTop:10, padding:'22px', borderRadius:18, background:'linear-gradient(90deg,#00c9b1,#00a8e8)', color:'#000', fontWeight:900, border:'none', cursor:'pointer', fontSize:19, boxShadow:'0 4px 28px rgba(0,200,180,0.4)' }}>시스템 접속</button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes radarScan      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes radarRingPulse { 0%,100%{opacity:0.18} 50%{opacity:0.4} }
        @keyframes dotBlink       { 0%,100%{opacity:0.7} 50%{opacity:1} }
        @keyframes mastLight      { 0%,100%{opacity:0.9} 50%{opacity:0.15} }
        @keyframes ecgScroll      { from{transform:translateX(0)} to{transform:translateX(-360px)} }
        @keyframes pulseDot       { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
        @keyframes loginPulse     { 0%,100%{opacity:1;box-shadow:0 0 6px #00e5cc} 50%{opacity:0.4;box-shadow:0 0 14px #00e5cc} }
        @keyframes borderRotate   { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}

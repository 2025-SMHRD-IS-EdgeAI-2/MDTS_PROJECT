import { readFileSync, writeFileSync } from 'fs';

const file = 'src/pages/Main.jsx';
const content = readFileSync(file, 'utf8');
const lines = content.split('\n');

const startLine = 432; // 0-indexed (line 433)
const endLine = 822;   // 0-indexed (line 823 = "return null")

const newCode = `                        // CARDIAC 1
                        if (activeEmergencyGuide === 'CARDIAC' && activeStep === 1) return (
                          <svg viewBox={vb} {...S}>
                            <defs>
                              <linearGradient id="skC1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fde8c8"/><stop offset="60%" stopColor="#f0b07a"/><stop offset="100%" stopColor="#c47d45"/></linearGradient>
                              <linearGradient id="scC1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4db8d4"/><stop offset="100%" stopColor="#1e6a8a"/></linearGradient>
                              <linearGradient id="glC1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#1d4ed8"/></linearGradient>
                              <filter id="shC1"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.35"/></filter>
                            </defs>
                            <ellipse cx="120" cy="248" rx="80" ry="8" fill="rgba(0,0,0,0.18)"/>
                            <path d="M28 160 Q28 142 50 140 L200 140 Q220 140 220 158 Q220 176 200 178 L50 178 Q28 178 28 160Z" fill="url(#skC1)" filter="url(#shC1)"/>
                            <circle cx="210" cy="158" r="22" fill="url(#skC1)" filter="url(#shC1)"/>
                            <path d="M194 144 Q210 136 226 144" fill="#3d2b1f"/>
                            <ellipse cx="204" cy="159" rx="4" ry="4.5" fill="#fff"/><ellipse cx="216" cy="159" rx="4" ry="4.5" fill="#fff"/>
                            <circle cx="205" cy="160" r="2.5" fill="#1e1e2e"/><circle cx="217" cy="160" r="2.5" fill="#1e1e2e"/>
                            <path d="M75 52 Q75 36 110 32 Q145 36 145 52 L148 138 Q148 148 110 150 Q72 148 72 138Z" fill="url(#scC1)" filter="url(#shC1)"/>
                            <circle cx="110" cy="20" r="20" fill="url(#skC1)" filter="url(#shC1)"/>
                            <path d="M93 10 Q110 2 127 10" fill="#3d2b1f"/>
                            <path d="M75 90 Q52 100 38 128 Q42 140 55 136 Q66 112 82 104Z" fill="url(#glC1)" filter="url(#shC1)"/>
                            <ellipse cx="36" cy="132" rx="13" ry="10" fill="url(#glC1)"/>
                            <circle cx="36" cy="132" r="20" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" style={{animation:'pingRing 1.8s infinite'}}/>
                            <rect x="14" y="56" width="72" height="54" rx="6" fill="#0a1628" stroke="rgba(56,189,248,0.5)" strokeWidth="1.2"/>
                            <text x="50" y="68" textAnchor="middle" fontSize="7" fill="#38bdf8" fontWeight="800" letterSpacing="0.5">SHOULDER TAP</text>
                            <text x="50" y="80" textAnchor="middle" fontSize="7" fill="#94a3b8">어깨 두드리며</text>
                            <text x="50" y="91" textAnchor="middle" fontSize="7" fill="#94a3b8">의식 여부 확인</text>
                            <line x1="86" y1="76" x2="40" y2="130" stroke="rgba(56,189,248,0.3)" strokeWidth="1" strokeDasharray="3,2"/>
                          </svg>
                        )
                        // CARDIAC 2
                        if (activeEmergencyGuide === 'CARDIAC' && activeStep === 2) return (
                          <svg viewBox={vb} {...S}>
                            <defs>
                              <linearGradient id="skC2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fde8c8"/><stop offset="60%" stopColor="#f0b07a"/><stop offset="100%" stopColor="#c47d45"/></linearGradient>
                              <linearGradient id="scC2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4db8d4"/><stop offset="100%" stopColor="#1e6a8a"/></linearGradient>
                              <linearGradient id="glC2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#1d4ed8"/></linearGradient>
                              <filter id="shC2"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.35"/></filter>
                              <marker id="arC2" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 Z" fill="#ef4444"/></marker>
                            </defs>
                            <ellipse cx="120" cy="248" rx="80" ry="8" fill="rgba(0,0,0,0.18)"/>
                            <path d="M20 172 Q20 154 42 152 L196 152 Q218 152 218 170 Q218 188 196 190 L42 190 Q20 190 20 172Z" fill="url(#skC2)" filter="url(#shC2)"/>
                            <circle cx="206" cy="168" r="22" fill="url(#skC2)" filter="url(#shC2)"/>
                            <path d="M190 154 Q206 145 222 154" fill="#3d2b1f"/>
                            <path d="M72 48 Q72 32 110 28 Q148 32 148 48 L150 150 Q150 162 110 164 Q70 162 70 150Z" fill="url(#scC2)" filter="url(#shC2)"/>
                            <circle cx="110" cy="16" r="20" fill="url(#skC2)" filter="url(#shC2)"/>
                            <path d="M93 6 Q110 -2 127 6" fill="#3d2b1f"/>
                            <path d="M72 108 L90 150" stroke="#4db8d4" strokeWidth="14" strokeLinecap="round" style={{animation:'cprPress 0.55s infinite alternate'}}/>
                            <path d="M148 108 L150 150" stroke="#4db8d4" strokeWidth="14" strokeLinecap="round" style={{animation:'cprPress 0.55s infinite alternate'}}/>
                            <rect x="86" y="148" width="48" height="16" rx="6" fill="url(#glC2)" filter="url(#shC2)" style={{animation:'cprPress 0.55s infinite alternate'}}/>
                            <rect x="90" y="158" width="40" height="10" rx="4" fill="#1d4ed8" style={{animation:'cprPress 0.55s infinite alternate'}}/>
                            <line x1="110" y1="128" x2="110" y2="146" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#arC2)" style={{animation:'cprPress 0.55s infinite alternate'}}/>
                            <line x1="92" y1="162" x2="76" y2="162" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" markerEnd="url(#arC2)"/>
                            <line x1="128" y1="162" x2="144" y2="162" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" markerEnd="url(#arC2)"/>
                            <rect x="148" y="48" width="80" height="60" rx="6" fill="#0a1628" stroke="rgba(56,189,248,0.5)" strokeWidth="1.2"/>
                            <text x="188" y="60" textAnchor="middle" fontSize="7" fill="#38bdf8" fontWeight="800" letterSpacing="0.5">STERNUM</text>
                            <rect x="158" y="66" width="60" height="30" rx="4" fill="url(#skC2)"/>
                            <rect x="170" y="72" width="36" height="18" rx="4" fill="url(#glC2)"/>
                            <line x1="158" y1="74" x2="150" y2="82" stroke="#ef4444" strokeWidth="1.5" markerEnd="url(#arC2)"/>
                            <line x1="218" y1="74" x2="226" y2="82" stroke="#ef4444" strokeWidth="1.5" markerEnd="url(#arC2)"/>
                            <text x="188" y="106" textAnchor="middle" fontSize="7" fill="#94a3b8">100~120회/분 · 5cm</text>
                            <line x1="148" y1="78" x2="112" y2="150" stroke="rgba(56,189,248,0.3)" strokeWidth="1" strokeDasharray="3,2"/>
                            <path d="M100 100 Q103 93 110 100 Q117 93 120 100 Q120 108 110 116 Q100 108 100 100Z" fill="#f43f5e" style={{animation:'heartBeat 0.55s infinite alternate'}}/>
                          </svg>
                        )
                        // CARDIAC 3
                        if (activeEmergencyGuide === 'CARDIAC' && activeStep === 3) return (
                          <svg viewBox={vb} {...S}>
                            <defs>
                              <linearGradient id="skC3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fde8c8"/><stop offset="60%" stopColor="#f0b07a"/><stop offset="100%" stopColor="#c47d45"/></linearGradient>
                              <linearGradient id="aedC3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fcd34d"/><stop offset="100%" stopColor="#b45309"/></linearGradient>
                              <linearGradient id="glC3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#1d4ed8"/></linearGradient>
                              <filter id="shC3"><feDropShadow dx="1" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.4"/></filter>
                              <marker id="arC3" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 Z" fill="#ef4444"/></marker>
                            </defs>
                            <ellipse cx="120" cy="248" rx="80" ry="8" fill="rgba(0,0,0,0.18)"/>
                            <path d="M18 185 Q18 167 40 165 L194 165 Q216 165 216 183 Q216 201 194 203 L40 203 Q18 203 18 185Z" fill="url(#skC3)" filter="url(#shC3)"/>
                            <circle cx="205" cy="182" r="22" fill="url(#skC3)" filter="url(#shC3)"/>
                            <path d="M189 168 Q205 159 221 168" fill="#3d2b1f"/>
                            <rect x="22" y="60" width="92" height="118" rx="12" fill="url(#aedC3)" filter="url(#shC3)"/>
                            <rect x="26" y="64" width="84" height="110" rx="10" fill="#fbbf24"/>
                            <rect x="32" y="72" width="72" height="48" rx="7" fill="#020617"/>
                            <polyline points="35,96 44,96 49,76 54,116 59,76 64,96 76,96 81,84 86,108 91,96 100,96" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" style={{animation:'ecgAnim 1.1s linear infinite'}}/>
                            <circle cx="68" cy="152" r="18" fill="#dc2626" filter="url(#shC3)"/>
                            <circle cx="68" cy="152" r="13" fill="#ef4444"/>
                            <path d="M64 144 L70 152 L65 152 L71 160 L65 152 L70 152Z" fill="#fff"/>
                            <path d="M92 110 Q112 104 130 116" fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round"/>
                            <path d="M92 122 Q114 128 132 142" fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round"/>
                            <rect x="120" y="106" width="50" height="28" rx="8" fill="url(#glC3)" filter="url(#shC3)"/>
                            <rect x="120" y="144" width="50" height="28" rx="8" fill="url(#glC3)" filter="url(#shC3)"/>
                            <line x1="145" y1="104" x2="145" y2="86" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arC3)"/>
                            <line x1="145" y1="174" x2="145" y2="192" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arC3)"/>
                            <rect x="148" y="46" width="82" height="46" rx="6" fill="#0a1628" stroke="rgba(56,189,248,0.5)" strokeWidth="1.2"/>
                            <text x="189" y="58" textAnchor="middle" fontSize="7" fill="#38bdf8" fontWeight="800" letterSpacing="0.5">AED PADS</text>
                            <text x="189" y="70" textAnchor="middle" fontSize="7" fill="#94a3b8">우측 쇄골 하단</text>
                            <text x="189" y="81" textAnchor="middle" fontSize="7" fill="#94a3b8">좌측 옆구리 부착</text>
                            <circle cx="220" cy="46" r="5" fill="#22c55e" style={{animation:'vitalPulse 1s infinite'}}/>
                          </svg>
                        )
                        // TRAUMA 1
                        if (activeEmergencyGuide === 'TRAUMA' && activeStep === 1) return (
                          <svg viewBox={vb} {...S}>
                            <defs>
                              <linearGradient id="skT1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fde8c8"/><stop offset="60%" stopColor="#f0b07a"/><stop offset="100%" stopColor="#c47d45"/></linearGradient>
                              <linearGradient id="glT1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#1d4ed8"/></linearGradient>
                              <linearGradient id="gzT1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f8fafc"/><stop offset="100%" stopColor="#cbd5e1"/></linearGradient>
                              <filter id="shT1"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.3"/></filter>
                              <marker id="arT1" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 Z" fill="#ef4444"/></marker>
                            </defs>
                            <ellipse cx="120" cy="248" rx="75" ry="8" fill="rgba(0,0,0,0.18)"/>
                            <path d="M55 72 Q48 68 46 85 L46 210 Q46 224 70 226 Q94 228 104 226 Q128 224 132 210 L136 85 Q136 68 126 72 Q116 68 95 66 Q74 65 55 72Z" fill="url(#skT1)" filter="url(#shT1)"/>
                            <ellipse cx="91" cy="148" rx="24" ry="15" fill="#be123c"/>
                            <path d="M72 148 Q91 136 110 148" fill="#9f1239"/>
                            <rect x="64" y="126" width="54" height="38" rx="7" fill="url(#gzT1)" filter="url(#shT1)" style={{animation:'pressDown 0.8s infinite alternate'}}/>
                            <line x1="91" y1="128" x2="91" y2="162" stroke="#94a3b8" strokeWidth="1.5"/>
                            <line x1="66" y1="145" x2="116" y2="145" stroke="#94a3b8" strokeWidth="1.5"/>
                            <path d="M44 112 Q34 118 30 132 Q30 148 46 148 L64 144 Q64 130 68 122Z" fill="url(#glT1)" filter="url(#shT1)" style={{animation:'pressDown 0.8s infinite alternate'}}/>
                            <path d="M138 112 Q148 118 152 132 Q152 148 136 148 L118 144 Q118 130 114 122Z" fill="url(#glT1)" filter="url(#shT1)" style={{animation:'pressDown 0.8s infinite alternate'}}/>
                            <line x1="91" y1="108" x2="91" y2="124" stroke="#ef4444" strokeWidth="2.5" markerEnd="url(#arT1)" style={{animation:'pressDown 0.8s infinite alternate'}}/>
                            <circle cx="84" cy="175" r="4" fill="#be123c" style={{animation:'dropFall 1.1s infinite'}}/>
                            <circle cx="99" cy="180" r="3" fill="#be123c" style={{animation:'dropFall 1.1s 0.35s infinite'}}/>
                            <rect x="148" y="60" width="82" height="56" rx="6" fill="#0a1628" stroke="rgba(244,63,94,0.5)" strokeWidth="1.2"/>
                            <text x="189" y="72" textAnchor="middle" fontSize="7" fill="#f43f5e" fontWeight="800" letterSpacing="0.5">DIRECT PRESSURE</text>
                            <text x="189" y="84" textAnchor="middle" fontSize="7" fill="#94a3b8">거즈 강하게 압박</text>
                            <text x="189" y="95" textAnchor="middle" fontSize="7" fill="#94a3b8">지혈 유지</text>
                            <line x1="148" y1="84" x2="116" y2="138" stroke="rgba(244,63,94,0.3)" strokeWidth="1" strokeDasharray="3,2"/>
                          </svg>
                        )
                        // TRAUMA 2
                        if (activeEmergencyGuide === 'TRAUMA' && activeStep === 2) return (
                          <svg viewBox={vb} {...S}>
                            <defs>
                              <linearGradient id="skT2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fde8c8"/><stop offset="60%" stopColor="#f0b07a"/><stop offset="100%" stopColor="#c47d45"/></linearGradient>
                              <linearGradient id="bdT2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#475569"/><stop offset="100%" stopColor="#1e293b"/></linearGradient>
                              <linearGradient id="spT2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#92400e"/></linearGradient>
                              <filter id="shT2"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.3"/></filter>
                              <marker id="arT2u" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 Z" fill="#ef4444"/></marker>
                            </defs>
                            <ellipse cx="120" cy="248" rx="80" ry="8" fill="rgba(0,0,0,0.18)"/>
                            <rect x="14" y="195" width="212" height="16" rx="6" fill="#1e293b" filter="url(#shT2)"/>
                            <path d="M22 175 Q22 158 44 156 L148 156 Q170 156 170 174 Q170 192 148 194 L44 194 Q22 194 22 175Z" fill="url(#bdT2)" filter="url(#shT2)"/>
                            <circle cx="182" cy="173" r="22" fill="url(#skT2)" filter="url(#shT2)"/>
                            <path d="M165 160 Q182 151 199 160" fill="#3d2b1f"/>
                            <path d="M22 162 Q22 146 36 144 L78 144 Q92 146 92 162 L92 178 Q78 182 36 182Z" fill="url(#skT2)" filter="url(#shT2)" style={{animation:'legRaise 2.2s ease-in-out infinite alternate'}}/>
                            <path d="M78 142 Q88 125 92 106 L108 107 Q104 128 90 148Z" fill="url(#skT2)" filter="url(#shT2)" style={{animation:'legRaise 2.2s ease-in-out infinite alternate'}}/>
                            <rect x="24" y="174" width="6" height="38" rx="3" fill="url(#spT2)" style={{animation:'legRaise 2.2s ease-in-out infinite alternate'}}/>
                            <rect x="84" y="140" width="6" height="38" rx="3" fill="url(#spT2)" style={{animation:'legRaise 2.2s ease-in-out infinite alternate'}}/>
                            <rect x="24" y="184" width="66" height="5" rx="2" fill="url(#spT2)" style={{animation:'legRaise 2.2s ease-in-out infinite alternate'}}/>
                            <rect x="24" y="163" width="66" height="5" rx="2" fill="url(#spT2)" style={{animation:'legRaise 2.2s ease-in-out infinite alternate'}}/>
                            <line x1="56" y1="132" x2="56" y2="106" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#arT2u)" style={{animation:'legRaise 2.2s ease-in-out infinite alternate'}}/>
                            <rect x="148" y="52" width="82" height="52" rx="6" fill="#0a1628" stroke="rgba(251,191,36,0.5)" strokeWidth="1.2"/>
                            <text x="189" y="64" textAnchor="middle" fontSize="7" fill="#fbbf24" fontWeight="800" letterSpacing="0.5">ELEVATION</text>
                            <text x="189" y="76" textAnchor="middle" fontSize="7" fill="#94a3b8">심장보다 높게 유지</text>
                            <text x="189" y="87" textAnchor="middle" fontSize="7" fill="#94a3b8">부동화 및 고정</text>
                            <line x1="148" y1="76" x2="90" y2="130" stroke="rgba(251,191,36,0.3)" strokeWidth="1" strokeDasharray="3,2"/>
                          </svg>
                        )
                        // TRAUMA 3
                        if (activeEmergencyGuide === 'TRAUMA' && activeStep === 3) return (
                          <svg viewBox={vb} {...S}>
                            <defs>
                              <linearGradient id="skT3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fde8c8"/><stop offset="60%" stopColor="#f0b07a"/><stop offset="100%" stopColor="#c47d45"/></linearGradient>
                              <linearGradient id="blT3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6b7280"/><stop offset="100%" stopColor="#374151"/></linearGradient>
                              <filter id="shT3"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.3"/></filter>
                            </defs>
                            <ellipse cx="120" cy="248" rx="80" ry="8" fill="rgba(0,0,0,0.18)"/>
                            <rect x="14" y="200" width="212" height="14" rx="5" fill="#1e293b" filter="url(#shT3)"/>
                            <path d="M20 162 Q20 146 42 144 L178 144 Q200 144 200 160 Q200 196 178 198 L42 198 Q20 198 20 180Z" fill="url(#blT3)" filter="url(#shT3)"/>
                            <circle cx="40" cy="162" r="22" fill="url(#skT3)" filter="url(#shT3)"/>
                            <path d="M24 150 Q40 141 56 150" fill="#3d2b1f"/>
                            <ellipse cx="34" cy="163" rx="4" ry="4.5" fill="#fff"/><ellipse cx="46" cy="163" rx="4" ry="4.5" fill="#fff"/>
                            <circle cx="35" cy="164" r="2.5" fill="#1e1e2e"/><circle cx="47" cy="164" r="2.5" fill="#1e1e2e"/>
                            <path d="M84 132 Q92 118 100 132" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" style={{animation:'heatWave 1.4s infinite'}}/>
                            <path d="M110 128 Q120 112 130 128" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" style={{animation:'heatWave 1.4s 0.35s infinite'}}/>
                            <path d="M140 132 Q148 118 156 132" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" style={{animation:'heatWave 1.4s 0.7s infinite'}}/>
                            <circle cx="185" cy="114" r="22" fill="rgba(239,68,68,0.1)" stroke="#ef4444" strokeWidth="2"/>
                            <path d="M175 100 Q185 95 195 100 L195 112 Q185 118 175 112Z" fill="none" stroke="#ef4444" strokeWidth="1.8"/>
                            <line x1="172" y1="98" x2="198" y2="130" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
                            <rect x="54" y="50" width="82" height="52" rx="6" fill="#0a1628" stroke="rgba(251,191,36,0.5)" strokeWidth="1.2"/>
                            <text x="95" y="62" textAnchor="middle" fontSize="7" fill="#fbbf24" fontWeight="800" letterSpacing="0.5">SHOCK PREVENTION</text>
                            <text x="95" y="74" textAnchor="middle" fontSize="7" fill="#94a3b8">수평 눕힘 · 보온 유지</text>
                            <text x="95" y="85" textAnchor="middle" fontSize="7" fill="#94a3b8">음식 · 음료 금지</text>
                          </svg>
                        )
                        // UNCONSCIOUS 1
                        if (activeEmergencyGuide === 'UNCONSCIOUS' && activeStep === 1) return (
                          <svg viewBox={vb} {...S}>
                            <defs>
                              <linearGradient id="skU1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fde8c8"/><stop offset="60%" stopColor="#f0b07a"/><stop offset="100%" stopColor="#c47d45"/></linearGradient>
                              <linearGradient id="bdU1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#475569"/><stop offset="100%" stopColor="#1e293b"/></linearGradient>
                              <linearGradient id="glU1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#1d4ed8"/></linearGradient>
                              <filter id="shU1"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.3"/></filter>
                              <marker id="arU1" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 Z" fill="#fbbf24"/></marker>
                            </defs>
                            <ellipse cx="120" cy="248" rx="80" ry="8" fill="rgba(0,0,0,0.18)"/>
                            <path d="M22 185 Q22 167 44 165 L196 165 Q218 165 218 183 Q218 201 196 203 L44 203 Q22 203 22 185Z" fill="url(#bdU1)" filter="url(#shU1)"/>
                            <circle cx="52" cy="178" r="24" fill="url(#skU1)" filter="url(#shU1)" style={{animation:'headTilt 2.5s ease-in-out infinite alternate'}}/>
                            <path d="M34 164 Q52 155 70 164" fill="#3d2b1f"/>
                            <path d="M42 201 Q42 216 52 220 Q62 216 62 201Z" fill="url(#skU1)"/>
                            <path d="M24 192 Q16 184 20 172 L46 200 Q36 202 24 192Z" fill="url(#glU1)" filter="url(#shU1)"/>
                            <ellipse cx="52" cy="154" rx="18" ry="10" fill="url(#glU1)" filter="url(#shU1)"/>
                            <line x1="52" y1="152" x2="52" y2="116" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="5,4" markerEnd="url(#arU1)" style={{animation:'airArrow 1.2s infinite alternate'}}/>
                            <rect x="74" y="52" width="84" height="56" rx="6" fill="#0a1628" stroke="rgba(251,191,36,0.5)" strokeWidth="1.2"/>
                            <text x="116" y="64" textAnchor="middle" fontSize="7" fill="#fbbf24" fontWeight="800" letterSpacing="0.5">HEAD-TILT CHIN-LIFT</text>
                            <circle cx="102" cy="88" r="14" fill="url(#skU1)"/>
                            <path d="M88 80 Q102 73 116 80" fill="#3d2b1f"/>
                            <line x1="102" y1="74" x2="102" y2="58" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arU1)"/>
                            <text x="138" y="88" textAnchor="middle" fontSize="7" fill="#94a3b8">기도 개방</text>
                            <line x1="74" y1="80" x2="52" y2="158" stroke="rgba(251,191,36,0.3)" strokeWidth="1" strokeDasharray="3,2"/>
                          </svg>
                        )
                        // UNCONSCIOUS 2
                        if (activeEmergencyGuide === 'UNCONSCIOUS' && activeStep === 2) return (
                          <svg viewBox={vb} {...S}>
                            <defs>
                              <linearGradient id="skU2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fde8c8"/><stop offset="60%" stopColor="#f0b07a"/><stop offset="100%" stopColor="#c47d45"/></linearGradient>
                              <linearGradient id="bdU2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b5998"/><stop offset="100%" stopColor="#1e3060"/></linearGradient>
                              <filter id="shU2"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.3"/></filter>
                            </defs>
                            <ellipse cx="120" cy="248" rx="80" ry="8" fill="rgba(0,0,0,0.18)"/>
                            <rect x="12" y="200" width="216" height="12" rx="5" fill="#1e293b" filter="url(#shU2)"/>
                            <path d="M28 172 Q28 154 50 152 L158 152 Q180 152 184 164 Q188 178 172 186 L50 192 Q28 192 28 172Z" fill="url(#bdU2)" filter="url(#shU2)"/>
                            <circle cx="50" cy="164" r="22" fill="url(#skU2)" filter="url(#shU2)"/>
                            <path d="M33 152 Q50 143 67 152" fill="#3d2b1f"/>
                            <ellipse cx="43" cy="165" rx="4" ry="4.5" fill="#fff"/><ellipse cx="57" cy="165" rx="4" ry="4.5" fill="#fff"/>
                            <circle cx="44" cy="166" r="2.5" fill="#1e1e2e"/><circle cx="58" cy="166" r="2.5" fill="#1e1e2e"/>
                            <path d="M58 152 Q72 132 96 128 Q112 128 114 138 Q110 148 88 152Z" fill="url(#skU2)" filter="url(#shU2)"/>
                            <path d="M100 158 Q120 148 142 152 Q156 158 152 170 Q136 178 112 172Z" fill="url(#bdU2)" filter="url(#shU2)"/>
                            <path d="M150 165 Q170 156 188 161 Q196 168 192 178 Q176 186 158 178Z" fill="url(#bdU2)" filter="url(#shU2)"/>
                            <rect x="128" y="50" width="98" height="60" rx="6" fill="#0a1628" stroke="rgba(251,191,36,0.5)" strokeWidth="1.2"/>
                            <text x="177" y="62" textAnchor="middle" fontSize="7" fill="#fbbf24" fontWeight="800" letterSpacing="0.5">RECOVERY POSITION</text>
                            <text x="177" y="74" textAnchor="middle" fontSize="7" fill="#94a3b8">측와위 · 기도 확보</text>
                            <text x="177" y="85" textAnchor="middle" fontSize="7" fill="#94a3b8">구토물 기도폐쇄 방지</text>
                            <line x1="128" y1="74" x2="92" y2="150" stroke="rgba(251,191,36,0.3)" strokeWidth="1" strokeDasharray="3,2"/>
                          </svg>
                        )
                        // UNCONSCIOUS 3
                        if (activeEmergencyGuide === 'UNCONSCIOUS' && activeStep === 3) return (
                          <svg viewBox={vb} {...S}>
                            <defs>
                              <linearGradient id="mnU3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1e293b"/><stop offset="100%" stopColor="#0f172a"/></linearGradient>
                              <linearGradient id="skU3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fde8c8"/><stop offset="60%" stopColor="#f0b07a"/><stop offset="100%" stopColor="#c47d45"/></linearGradient>
                              <linearGradient id="bdU3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#475569"/><stop offset="100%" stopColor="#1e293b"/></linearGradient>
                              <filter id="shU3"><feDropShadow dx="1" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.4"/></filter>
                            </defs>
                            <ellipse cx="120" cy="248" rx="80" ry="8" fill="rgba(0,0,0,0.18)"/>
                            <rect x="30" y="22" width="180" height="128" rx="12" fill="url(#mnU3)" filter="url(#shU3)"/>
                            <rect x="34" y="26" width="172" height="120" rx="10" fill="#020617"/>
                            <rect x="96" y="150" width="48" height="20" rx="4" fill="#1e293b"/>
                            <rect x="72" y="166" width="96" height="8" rx="4" fill="#1e293b"/>
                            <text x="54" y="50" fontSize="8" fill="#475569" fontWeight="700" letterSpacing="0.5">HEART RATE</text>
                            <text x="54" y="72" fontSize="26" fill="#38bdf8" fontWeight="900" style={{animation:'vitalPulse 1s infinite'}}>78</text>
                            <text x="148" y="50" fontSize="8" fill="#475569" fontWeight="700" letterSpacing="0.5">SpO2</text>
                            <text x="148" y="72" fontSize="26" fill="#2dd4bf" fontWeight="900">96%</text>
                            <polyline points="36,122 50,122 56,100 62,144 68,100 74,122 92,122 98,108 104,136 110,122 130,122 136,106 142,122 162,122 168,108 174,122 194,122" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{animation:'ecgAnim 1.1s linear infinite'}}/>
                            <path d="M22 208 Q22 190 44 188 L196 188 Q218 188 218 206 Q218 224 196 226 L44 226 Q22 226 22 208Z" fill="url(#bdU3)" filter="url(#shU3)"/>
                            <circle cx="48" cy="205" r="20" fill="url(#skU3)" filter="url(#shU3)"/>
                            <path d="M110 150 Q100 162 84 185" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4,3"/>
                            <circle cx="84" cy="185" r="5" fill="#38bdf8" opacity="0.8"/>
                          </svg>
                        )
                        // RESPIRATORY 1
                        if (activeEmergencyGuide === 'RESPIRATORY' && activeStep === 1) return (
                          <svg viewBox={vb} {...S}>
                            <defs>
                              <linearGradient id="skR1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fde8c8"/><stop offset="60%" stopColor="#f0b07a"/><stop offset="100%" stopColor="#c47d45"/></linearGradient>
                              <linearGradient id="scR1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#065f46"/></linearGradient>
                              <filter id="shR1"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.3"/></filter>
                            </defs>
                            <ellipse cx="120" cy="248" rx="80" ry="8" fill="rgba(0,0,0,0.18)"/>
                            <rect x="158" y="108" width="22" height="120" rx="10" fill="#1e293b" filter="url(#shR1)"/>
                            <rect x="152" y="212" width="52" height="14" rx="6" fill="#1e293b"/>
                            <path d="M72 118 Q72 100 110 96 Q148 100 148 118 L152 210 Q152 224 110 226 Q68 224 68 210Z" fill="url(#scR1)" filter="url(#shR1)"/>
                            <circle cx="110" cy="76" r="26" fill="url(#skR1)" filter="url(#shR1)"/>
                            <path d="M88 62 Q110 52 132 62" fill="#3d2b1f"/>
                            <ellipse cx="101" cy="78" rx="5" ry="5.5" fill="#fff"/><ellipse cx="119" cy="78" rx="5" ry="5.5" fill="#fff"/>
                            <circle cx="102" cy="79" r="3" fill="#1e1e2e"/><circle cx="120" cy="79" r="3" fill="#1e1e2e"/>
                            <path d="M72 138 Q48 148 36 170 Q40 182 52 178 Q62 160 80 150Z" fill="url(#scR1)" filter="url(#shR1)"/>
                            <path d="M148 138 Q172 148 184 170 Q180 182 168 178 Q158 160 140 150Z" fill="url(#scR1)" filter="url(#shR1)"/>
                            <ellipse cx="34" cy="174" rx="13" ry="10" fill="url(#skR1)"/>
                            <ellipse cx="186" cy="174" rx="13" ry="10" fill="url(#skR1)"/>
                            <path d="M84 52 Q110 36 136 52" fill="none" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round" style={{animation:'breathe 2.2s infinite'}}/>
                            <path d="M74 40 Q110 18 146 40" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" opacity="0.6" style={{animation:'breathe 2.2s 0.5s infinite'}}/>
                            <path d="M64 27 Q110 0 156 27" fill="none" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" style={{animation:'breathe 2.2s 1s infinite'}}/>
                            <rect x="14" y="58" width="72" height="50" rx="6" fill="#0a1628" stroke="rgba(45,212,191,0.5)" strokeWidth="1.2"/>
                            <text x="50" y="70" textAnchor="middle" fontSize="7" fill="#2dd4bf" fontWeight="800" letterSpacing="0.5">SEMI-FOWLER</text>
                            <text x="50" y="82" textAnchor="middle" fontSize="7" fill="#94a3b8">45도 반좌위 유지</text>
                            <text x="50" y="93" textAnchor="middle" fontSize="7" fill="#94a3b8">호흡 편의 확보</text>
                            <line x1="86" y1="82" x2="80" y2="108" stroke="rgba(45,212,191,0.3)" strokeWidth="1" strokeDasharray="3,2"/>
                          </svg>
                        )
                        // RESPIRATORY 2
                        if (activeEmergencyGuide === 'RESPIRATORY' && activeStep === 2) return (
                          <svg viewBox={vb} {...S}>
                            <defs>
                              <linearGradient id="skR2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fde8c8"/><stop offset="60%" stopColor="#f0b07a"/><stop offset="100%" stopColor="#c47d45"/></linearGradient>
                              <linearGradient id="tnR2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#94a3b8"/><stop offset="100%" stopColor="#334155"/></linearGradient>
                              <linearGradient id="bdR2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#475569"/><stop offset="100%" stopColor="#1e293b"/></linearGradient>
                              <filter id="shR2"><feDropShadow dx="1" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.35"/></filter>
                            </defs>
                            <ellipse cx="120" cy="248" rx="80" ry="8" fill="rgba(0,0,0,0.18)"/>
                            <rect x="160" y="50" width="52" height="150" rx="26" fill="url(#tnR2)" filter="url(#shR2)"/>
                            <rect x="165" y="56" width="42" height="138" rx="21" fill="#64748b"/>
                            <rect x="170" y="42" width="32" height="18" rx="9" fill="#94a3b8"/>
                            <text x="186" y="112" textAnchor="middle" fontSize="12" fill="#2dd4bf" fontWeight="900">O2</text>
                            <circle cx="186" cy="140" r="20" fill="#0f172a" stroke="#2dd4bf" strokeWidth="1.5"/>
                            <text x="186" y="136" textAnchor="middle" fontSize="7" fill="#64748b">FLOW</text>
                            <text x="186" y="148" textAnchor="middle" fontSize="10" fill="#2dd4bf" fontWeight="900">15L</text>
                            <path d="M160 88 Q134 80 104 86 Q86 90 76 108" fill="none" stroke="#475569" strokeWidth="5" strokeLinecap="round"/>
                            <path d="M160 88 Q134 80 104 86 Q86 90 76 108" fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round"/>
                            <path d="M36 132 Q36 114 68 108 Q100 104 104 114 L106 210 Q106 224 70 226 Q34 224 34 210Z" fill="url(#bdR2)" filter="url(#shR2)"/>
                            <circle cx="70" cy="86" r="26" fill="url(#skR2)" filter="url(#shR2)"/>
                            <path d="M50 73 Q70 63 90 73" fill="#3d2b1f"/>
                            <path d="M50 92 Q70 84 90 92 Q96 106 90 120 Q70 128 50 120 Q44 106 50 92Z" fill="rgba(45,212,191,0.2)" stroke="#2dd4bf" strokeWidth="2"/>
                            <circle cx="112" cy="88" r="4" fill="#2dd4bf" style={{animation:'o2Flow 1.4s infinite'}}/>
                            <circle cx="124" cy="85" r="3" fill="#2dd4bf" style={{animation:'o2Flow 1.4s 0.3s infinite'}}/>
                            <circle cx="104" cy="96" r="3" fill="#2dd4bf" style={{animation:'o2Flow 1.4s 0.6s infinite'}}/>
                            <rect x="14" y="38" width="74" height="50" rx="6" fill="#0a1628" stroke="rgba(45,212,191,0.5)" strokeWidth="1.2"/>
                            <text x="51" y="50" textAnchor="middle" fontSize="7" fill="#2dd4bf" fontWeight="800" letterSpacing="0.5">OXYGEN MASK</text>
                            <text x="51" y="62" textAnchor="middle" fontSize="7" fill="#94a3b8">10~15L/분</text>
                            <text x="51" y="73" textAnchor="middle" fontSize="7" fill="#94a3b8">비재호흡 마스크</text>
                            <line x1="88" y1="62" x2="60" y2="100" stroke="rgba(45,212,191,0.3)" strokeWidth="1" strokeDasharray="3,2"/>
                          </svg>
                        )
                        // RESPIRATORY 3
                        if (activeEmergencyGuide === 'RESPIRATORY' && activeStep === 3) return (
                          <svg viewBox={vb} {...S}>
                            <defs>
                              <linearGradient id="skR3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fde8c8"/><stop offset="60%" stopColor="#f0b07a"/><stop offset="100%" stopColor="#c47d45"/></linearGradient>
                              <linearGradient id="ihR3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#3730a3"/></linearGradient>
                              <linearGradient id="glR3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#1d4ed8"/></linearGradient>
                              <filter id="shR3"><feDropShadow dx="1" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.4"/></filter>
                            </defs>
                            <ellipse cx="120" cy="248" rx="80" ry="8" fill="rgba(0,0,0,0.18)"/>
                            <rect x="82" y="36" width="76" height="120" rx="24" fill="url(#ihR3)" filter="url(#shR3)"/>
                            <rect x="87" y="41" width="66" height="110" rx="20" fill="#6366f1"/>
                            <rect x="92" y="24" width="56" height="20" rx="10" fill="#4338ca"/>
                            <rect x="100" y="18" width="40" height="12" rx="6" fill="#818cf8"/>
                            <rect x="94" y="58" width="52" height="64" rx="8" fill="rgba(255,255,255,0.08)"/>
                            <text x="120" y="74" textAnchor="middle" fontSize="8" fill="#c7d2fe" fontWeight="700">BRONCHO</text>
                            <text x="120" y="86" textAnchor="middle" fontSize="8" fill="#c7d2fe" fontWeight="700">DILATOR</text>
                            <path d="M104 108 Q100 96 108 90 Q120 86 132 90 Q140 96 136 108 Q130 118 120 120 Q110 118 104 108Z" fill="rgba(129,140,248,0.25)" stroke="#818cf8" strokeWidth="1.2" style={{animation:'lungExpand 2s infinite'}}/>
                            <rect x="94" y="152" width="52" height="26" rx="10" fill="#312e81" filter="url(#shR3)"/>
                            <rect x="102" y="158" width="36" height="14" rx="6" fill="#1e1b4b"/>
                            <circle cx="120" cy="182" r="5" fill="#a5b4fc" style={{animation:'spray 0.9s infinite'}}/>
                            <circle cx="107" cy="190" r="4" fill="#a5b4fc" style={{animation:'spray 0.9s 0.15s infinite'}}/>
                            <circle cx="133" cy="190" r="4" fill="#a5b4fc" style={{animation:'spray 0.9s 0.3s infinite'}}/>
                            <circle cx="112" cy="200" r="3.5" fill="#818cf8" style={{animation:'spray 0.9s 0.45s infinite'}}/>
                            <circle cx="128" cy="201" r="3.5" fill="#818cf8" style={{animation:'spray 0.9s 0.6s infinite'}}/>
                            <path d="M82 110 Q66 116 56 132 Q58 146 70 148 Q84 140 88 126Z" fill="url(#glR3)" filter="url(#shR3)"/>
                            <path d="M158 110 Q174 116 184 132 Q182 146 170 148 Q156 140 152 126Z" fill="url(#glR3)" filter="url(#shR3)"/>
                            <rect x="14" y="40" width="74" height="56" rx="6" fill="#0a1628" stroke="rgba(129,140,248,0.5)" strokeWidth="1.2"/>
                            <text x="51" y="52" textAnchor="middle" fontSize="7" fill="#818cf8" fontWeight="800" letterSpacing="0.5">INHALER ASSIST</text>
                            <text x="51" y="64" textAnchor="middle" fontSize="7" fill="#94a3b8">천식·COPD 병력 확인</text>
                            <text x="51" y="75" textAnchor="middle" fontSize="7" fill="#94a3b8">흡입 보조 · 심호흡 유도</text>
                            <line x1="88" y1="66" x2="90" y2="110" stroke="rgba(129,140,248,0.3)" strokeWidth="1" strokeDasharray="3,2"/>
                          </svg>
                        )
                        return null`;

const before = lines.slice(0, startLine).join('\n');
const after = lines.slice(endLine).join('\n');
const result = before + '\n' + newCode + '\n' + after;
writeFileSync(file, result, 'utf8');
console.log('Done. Total lines:', result.split('\n').length);

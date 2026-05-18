export default function MdtsLogo({ size = 36 }) {
  const sw = Math.max(1.8, size * 0.056)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 52"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <linearGradient id="mdts-lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#39ff6a" />
          <stop offset="50%"  stopColor="#00ffcc" />
          <stop offset="100%" stopColor="#00e5ff" />
        </linearGradient>
        <filter id="mdts-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <g filter="url(#mdts-glow)">
        {/* 앵커 링 (샤클) */}
        <circle cx="22" cy="6.5" r="4.2" stroke="url(#mdts-lg)" strokeWidth={sw} />

        {/* 링 → 스톡 연결 샤프트 */}
        <line x1="22" y1="10.7" x2="22" y2="16" stroke="url(#mdts-lg)" strokeWidth={sw} />

        {/* 의료 크로스 수평선 (스톡 역할 겸) */}
        <line x1="7" y1="21" x2="37" y2="21" stroke="url(#mdts-lg)" strokeWidth={sw} />

        {/* 메인 샤프트 (수직, 크로스 세로선) */}
        <line x1="22" y1="16" x2="22" y2="44.5" stroke="url(#mdts-lg)" strokeWidth={sw} />

        {/* 좌측 플루크 */}
        <path
          d="M22,44.5 C16,43.5 7,40.5 6,46"
          stroke="url(#mdts-lg)"
          strokeWidth={sw}
          fill="none"
        />

        {/* 우측 플루크 */}
        <path
          d="M22,44.5 C28,43.5 37,40.5 38,46"
          stroke="url(#mdts-lg)"
          strokeWidth={sw}
          fill="none"
        />

        {/* 크라운 (바텀 호) */}
        <path
          d="M18.5,44.5 Q22,49.5 25.5,44.5"
          stroke="url(#mdts-lg)"
          strokeWidth={sw}
          fill="none"
        />
      </g>
    </svg>
  )
}

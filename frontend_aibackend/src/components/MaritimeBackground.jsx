import shipImg from '../assets/hero.png'

export default function MaritimeBackground() {
  return (
    <div className="maritime-bg">
      {/* Grid overlay */}
      <svg className="maritime-grid" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="mgrid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(13,217,197,0.07)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mgrid)" />
      </svg>

      {/* Radar rings — elliptical for perspective feel */}
      <div className="maritime-radar-wrap">
        <svg className="maritime-radar-svg" viewBox="0 0 900 420" xmlns="http://www.w3.org/2000/svg">
          {/* Outer rings */}
          <ellipse cx="450" cy="210" rx="440" ry="200" fill="none" stroke="rgba(13,217,197,0.12)" strokeWidth="1" />
          <ellipse cx="450" cy="210" rx="360" ry="162" fill="none" stroke="rgba(13,217,197,0.18)" strokeWidth="1" />
          <ellipse cx="450" cy="210" rx="280" ry="126" fill="none" stroke="rgba(13,217,197,0.25)" strokeWidth="1" />
          <ellipse cx="450" cy="210" rx="200" ry="90"  fill="none" stroke="rgba(13,217,197,0.35)" strokeWidth="1.2" />
          <ellipse cx="450" cy="210" rx="120" ry="54"  fill="none" stroke="rgba(13,217,197,0.45)" strokeWidth="1.5" />

          {/* Cross-hair lines */}
          <line x1="450" y1="10"  x2="450" y2="410" stroke="rgba(13,217,197,0.08)" strokeWidth="0.5" />
          <line x1="10"  y1="210" x2="890" y2="210" stroke="rgba(13,217,197,0.08)" strokeWidth="0.5" />
          <line x1="130" y1="60"  x2="770" y2="360" stroke="rgba(13,217,197,0.04)" strokeWidth="0.5" />
          <line x1="770" y1="60"  x2="130" y2="360" stroke="rgba(13,217,197,0.04)" strokeWidth="0.5" />

          {/* Inner glow ring */}
          <ellipse cx="450" cy="210" rx="120" ry="54" fill="none"
            stroke="rgba(13,217,197,0.6)" strokeWidth="1.5"
            filter="url(#glow)" />

          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>
      </div>

      {/* Pulse ring animation */}
      <div className="maritime-pulse-wrap">
        <div className="maritime-pulse r1" />
        <div className="maritime-pulse r2" />
        <div className="maritime-pulse r3" />
      </div>

      {/* Bottom glow (water/ship glow) */}
      <div className="maritime-glow-bottom" />

      {/* Ship image */}
      <div className="maritime-ship-wrap">
        <img src={shipImg} alt="ship" className="maritime-ship-img" />
        <div className="maritime-ship-glow" />
      </div>

      {/* Top vignette */}
      <div className="maritime-vignette" />
    </div>
  )
}

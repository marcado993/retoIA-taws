// Gauge semicircular estilo "credit score" de la referencia.
// Muestra el puntaje de riesgo 0-100 con arco degradado rojo→verde.
export default function Gauge({ score, label }) {
  const cx = 130, cy = 125, r = 95
  const angle = Math.PI * (1 - score / 100) // 180° = 0, 0° = 100
  const dotX = cx + r * Math.cos(angle)
  const dotY = cy - r * Math.sin(angle)

  const arc = (startPct, endPct) => {
    const a1 = Math.PI * (1 - startPct / 100)
    const a2 = Math.PI * (1 - endPct / 100)
    const x1 = cx + r * Math.cos(a1), y1 = cy - r * Math.sin(a1)
    const x2 = cx + r * Math.cos(a2), y2 = cy - r * Math.sin(a2)
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`
  }

  return (
    <svg viewBox="0 0 260 150" className="gauge">
      <defs>
        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="45%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#84cc16" />
        </linearGradient>
      </defs>
      <path d={arc(0, 100)} fill="none" stroke="#e7e5df" strokeWidth="14"
        strokeLinecap="round" strokeDasharray="2 7" />
      <path d={arc(0, Math.max(score, 3))} fill="none" stroke="url(#gaugeGrad)"
        strokeWidth="14" strokeLinecap="round" strokeDasharray="2 7" />
      <circle cx={dotX} cy={dotY} r="9" fill="#fff" stroke="#84cc16" strokeWidth="4" />
      <text x="30" y="145" className="gauge-tick">0</text>
      <text x="215" y="145" className="gauge-tick">100</text>
      <text x={cx} y={cy - 12} textAnchor="middle" className="gauge-score"
        data-testid="gauge-score">{score}</text>
      {label && <text x={cx} y={cy + 12} textAnchor="middle" className="gauge-label">{label}</text>}
    </svg>
  )
}

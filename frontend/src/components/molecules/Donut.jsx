import { useState } from 'react'

export const PALETTE = ['#84cc16', '#22c55e', '#facc15', '#fb923c', '#2dd4bf', '#a8a29e']

// Donut de asignación de activos, con hueco central para el dato principal.
// size 'md' (180px, tarjeta de propuesta) | 'sm' (mini, tarjetas comparativas de portafolio).
// Interactivo (spec §2): al pasar el ratón sobre un segmento se resalta y el centro
// revela el ticker y su % exacto, evitando etiquetas superpuestas sobre el gráfico.
export default function Donut({ allocation, centerTop, centerBottom, size = 'md' }) {
  const cx = 90, cy = 90, r = 70, width = size === 'sm' ? 26 : 22
  const [hover, setHover] = useState(null)
  let acc = 0
  const total = allocation.reduce((s, a) => s + a.weight, 0) || 100

  const segments = allocation.map((a, i) => {
    const start = (acc / total) * 2 * Math.PI - Math.PI / 2
    acc += a.weight
    const end = (acc / total) * 2 * Math.PI - Math.PI / 2
    const large = end - start > Math.PI ? 1 : 0
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end)
    const active = hover === i
    return (
      <path key={a.ticker}
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
        fill="none" stroke={PALETTE[i % PALETTE.length]}
        strokeWidth={active ? width + 6 : width}
        strokeLinecap="butt"
        className="donut-seg"
        opacity={hover === null || active ? 1 : 0.45}
        onMouseEnter={() => setHover(i)}
        onMouseLeave={() => setHover(null)}
        onFocus={() => setHover(i)}
        onBlur={() => setHover(null)}
        tabIndex={0}
        role="img"
        aria-label={`${a.name || a.ticker}: ${a.weight}%`}>
        <title>{`${a.ticker} — ${a.weight}%`}</title>
      </path>
    )
  })

  const h = hover !== null ? allocation[hover] : null

  return (
    <svg viewBox="0 0 180 180" className={`donut ${size === 'sm' ? 'donut-sm' : ''}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0efe9" strokeWidth={width} />
      {segments}
      {h ? (
        <>
          <text x={cx} y={cy - 4} textAnchor="middle" className="donut-top">{h.weight}%</text>
          <text x={cx} y={cy + 16} textAnchor="middle" className="donut-bottom">{h.ticker}</text>
        </>
      ) : (
        <>
          {centerTop && <text x={cx} y={cy - 4} textAnchor="middle" className="donut-top">{centerTop}</text>}
          {centerBottom && <text x={cx} y={cy + 16} textAnchor="middle" className="donut-bottom">{centerBottom}</text>}
        </>
      )}
    </svg>
  )
}

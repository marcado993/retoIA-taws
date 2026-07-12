// Mini gráfico de tendencia por instrumento — alimentado con cierres reales de
// Yahoo Finance (backend/app/market_data.py), no datos inventados. Si no hay
// suficiente historial (fallback offline con pocos puntos) se omite en silencio.
export default function MiniTrendLine({ history, up, width = 56, height = 22 }) {
  if (!history || history.length < 2) return <span className="mini-trend-empty" />

  const lo = Math.min(...history), hi = Math.max(...history)
  const range = hi - lo || 1
  const step = width / (history.length - 1)
  const points = history
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - lo) / range) * height).toFixed(1)}`)
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="mini-trend"
      role="img" aria-label={up ? 'Tendencia al alza' : 'Tendencia a la baja'}>
      <polyline points={points} fill="none" stroke={up ? '#10B981' : '#f87171'}
        strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

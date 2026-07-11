export const CLASS_COLORS = {
  'Efectivo y equivalentes': '#d6d3d1',
  'Renta fija (bonos)': '#fcd34d',
  'Renta variable EE.UU.': '#a3e635',
  'Renta variable internacional': '#4ade80',
  'Bienes raíces (REITs)': '#fdba74',
  'Alternativos (oro)': '#5eead4',
}

// Partición binaria ponderada: divide el rectángulo por el eje más largo
// hasta llegar a un tile por instrumento.
function layout(items, x, y, w, h) {
  if (items.length === 0) return []
  if (items.length === 1) return [{ ...items[0], x, y, w, h }]
  const total = items.reduce((s, i) => s + i.weight, 0)
  let acc = 0, split = 1
  for (let i = 0; i < items.length - 1; i++) {
    acc += items[i].weight
    split = i + 1
    if (acc >= total / 2) break
  }
  const a = items.slice(0, split)
  const b = items.slice(split)
  const fa = a.reduce((s, i) => s + i.weight, 0) / total
  return w >= h
    ? [...layout(a, x, y, w * fa, h), ...layout(b, x + w * fa, y, w * (1 - fa), h)]
    : [...layout(a, x, y, w, h * fa), ...layout(b, x, y + h * fa, w, h * (1 - fa))]
}

// HU2: mapa de árbol de la asignación — tamaño = peso, color = clase de activo.
export default function Treemap({ allocation }) {
  const items = [...allocation].sort((a, b) => b.weight - a.weight)
  const tiles = layout(items, 0, 0, 420, 230)
  const classes = [...new Set(items.map(i => i.asset_class))]

  return (
    <div data-testid="treemap">
      <svg viewBox="0 0 420 230" className="treemap">
        {tiles.map(t => (
          // Interactivo (spec §2): cada tile revela nombre · clase · % exacto al
          // pasar el ratón (<title> nativo, también leído por lectores de pantalla),
          // así los tiles chicos sin etiqueta visible siguen siendo consultables.
          <g key={t.ticker} className="tm-tile" tabIndex={0}
            role="img" aria-label={`${t.ticker} ${t.name}: ${t.weight}% · ${t.asset_class}`}>
            <title>{`${t.ticker} · ${t.name} — ${t.weight}% · ${t.asset_class}`}</title>
            <rect x={t.x + 2} y={t.y + 2} width={Math.max(t.w - 4, 1)} height={Math.max(t.h - 4, 1)}
              rx="10" fill={CLASS_COLORS[t.asset_class] || '#e7e5df'} />
            {t.w > 58 && t.h > 44 && (
              <>
                <text x={t.x + 12} y={t.y + 24} className="tm-ticker">{t.ticker}</text>
                <text x={t.x + 12} y={t.y + 42} className="tm-weight">{t.weight}%</text>
              </>
            )}
          </g>
        ))}
      </svg>
      <div className="tm-legend">
        {classes.map(c => (
          <span key={c} className="tm-legend-item">
            <span className="alloc-dot" style={{ background: CLASS_COLORS[c] }} />{c}
          </span>
        ))}
      </div>
    </div>
  )
}

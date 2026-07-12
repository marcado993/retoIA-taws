'use client'

// Cono de incertidumbre (Fan Chart): proyección de inversión a lo largo del tiempo.
// La franja sombreada representa el rango pesimista→optimista y la línea central el
// escenario esperado. Minimalista, al estilo de robo-advisors modernos.
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

const BRAND = '#10B981'        // verde principal (franja)
const BRAND_DARK = '#047857'   // verde oscuro (línea central esperada)

const usd = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n ?? 0)

// Ticks del eje Y compactos ($10k, $1.2M…) para no saturar.
const usdCompact = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1,
  }).format(n ?? 0)

// Tooltip que muestra los tres escenarios formateados como moneda.
function FanTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const rows = [
    ['Optimista', d.optimistic, 'text-brand-green'],
    ['Esperado', d.expected, 'text-brand-ink font-semibold'],
    ['Pesimista', d.pessimistic, 'text-gray-500'],
  ]
  return (
    <div className="rounded-lg border border-brand-border bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
      <ul className="space-y-0.5 text-sm">
        {rows.map(([name, value, cls]) => (
          <li key={name} className="flex items-center justify-between gap-4">
            <span className="text-gray-600">{name}</span>
            <span className={`tabular-nums ${cls}`}>{usd(value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function FanChart({ data = [] }) {
  // Recharts pinta una banda cuando el dataKey del Area es un par [min, max].
  const series = data.map(d => ({ ...d, band: [d.pessimistic, d.optimistic] }))

  return (
    <div className="w-full h-64 rounded-2xl bg-white p-2">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={series} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="fanGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND} stopOpacity={0.22} />
              <stop offset="100%" stopColor={BRAND} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#64748B' }}
            dy={6}
          />
          <YAxis
            width={52}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#64748B' }}
            tickFormatter={usdCompact}
          />
          <Tooltip content={<FanTooltip />} cursor={{ stroke: '#CBD5E1', strokeDasharray: '4 4' }} />

          {/* Franja de incertidumbre: pesimista → optimista, sin bordes fuertes. */}
          <Area
            type="monotone"
            dataKey="band"
            stroke="none"
            fill="url(#fanGradient)"
            isAnimationActive={false}
            activeDot={false}
          />

          {/* Tendencia central: escenario esperado, sólida y más gruesa. */}
          <Line
            type="monotone"
            dataKey="expected"
            stroke={BRAND_DARK}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: BRAND_DARK }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

'use client'

// Estadísticas del asesor: resumen de su cartera de asesorados.
// · Contadores por estado (pendiente / aprobada / rechazada) con color semántico.
// · Gráfico de barras (Recharts) con la distribución por perfil de riesgo, con hover
//   que revela el número exacto de asesorados por perfil.
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, LabelList,
} from 'recharts'

const PROFILE_ORDER = ['Conservador', 'Moderado', 'Agresivo']
const PROFILE_COLOR = {
  Conservador: '#93C5FD',
  Moderado: '#3B82F6',
  Agresivo: '#1D4ED8',
}

function StatsTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { profile, clientes } = payload[0].payload
  return (
    <div className="rounded-lg border border-brand-border bg-white px-3 py-1.5 shadow-md text-sm">
      <span className="font-semibold text-brand-ink">{profile}</span>
      <span className="text-gray-500">: {clientes} asesorado{clientes === 1 ? '' : 's'}</span>
    </div>
  )
}

export default function AdvisorStats({ proposals = [] }) {
  const count = (pred) => proposals.filter(pred).length
  const pendientes = count(p => p.status === 'pendiente')
  const aprobadas = count(p => p.status === 'aprobada' || p.status === 'aprobada_con_cambios')
  const rechazadas = count(p => p.status === 'rechazada')

  const byProfile = PROFILE_ORDER.map(label => ({
    profile: label,
    clientes: count(p => p.profile_result?.profile?.label === label),
  }))
  const maxClientes = Math.max(1, ...byProfile.map(d => d.clientes))

  const tiles = [
    { key: 'pendiente', label: 'Pendientes', value: pendientes },
    { key: 'aprobada', label: 'Aprobadas', value: aprobadas },
    { key: 'rechazada', label: 'Rechazadas', value: rechazadas },
  ]

  return (
    <div className="card advisor-stats-card">
      <div className="card-head">
        <h3>Panorama de tus asesorados</h3>
        <span className="chip chip-neutral">{proposals.length} en total</span>
      </div>
      <div className="advisor-stats-grid">
        <div className="advisor-stat-tiles">
          {tiles.map(t => (
            <div key={t.key} className={`advisor-stat-tile t-${t.key}`}>
              <span className="advisor-stat-num">{t.value}</span>
              <span className="advisor-stat-lbl">{t.label}</span>
            </div>
          ))}
        </div>

        <div>
          <p className="advisor-chart-title">Asesorados por perfil de riesgo</p>
          <div className="advisor-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byProfile} margin={{ top: 16, right: 8, bottom: 0, left: 8 }}>
                <XAxis dataKey="profile" tickLine={false} axisLine={false}
                  tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis hide domain={[0, maxClientes]} />
                <Tooltip content={<StatsTooltip />} cursor={{ fill: 'rgba(37,99,235,0.06)' }} />
                <Bar dataKey="clientes" radius={[6, 6, 0, 0]} maxBarSize={64}
                  isAnimationActive={false}>
                  {byProfile.map(d => (
                    <Cell key={d.profile} fill={PROFILE_COLOR[d.profile]} />
                  ))}
                  <LabelList dataKey="clientes" position="top"
                    style={{ fontSize: 13, fontWeight: 800, fill: '#0F172A' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

// Carga esquelética (spec §4): mientras el Agente de Inversiones IA construye la
// propuesta, mostramos un esqueleto que imita la estructura final (big numbers +
// gráfico + métricas) en lugar de un spinner genérico. Da la sensación de que el
// sistema está armando activamente el resultado y reduce la ansiedad de latencia.
// WCAG 4.1.3: role=status + aria-live para anunciar el estado de carga.
export default function ProposalSkeleton() {
  return (
    <div className="card skeleton-card" role="status" aria-live="polite"
      data-testid="proposal-skeleton" aria-label="Generando tu propuesta de portafolio">
      <div className="card-head">
        <div className="sk sk-line" style={{ width: 180, height: 16 }} />
        <div className="sk sk-pill" />
      </div>

      <p className="skeleton-caption">El Agente de Inversiones IA está construyendo tu propuesta…</p>

      {/* Big numbers */}
      <div className="big-numbers">
        {[0, 1, 2].map(i => (
          <div key={i} className="big-number">
            <div className="sk sk-line" style={{ width: 70, height: 10 }} />
            <div className="sk sk-line" style={{ width: 90, height: 26, margin: '8px 0' }} />
            <div className="sk sk-line" style={{ width: 60, height: 10 }} />
          </div>
        ))}
      </div>

      {/* Gráfico (treemap) */}
      <div className="sk sk-block" style={{ height: 230, borderRadius: 12, margin: '16px 0' }} />

      {/* Métricas */}
      <div className="metric-row">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="sk sk-block" style={{ height: 64, borderRadius: 12 }} />
        ))}
      </div>

      {/* Explicación */}
      <div className="sk sk-line" style={{ width: '100%', height: 12, marginTop: 16 }} />
      <div className="sk sk-line" style={{ width: '85%', height: 12, marginTop: 8 }} />
      <div className="sk sk-line" style={{ width: '60%', height: 12, marginTop: 8 }} />
    </div>
  )
}

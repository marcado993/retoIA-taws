// Skeleton del Análisis de Mercado (pestaña "Diagnóstico de Riesgo"): imita la
// estructura final (resumen + grid de 2 columnas con alertas a la izquierda y
// contexto/noticias a la derecha) en vez de un spinner genérico — mismo patrón
// que ProposalSkeleton / AdvisorDetailSkeleton. WCAG 4.1.3: role=status + aria-live.
export default function AiInsightSkeleton() {
  return (
    <div role="status" aria-live="polite" data-testid="ai-insight-skeleton"
      aria-label="Analizando noticias y cotizaciones">
      <div className="sk sk-line" style={{ width: '92%', height: 14, marginBottom: 8 }} />
      <div className="sk sk-line" style={{ width: '68%', height: 14, marginBottom: 18 }} />

      <div className="sk sk-block" style={{ height: 60, borderRadius: 12, marginBottom: 16 }} />

      <div className="ai-panel-grid">
        <div className="ai-panel-main">
          <div className="sk sk-block" style={{ height: 92, borderRadius: 12, marginBottom: 12 }} />
          <div className="sk sk-block" style={{ height: 92, borderRadius: 12, marginBottom: 12 }} />
          <div className="sk sk-block" style={{ height: 110, borderRadius: 12 }} />
        </div>
        <div className="ai-panel-side">
          <div className="sk sk-block" style={{ height: 64, borderRadius: 12, marginBottom: 12 }} />
          <div className="sk sk-block" style={{ height: 150, borderRadius: 12, marginBottom: 12 }} />
          <div className="sk sk-line" style={{ width: '100%', height: 12, marginBottom: 8 }} />
          <div className="sk sk-line" style={{ width: '75%', height: 12 }} />
        </div>
      </div>
    </div>
  )
}

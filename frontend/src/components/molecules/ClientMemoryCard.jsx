// Memoria del agente (continuidad de la conversación entre sesiones): si este
// cliente ya se diagnosticó antes, el agente lo recuerda — cifras leídas del
// historial guardado, nunca generadas por el LLM (100% verificable).
export default function ClientMemoryCard({ clientMemory }) {
  if (!clientMemory) return null
  const { previous_count, last_score, last_profile, score_delta, last_status } = clientMemory

  const trend = score_delta > 0 ? 'subió' : score_delta < 0 ? 'bajó' : 'se mantuvo'
  const trendIcon = score_delta > 0 ? '▲' : score_delta < 0 ? '▼' : '→'
  const statusLabel = {
    pendiente: 'seguía pendiente de revisión',
    aprobada: 'fue aprobada',
    aprobada_con_cambios: 'fue aprobada con cambios',
    rechazada: 'fue rechazada',
  }[last_status] || last_status

  return (
    <div className="client-memory" data-testid="client-memory-card">
      <div className="client-memory-head">
        <h4 className="client-memory-title">🧠 El agente te recuerda</h4>
        <span className="chip chip-neutral">Diagnóstico #{previous_count + 1}</span>
      </div>
      <p className="client-memory-text">
        Tu diagnóstico anterior dio <strong>{last_score}/100</strong> (perfil{' '}
        <strong>{last_profile}</strong>) y esa propuesta {statusLabel}. Esta vez tu puntaje{' '}
        <span className={score_delta > 0 ? 'price-up' : score_delta < 0 ? 'price-down' : ''}>
          {trend} {trendIcon} {score_delta !== 0 && `${Math.abs(score_delta)} puntos`}
        </span>.
      </p>
      <p className="client-memory-foot">
        Estas cifras vienen directo de tu historial guardado — no las genera un modelo de IA.
      </p>
    </div>
  )
}

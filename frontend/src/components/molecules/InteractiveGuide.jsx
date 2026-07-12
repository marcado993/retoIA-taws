export default function InteractiveGuide({ currentTab, setTab, record, proposals }) {
  // Encontrar si hay propuestas pendientes
  const pendingProposals = proposals?.filter(p => p.status === 'pendiente') ?? []
  const hasPending = pendingProposals.length > 0

  let stepTitle = ''
  let stepDesc = ''
  let actionLabel = ''
  let targetTab = ''
  let animationClass = 'pulse-glow-amber'

  if (!record) {
    stepTitle = 'Paso 1: Diagnóstico de Perfil de Riesgo'
    stepDesc = 'Comienza completando tu cuestionario de perfilamiento en Mi Plan Financiero para que los agentes de IA construyan tu propuesta de portafolio.'
    actionLabel = 'Ir al Formulario'
    targetTab = 'dashboard'
  } else if (record && record.status === 'pendiente') {
    stepTitle = 'Paso 2: Aprobación del Asesor (HITL Loop)'
    stepDesc = 'La propuesta se generó en estado "Pendiente". Cambia a "Asistente Financiero" en la barra superior para auditar, ajustar pesos si es necesario, y aprobar o rechazar.'
    actionLabel = 'Ir al Panel Asesor'
    targetTab = 'asesor'
  } else if (record && (record.status === 'aprobada' || record.status === 'aprobada_con_cambios')) {
    stepTitle = 'Paso 3: Consulta el Historial de Auditoría'
    stepDesc = '¡Felicidades! La propuesta ha sido firmada y registrada inmutablemente. Explora el log de auditoría para verificar la trazabilidad.'
    actionLabel = 'Ver Auditoría'
    targetTab = 'auditoria'
  } else {
    stepTitle = 'Proceso Completado'
    stepDesc = 'Puedes repetir el diagnóstico o explorar las reglas de cumplimiento que rigen el sistema.'
    actionLabel = 'Ver Reglas'
    targetTab = 'reglas'
  }

  return (
    <div className="interactive-guide-banner" data-testid="interactive-guide">
      <div className="guide-indicator-badge">
        <span className="live-dot" /> GUÍA INTERACTIVA
      </div>
      <div className="guide-text-content">
        <h4 className="guide-title">{stepTitle}</h4>
        <p className="guide-desc">{stepDesc}</p>
      </div>
      {currentTab !== targetTab && (
        <button 
          className={`guide-action-btn ${animationClass}`}
          onClick={() => setTab(targetTab)}
          aria-label={`Ir a pestaña ${targetTab}`}
        >
          {actionLabel} →
        </button>
      )}
    </div>
  )
}

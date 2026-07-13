import { useEffect, useState } from 'react'
import Button from '../atoms/Button.jsx'
import ErrorText from '../atoms/ErrorText.jsx'
import DashboardTemplate from '../templates/DashboardTemplate.jsx'
import LandingTemplate from '../templates/LandingTemplate.jsx'
import QuestionnaireCard from '../organisms/QuestionnaireCard.jsx'
import BreakdownCard from '../organisms/BreakdownCard.jsx'
import ProposalCard from '../organisms/ProposalCard.jsx'
import ProposalSkeleton from '../molecules/ProposalSkeleton.jsx'
import HeroPanel from '../organisms/HeroPanel.jsx'
import StatGrid from '../organisms/StatGrid.jsx'
import Modal from '../organisms/Modal.jsx'

// El diagnóstico vive en un modal (no en la página): así la página de fondo
// nunca pierde su scroll/contexto ("momentum") y cerrar el modal siempre te
// regresa a donde estabas — ya no hay callejón sin salida al empezar el test.
export default function DashboardPage({ questionnaire, record, market, catalog, loading, error, onSubmit, onReset, onRegenerate, onConfirm, onSeeRules }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [initialAnswers, setInitialAnswers] = useState({})
  const [showLanding, setShowLanding] = useState(false)
  const pr = record?.profile_result

  const beginWith = (answers = {}) => { setInitialAnswers(answers); setModalOpen(true) }

  // Una vez que la propuesta llega, el modal se cierra solo — sin esperar a que
  // el usuario adivine que ya terminó.
  useEffect(() => {
    if (record) setModalOpen(false)
  }, [record])

  const isDraft = record?.status === 'borrador'

  const steps = [
    { day: 'Paso 1', text: 'Completa tu diagnóstico de objetivo, horizonte y riesgo', done: !!record },
    { day: 'Paso 2', text: 'Revisa la propuesta y confirma la que quieres enviar', done: !!record && !isDraft },
    { day: 'Paso 3', text: 'Un asesor autorizado aprueba, edita o rechaza', done: !!record && !isDraft && record.status !== 'pendiente' },
  ]

  const questionnaireModal = (
    <Modal open={modalOpen} title="Diagnóstico de perfil" onClose={() => setModalOpen(false)}>
      {loading
        ? <ProposalSkeleton />
        : <QuestionnaireCard questionnaire={questionnaire} onSubmit={onSubmit}
            loading={loading} onSeeRules={onSeeRules} initialAnswers={initialAnswers} />}
    </Modal>
  )

  // Sin propuesta activa: landing siempre visible de fondo — el diagnóstico
  // se abre encima, sin reemplazar la página. Con un plan ya activo, el mismo
  // landing se puede pedir explícitamente con "← Volver al inicio" (botón en
  // el dashboard) — y desde ahí siempre hay camino de vuelta al plan, nunca
  // un callejón sin salida.
  if (!record || showLanding) {
    return (
      <>
        <LandingTemplate
          rulesVersion={questionnaire.rules_version}
          catalogSize={catalog?.instruments?.length ?? '—'}
          market={market}
          catalog={catalog}
          onStart={() => beginWith()}
          onSelectGoal={(objetivo) => beginWith({ objetivo })}
          onBackToPlan={record ? () => setShowLanding(false) : undefined}
        />
        {questionnaireModal}
      </>
    )
  }

  return (
    <>
      <DashboardTemplate
        steps={steps}
        header={<ErrorText>{error}</ErrorText>}
        left={
          <>
            <BreakdownCard profileResult={pr} />
            {/* Visibilidad del sistema (Nielsen H1): mientras la propuesta es un
                borrador, el cliente sabe que TODAVÍA no se envió a nadie — y puede
                pedir otra candidata (misma info guardada) o confirmar esta. */}
            {isDraft && (
              <div className="draft-banner" data-testid="draft-banner">
                <p className="draft-banner-text">
                  {loading
                    ? <><strong>Generando otra propuesta…</strong> el Agente de Inversiones IA está recalculando con tus mismos datos.</>
                    : <><strong>Vista previa:</strong> esta propuesta aún no se envió al
                      asesor. Puedes generar otra opción con los mismos datos o
                      confirmar esta para enviarla a revisión.</>}
                </p>
                <div className="btn-row">
                  <Button variant="ghost" data-testid="regenerate-btn" disabled={loading}
                    onClick={onRegenerate}>
                    {loading ? 'Generando…' : '🔁 Generar otra propuesta'}
                  </Button>
                  <Button data-testid="confirm-proposal-btn" disabled={loading}
                    className={loading ? '' : 'btn-pulse'} onClick={onConfirm}>
                    ✓ Esta es la propuesta que quiero
                  </Button>
                </div>
              </div>
            )}
            {/* Mientras se regenera, se reemplaza la propuesta vieja por el esqueleto
                de carga — así queda claro que hay una nueva en camino en vez de que
                los números cambien de golpe sin aviso (visibilidad del sistema). */}
            {loading && isDraft ? <ProposalSkeleton /> : <ProposalCard record={record} market={market} />}
            <div className="btn-row">
              {/* Siempre disponible: un perfil puede cambiar con el tiempo, así que
                  nunca se cierra la puerta a un nuevo diagnóstico. */}
              <Button variant="ghost" data-testid="new-diagnosis-btn"
                onClick={() => { onReset(); beginWith() }}>
                ← Nuevo diagnóstico
              </Button>
              {/* Volver a la landing sin perder el plan activo (spec: navegación
                  sin callejón sin salida) — no descarta nada, solo cambia la vista. */}
              <Button variant="ghost" data-testid="back-to-home-btn"
                onClick={() => setShowLanding(true)}>
                ← Volver al inicio
              </Button>
            </div>
          </>
        }
        right={
          <>
            <HeroPanel clientName={record?.client_name} profileResult={pr} onSeeRules={onSeeRules} />
            <StatGrid record={record} />
          </>
        }
        singleColumn={false}
      />
      {questionnaireModal}
    </>
  )
}

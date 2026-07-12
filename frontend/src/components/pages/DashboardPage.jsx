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
export default function DashboardPage({ questionnaire, record, market, catalog, loading, error, onSubmit, onReset, onSeeRules }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [initialAnswers, setInitialAnswers] = useState({})
  const pr = record?.profile_result

  const beginWith = (answers = {}) => { setInitialAnswers(answers); setModalOpen(true) }

  // Una vez que la propuesta llega, el modal se cierra solo — sin esperar a que
  // el usuario adivine que ya terminó.
  useEffect(() => {
    if (record) setModalOpen(false)
  }, [record])

  const steps = [
    { day: 'Paso 1', text: 'Completa tu diagnóstico de objetivo, horizonte y riesgo', done: !!record },
    { day: 'Paso 2', text: 'Revisa tu propuesta explicable de portafolio', done: !!record },
    { day: 'Paso 3', text: 'Un asesor autorizado aprueba, edita o rechaza', done: !!record && record.status !== 'pendiente' },
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
  // se abre encima, sin reemplazar la página.
  if (!record) {
    return (
      <>
        <LandingTemplate
          rulesVersion={questionnaire.rules_version}
          catalogSize={catalog?.instruments?.length ?? '—'}
          market={market}
          catalog={catalog}
          onStart={() => beginWith()}
          onSelectGoal={(objetivo) => beginWith({ objetivo })}
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
            <ProposalCard record={record} market={market} />
            {/* Siempre disponible: un perfil puede cambiar con el tiempo, así que
                nunca se cierra la puerta a un nuevo diagnóstico. */}
            <Button variant="ghost" data-testid="new-diagnosis-btn"
              onClick={() => { onReset(); beginWith() }}>
              ← Nuevo diagnóstico
            </Button>
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

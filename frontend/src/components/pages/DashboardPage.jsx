import { useState } from 'react'
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

export default function DashboardPage({ questionnaire, record, market, catalog, loading, error, onSubmit, onReset, onSeeRules }) {
  const [started, setStarted] = useState(false)
  const [initialAnswers, setInitialAnswers] = useState({})
  const pr = record?.profile_result

  const beginWith = (answers = {}) => { setInitialAnswers(answers); setStarted(true) }

  // Landing (HU1, patrón Betterment): hero + pilares + casos de uso + confianza,
  // antes de mostrar el cuestionario. Se salta si ya hay una propuesta activa.
  if (!started && !record) {
    return (
      <LandingTemplate
        rulesVersion={questionnaire.rules_version}
        catalogSize={catalog?.instruments?.length ?? '—'}
        market={market}
        catalog={catalog}
        onStart={() => beginWith()}
        onSelectGoal={(objetivo) => beginWith({ objetivo })}
      />
    )
  }

  const steps = [
    { day: 'Paso 1', text: 'Completa tu diagnóstico de objetivo, horizonte y riesgo', done: !!record },
    { day: 'Paso 2', text: 'Revisa tu propuesta explicable de portafolio', done: !!record },
    { day: 'Paso 3', text: 'Un asesor autorizado aprueba, edita o rechaza', done: !!record && record.status !== 'pendiente' },
  ]

  return (
    <DashboardTemplate
      steps={steps}
      header={<ErrorText>{error}</ErrorText>}
      left={
        <>
          {!record
            ? (loading
                // Spec §4: al enviar el cuestionario, el esqueleto reemplaza al formulario
                // e imita la propuesta que se está generando (evita el spinner genérico).
                ? <ProposalSkeleton />
                : <QuestionnaireCard questionnaire={questionnaire} onSubmit={onSubmit}
                    loading={loading} onSeeRules={onSeeRules} initialAnswers={initialAnswers} />)
            : <>
                <BreakdownCard profileResult={pr} />
                <ProposalCard record={record} market={market} />
                <Button variant="ghost" onClick={() => { onReset(); setStarted(false) }}>
                  ← Nuevo diagnóstico
                </Button>
              </>}
        </>
      }
      right={
        <>
          <HeroPanel clientName={record?.client_name} profileResult={pr} onSeeRules={onSeeRules} />
          {record && <StatGrid record={record} />}
        </>
      }
      singleColumn={!record}
    />
  )
}

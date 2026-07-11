import SinglePanelTemplate from '../templates/SinglePanelTemplate.jsx'
import PortfolioComparison from '../organisms/PortfolioComparison.jsx'
import EmptyText from '../atoms/EmptyText.jsx'

// Equivalente a "Explore portfolio options" de Betterment: comparar antes de decidir.
export default function PortfoliosPage({ catalog, questionnaire }) {
  if (!catalog || !questionnaire) return <SinglePanelTemplate><EmptyText>Cargando catálogo…</EmptyText></SinglePanelTemplate>
  return (
    <SinglePanelTemplate>
      <h3 className="section-title">Explora los portafolios modelo</h3>
      <p className="section-sub">
        Así se ve cada perfil de riesgo antes de que completes el diagnóstico. Tu
        propuesta final puede variar según tus respuestas y las reglas de protección.
      </p>
      <PortfolioComparison catalog={catalog} profiles={questionnaire.profiles} />
    </SinglePanelTemplate>
  )
}

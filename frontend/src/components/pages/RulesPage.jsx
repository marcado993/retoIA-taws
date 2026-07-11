import SinglePanelTemplate from '../templates/SinglePanelTemplate.jsx'
import RulesCards from '../organisms/RulesCards.jsx'

export default function RulesPage({ questionnaire }) {
  return (
    <SinglePanelTemplate>
      <RulesCards questionnaire={questionnaire} />
    </SinglePanelTemplate>
  )
}

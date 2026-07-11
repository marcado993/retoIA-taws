import SinglePanelTemplate from '../templates/SinglePanelTemplate.jsx'
import AuditTable from '../organisms/AuditTable.jsx'

export default function AuditPage({ entries }) {
  return (
    <SinglePanelTemplate>
      <AuditTable entries={entries} />
    </SinglePanelTemplate>
  )
}

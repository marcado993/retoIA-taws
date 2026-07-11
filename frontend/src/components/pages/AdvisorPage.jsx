import { useState } from 'react'
import SinglePanelTemplate from '../templates/SinglePanelTemplate.jsx'
import AdvisorQueue from '../organisms/AdvisorQueue.jsx'
import AdvisorDetail from '../organisms/AdvisorDetail.jsx'

export default function AdvisorPage({ proposals, onDecide, error }) {
  const [selectedId, setSelectedId] = useState(null)
  const selected = proposals.find(p => p.id === selectedId)

  return (
    <SinglePanelTemplate>
      <div className="advisor-grid">
        <AdvisorQueue proposals={proposals} selectedId={selectedId} onSelect={setSelectedId} />
        {selected && (
          <AdvisorDetail key={selected.id} proposal={selected}
            onDecide={onDecide} error={error} />
        )}
      </div>
    </SinglePanelTemplate>
  )
}

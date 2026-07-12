import { useState } from 'react'
import SinglePanelTemplate from '../templates/SinglePanelTemplate.jsx'
import AdvisorQueue from '../organisms/AdvisorQueue.jsx'
import AdvisorDetail from '../organisms/AdvisorDetail.jsx'
import AdvisorStats from '../organisms/AdvisorStats.jsx'
import ApprovalHistory from '../organisms/ApprovalHistory.jsx'
import AdvisorDetailSkeleton from '../molecules/AdvisorDetailSkeleton.jsx'

export default function AdvisorPage({ proposals, onDecide, error }) {
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter] = useState('todas')
  const selected = proposals.find(p => p.id === selectedId)

  return (
    <SinglePanelTemplate>
      {/* Dashboard de casos: panorama + historial, antes de la revisión activa. */}
      {proposals.length > 0 && (
        <>
          <AdvisorStats proposals={proposals} />
          <ApprovalHistory proposals={proposals} />
        </>
      )}

      <div className="advisor-grid">
        <AdvisorQueue proposals={proposals} selectedId={selectedId} onSelect={setSelectedId}
          filter={filter} onFilter={setFilter} />
        {selected
          ? <AdvisorDetail key={selected.id} proposal={selected}
              onDecide={onDecide} error={error} />
          // Skeleton mientras el asesor no ha elegido ninguna revisión.
          : <AdvisorDetailSkeleton />}
      </div>
    </SinglePanelTemplate>
  )
}

import Chip from '../atoms/Chip.jsx'
import EmptyText from '../atoms/EmptyText.jsx'

// HU3: cada decisión queda registrada con fecha, versión de reglas y responsable.
export default function AuditTable({ entries }) {
  return (
    <div className="card">
      <div className="card-head"><h3>Registro de auditoría</h3>
        <Chip tone="neutral">{entries.length} eventos</Chip>
      </div>
      {entries.length === 0 && <EmptyText>Sin eventos todavía.</EmptyText>}
      <div className="table-wrap">
        <table className="audit-table" data-testid="audit-table">
          <thead>
            <tr><th>Fecha (local)</th><th>Acción</th><th>Responsable</th><th>Propuesta</th><th>Reglas</th><th>Detalle</th></tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id}>
                <td>{new Date(e.timestamp).toLocaleString()}</td>
                <td><Chip tone={e.action.includes('rechazada') ? 'red'
                  : e.action.includes('aprobada') ? 'green' : 'lime'}>{e.action.replaceAll('_', ' ')}</Chip></td>
                <td>{e.actor}</td>
                <td>#{e.proposal_id}</td>
                <td>v{e.rules_version}</td>
                <td className="audit-detail">{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

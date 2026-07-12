// Skeleton del panel de detalle del asesor cuando aún no ha elegido una revisión.
// Imita la estructura del resumen (perfil + justificación + asignación + acciones)
// e invita a seleccionar un caso de la cola, en vez de dejar un vacío desconcertante.
export default function AdvisorDetailSkeleton() {
  return (
    <div className="card" role="status" aria-live="polite"
      data-testid="advisor-detail-skeleton" aria-label="Selecciona una revisión de la cola">
      <div className="card-head">
        <div className="sk sk-line" style={{ width: 200, height: 16 }} />
        <div className="sk sk-pill" />
      </div>

      <div className="advisor-empty-hint">
        Selecciona una propuesta de la cola para revisarla, editarla o decidir.
      </div>

      {/* 1 · Perfil del cliente */}
      <div className="sk sk-line" style={{ width: 130, height: 10, margin: '12px 0 8px' }} />
      <div className="sk sk-line" style={{ width: '90%', height: 14 }} />

      {/* 2 · Justificación */}
      <div className="sk sk-line" style={{ width: 130, height: 10, margin: '18px 0 8px' }} />
      <div className="sk sk-line" style={{ width: '100%', height: 12 }} />
      <div className="sk sk-line" style={{ width: '80%', height: 12, marginTop: 6 }} />

      {/* 3 · Asignación */}
      <div className="sk sk-line" style={{ width: 180, height: 10, margin: '18px 0 10px' }} />
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="sk sk-line" style={{ width: '100%', height: 30, marginBottom: 8, borderRadius: 10 }} />
      ))}

      {/* Acciones */}
      <div className="btn-row" style={{ marginTop: 16 }}>
        <div className="sk sk-block" style={{ width: 96, height: 40, borderRadius: 8 }} />
        <div className="sk sk-block" style={{ width: 80, height: 40, borderRadius: 8 }} />
        <div className="sk sk-block" style={{ width: 96, height: 40, borderRadius: 8 }} />
      </div>
    </div>
  )
}

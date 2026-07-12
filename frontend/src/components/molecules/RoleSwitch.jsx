// Alterna entre las dos personas del sistema: el inversionista (solo ve
// estadísticas) y el asesor autorizado (puede aprobar, editar o rechazar).
// Es un flag de sesión, no autenticación real — coherente con el alcance de
// la demo, pero dejando claro en la UI quién tiene permiso de actuar.
const ROLES = [
  { id: 'cliente', label: 'Asistente Financiero IA' },
  { id: 'asesor', label: 'Asistente Financiero' },
]

export default function RoleSwitch({ role, onChange }) {
  return (
    <div className="role-switch" role="tablist" aria-label="Vista activa">
      {ROLES.map(r => (
        <button key={r.id} type="button" role="tab" aria-selected={role === r.id}
          data-testid={`role-${r.id}`}
          className={`role-switch-btn ${role === r.id ? 'active' : ''}`}
          onClick={() => onChange(r.id)}>
          {r.label}
        </button>
      ))}
    </div>
  )
}

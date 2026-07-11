// H1 visibilidad del estado del sistema: ¿el backend responde ahora mismo?
export default function StatusDot({ online }) {
  return (
    <span className={`status-dot ${online ? 'is-online' : 'is-offline'}`} data-testid="status-dot"
      title={online ? 'Backend conectado' : 'Sin conexión con el backend'}>
      <span className="status-dot-led" />
      {online ? 'En línea' : 'Reconectando…'}
    </span>
  )
}

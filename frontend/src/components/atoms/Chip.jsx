// Tonos disponibles: lime · green · yellow · red · neutral
export default function Chip({ tone = 'neutral', className = '', children, ...props }) {
  return (
    <span className={`chip chip-${tone} ${className}`.trim()} {...props}>
      {children}
    </span>
  )
}

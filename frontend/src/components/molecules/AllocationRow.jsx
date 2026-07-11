export default function AllocationRow({ name, subtitle, weight, color }) {
  return (
    <div className="alloc-row">
      {color && <span className="alloc-dot" style={{ background: color }} />}
      <span className="alloc-name">{name}
        {subtitle && <em>{subtitle}</em>}
      </span>
      <span className="alloc-weight">{weight}%</span>
    </div>
  )
}

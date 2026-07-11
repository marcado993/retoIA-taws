export default function IconTile({ icon, children }) {
  return (
    <span className="icon-tile">
      <span className="icon-tile-glyph">{icon}</span>{children}
    </span>
  )
}

// Termómetro de riesgo (bullet chart) construido solo con HTML + Tailwind.
// Muestra el score del inversionista sobre una barra segmentada por perfiles,
// con un marcador que se posiciona dinámicamente en `left: ${score}%`.
export default function RiskBulletChart({ score = 0, profileData }) {
  const ranges = profileData?.ranges ?? []
  // Clamp defensivo para que el marcador nunca se salga de la barra.
  const pos = Math.min(100, Math.max(0, score))

  // Cada segmento ocupa el ancho entre el tope anterior y su propio `max`.
  let prev = 0
  const segments = ranges.map((r) => {
    const width = Math.max(0, r.max - prev)
    prev = r.max
    return { ...r, width }
  })

  return (
    <div className="w-full">
      {/* Globo "Tu Perfil" que se mueve junto con el marcador. */}
      <div className="relative mb-2 h-8">
        <div
          className="absolute -translate-x-1/2 transition-all duration-500 ease-out"
          style={{ left: `${pos}%` }}
        >
          <span className="whitespace-nowrap rounded-md bg-brand-ink px-2.5 py-1 text-xs font-bold text-white shadow-sm">
            Tu Perfil: {profileData?.label}
          </span>
          {/* Punta del globo hacia el marcador */}
          <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-brand-ink" />
        </div>
      </div>

      {/* Barra segmentada + marcador superpuesto. */}
      <div className="relative">
        <div className="flex h-4 overflow-hidden rounded-full shadow-sm">
          {segments.map((s) => (
            <div
              key={s.label}
              className={s.color}
              style={{ width: `${s.width}%` }}
              title={`${s.label} (hasta ${s.max})`}
            />
          ))}
        </div>

        {/* Marcador: círculo oscuro con anillo blanco, centrado en el score. */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
          style={{ left: `${pos}%` }}
        >
          <span className="block h-5 w-5 rounded-full border-[3px] border-white bg-brand-ink shadow-md" />
        </div>
      </div>

      {/* Etiquetas de zona bajo la barra. */}
      <div className="mt-2 flex justify-between text-sm text-gray-600">
        {ranges.map((r) => (
          <span key={r.label}>{r.label}</span>
        ))}
      </div>
    </div>
  )
}

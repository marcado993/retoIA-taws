import StepsRow from '../organisms/StepsRow.jsx'

// Layout del dashboard: fila de pasos + grid de dos columnas (o columna única centrada)
export default function DashboardTemplate({ steps, header, left, right, singleColumn = false }) {
  if (singleColumn) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
        <StepsRow steps={steps} />
        {header}
        <div className="w-full">{left}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <StepsRow steps={steps} />
      {header}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 flex flex-col gap-6">{left}</div>
        <aside className="lg:col-span-4 flex flex-col gap-6">{right}</aside>
      </div>
    </div>
  )
}

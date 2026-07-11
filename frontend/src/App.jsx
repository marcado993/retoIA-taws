import { useEffect, useState } from 'react'
import { api } from './api.js'
import EmptyText from './components/atoms/EmptyText.jsx'
import TopBar from './components/organisms/TopBar.jsx'
import LegalFooter from './components/organisms/LegalFooter.jsx'
import DashboardPage from './components/pages/DashboardPage.jsx'
import AdvisorPage from './components/pages/AdvisorPage.jsx'
import AuditPage from './components/pages/AuditPage.jsx'
import RulesPage from './components/pages/RulesPage.jsx'
import PortfoliosPage from './components/pages/PortfoliosPage.jsx'

const TABS = [
  ['dashboard', 'Dashboard'],
  ['portafolios', 'Portafolios'],
  ['asesor', 'Panel Asesor'],
  ['auditoria', 'Auditoría'],
  ['reglas', 'Reglas'],
]

// Contenedor de estado global: datos de la API y routing de pestañas hacia pages.
export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [questionnaire, setQuestionnaire] = useState(null)
  const [catalog, setCatalog] = useState(null)
  const [record, setRecord] = useState(null)      // propuesta del cliente actual
  const [proposals, setProposals] = useState([])
  const [audit, setAudit] = useState([])
  const [market, setMarket] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = async () => {
    const [list, log] = await Promise.all([api.listProposals(), api.audit()])
    setProposals(list)
    setAudit(log)
    return list
  }

  useEffect(() => {
    api.questionnaire().then(setQuestionnaire).catch(e => setError(e.message))
    api.catalog().then(setCatalog).catch(() => {})
    api.market().then(setMarket).catch(() => {})
    refresh().catch(() => {})
  }, [])

  const submitProfile = async (clientName, answers) => {
    setLoading(true); setError('')
    try {
      const rec = await api.createProposal(clientName, answers)
      setRecord(rec)
      await refresh()
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const decide = async (id, payload) => {
    setError('')
    try {
      await api.decide(id, payload)
      const list = await refresh()
      if (record && record.id === id) setRecord(list.find(p => p.id === id))
      return true
    } catch (e) { setError(e.message); return false }
  }

  if (!questionnaire) {
    return <div className="page"><EmptyText>Conectando con el backend… {error}</EmptyText></div>
  }

  return (
    <div className="page">
      <TopBar tabs={TABS} active={tab} onChange={id => { setTab(id); setError('') }} />
      {tab === 'dashboard' && (
        <DashboardPage questionnaire={questionnaire} record={record}
          market={market} catalog={catalog} loading={loading} error={error}
          onSubmit={submitProfile} onReset={() => setRecord(null)}
          onSeeRules={() => setTab('reglas')} />
      )}
      {tab === 'portafolios' && <PortfoliosPage catalog={catalog} questionnaire={questionnaire} />}
      {tab === 'asesor' && <AdvisorPage proposals={proposals} onDecide={decide} error={error} />}
      {tab === 'auditoria' && <AuditPage entries={audit} />}
      {tab === 'reglas' && <RulesPage questionnaire={questionnaire} />}
      <LegalFooter />
    </div>
  )
}

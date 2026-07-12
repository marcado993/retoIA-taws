'use client'

// Next.js App Router — página raíz.
// Todo el estado global vive aquí (client component) igual que en App.jsx de Vite.
// WCAG 1.3.1: <main> con id "main-content" como destino del skip-link.
// WCAG 2.4.6: jerarquía de headings gestionada en cada sección.

import { useEffect, useState, useCallback, useRef } from 'react'
import { gsap } from 'gsap'
import { api } from '../src/api.js'
import EmptyText from '../src/components/atoms/EmptyText.jsx'
import TopBar from '../src/components/organisms/TopBar.jsx'
import LegalFooter from '../src/components/organisms/LegalFooter.jsx'
import DashboardPage from '../src/components/pages/DashboardPage.jsx'
import AdvisorPage from '../src/components/pages/AdvisorPage.jsx'
import AuditPage from '../src/components/pages/AuditPage.jsx'
import RulesPage from '../src/components/pages/RulesPage.jsx'
import PortfoliosPage from '../src/components/pages/PortfoliosPage.jsx'
import AiInsightPanel from '../src/components/organisms/AiInsightPanel.jsx'
import InteractiveGuide from '../src/components/molecules/InteractiveGuide.jsx'
import JuryDemoPanel from '../src/components/organisms/JuryDemoPanel.jsx'


const TABS = [
  ['dashboard',  'Dashboard'],
  ['analisis',   'Análisis IA'],
  ['portafolios','Portafolios'],
  ['asesor',     'Panel Asesor'],
  ['auditoria',  'Auditoría'],
  ['reglas',     'Reglas'],
]

export default function HomePage() {
  const [tab, setTab]               = useState('dashboard')
  const [tabTransitioning, setTabTransitioning] = useState(false)
  const [questionnaire, setQuestionnaire] = useState(null)
  const [catalog, setCatalog]       = useState(null)
  const [record, setRecord]         = useState(null)
  const [proposals, setProposals]   = useState([])
  const [audit, setAudit]           = useState([])
  const [market, setMarket]         = useState(null)
  const [news, setNews]             = useState([])
  const [insight, setInsight]       = useState(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  
  const contentRef = useRef(null)

  // Cambio de pestañas interactivo con animación y loader
  const changeTab = (id) => {
    if (id === tab) return
    setTabTransitioning(true)
    setTimeout(() => {
      setTab(id)
      setError('')
      setTabTransitioning(false)
    }, 250) // Simulación rápida de transición de página
  }

  // Animación de GSAP al renderizar el contenido de la pestaña
  useEffect(() => {
    if (!tabTransitioning && contentRef.current) {
      gsap.fromTo(contentRef.current, 
        { opacity: 0, y: 15 }, 
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      )
    }
  }, [tab, tabTransitioning])

  const refresh = useCallback(async () => {
    const [list, log] = await Promise.all([api.listProposals(), api.audit()])
    setProposals(list)
    setAudit(log)
    return list
  }, [])

  const refreshInsight = useCallback(async (profileLabel) => {
    setInsightLoading(true)
    try {
      const [n, ins] = await Promise.all([
        api.news(),
        api.aiInsight(profileLabel),
      ])
      setNews(n.items ?? [])
      setInsight(ins)
    } catch { /* silencioso: no crítico */ }
    setInsightLoading(false)
  }, [])

  useEffect(() => {
    api.questionnaire().then(setQuestionnaire).catch(e => setError(e.message))
    api.catalog().then(setCatalog).catch(() => {})
    api.market().then(setMarket).catch(() => {})
    refresh().catch(() => {})
    refreshInsight().catch(() => {})
  }, [refresh, refreshInsight])

  const submitProfile = async (clientName, answers) => {
    setLoading(true); setError('')
    try {
      const rec = await api.createProposal(clientName, answers)
      setRecord(rec)
      await refresh()
      refreshInsight(rec.profile_result?.profile?.label)
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
    return (
      // WCAG 4.1.3: aria-live para mensajes de estado de carga
      <div className="page" role="status" aria-live="polite">
        <EmptyText>Conectando con el backend… {error}</EmptyText>
      </div>
    )
  }

  const profileLabel = record?.profile_result?.profile?.label

  return (
    <>
      {/* WCAG 2.4.1: saltar navegación — destino del skip-link en layout.jsx */}
      <div className="page">
        {/* Header con TopBar */}
        <TopBar tabs={TABS} active={tab} onChange={changeTab} />

        {/* main con id para el skip-link */}
        <main id="main-content" className="mt-4" tabIndex={-1}>

          {/* Guía Interactiva Compacta - Visible globalmente cuando hay un diagnóstico activo */}
          {record && (
            <div className="mb-6">
              <InteractiveGuide
                currentTab={tab}
                setTab={changeTab}
                record={record}
                proposals={proposals}
              />
            </div>
          )}

          {tabTransitioning ? (
            /* Visual indicator during page transitions (ALGO DE CARGA) */
            <div className="flex flex-col items-center justify-center py-20" role="status" aria-live="polite">
              <div className="w-10 h-10 border-4 border-green-soft border-t-green rounded-full animate-spin mb-4" />
              <p className="text-brand-ink font-semibold animate-pulse">Cargando...</p>
            </div>
          ) : (
            <div ref={contentRef} className="tab-content-animate">
              {/* Layout a pantalla completa / centrado para todos los paneles */}
              <div className="flex flex-col gap-6">
                {tab === 'dashboard' && (
                  <DashboardPage
                    questionnaire={questionnaire}
                    record={record}
                    market={market}
                    catalog={catalog}
                    loading={loading}
                    error={error}
                    onSubmit={submitProfile}
                    onReset={() => setRecord(null)}
                    onSeeRules={() => changeTab('reglas')}
                  />
                )}
                {tab === 'analisis' && (
                  <AiInsightPanel
                    insight={insight}
                    news={news}
                    loading={insightLoading}
                    onRefresh={() => refreshInsight(profileLabel)}
                  />
                )}
                {tab === 'portafolios' && (
                  <PortfoliosPage catalog={catalog} questionnaire={questionnaire} />
                )}
                {tab === 'asesor' && (
                  <AdvisorPage proposals={proposals} onDecide={decide} error={error} />
                )}
                {tab === 'auditoria' && <AuditPage entries={audit} />}
                {tab === 'reglas'    && <RulesPage questionnaire={questionnaire} />}
              </div>
            </div>
          )}
        </main>

        <LegalFooter />
      </div>
    </>
  )
}

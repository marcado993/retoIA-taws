const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Error ${res.status}`)
  }
  return res.json()
}

export const api = {
  questionnaire: () => request('/questionnaire'),
  catalog: () => request('/catalog'),
  market: () => request('/market'),
  news: () => request('/news'),
  aiInsight: (profile) => request(`/ai-insight${profile ? `?profile=${encodeURIComponent(profile)}` : ''}`),
  createProposal: (clientName, answers, goal) =>
    request('/proposals', {
      method: 'POST',
      body: JSON.stringify({ client_name: clientName, answers, goal: goal || null }),
    }),
  listProposals: () => request('/proposals'),
  suitabilityReportUrl: (id) => `${BASE}/proposals/${id}/report.pdf`,
  decide: (id, payload) =>
    request(`/proposals/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  audit: () => request('/audit'),
}


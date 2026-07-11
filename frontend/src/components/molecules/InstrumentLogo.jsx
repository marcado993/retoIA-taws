import { useState } from 'react'

// Logo real del instrumento: Parqet (por ticker) → favicon del emisor (Google) → monograma.
export default function InstrumentLogo({ domain, ticker }) {
  const sources = [
    `https://assets.parqet.com/logos/symbol/${ticker}?format=png&size=64`,
    domain && `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
  ].filter(Boolean)
  const [idx, setIdx] = useState(0)

  if (idx >= sources.length) {
    return <span className="holding-mono">{(ticker || '?').slice(0, 3)}</span>
  }
  return (
    <img className="holding-logo" src={sources[idx]} alt={ticker}
      loading="lazy" onError={() => setIdx(idx + 1)} />
  )
}

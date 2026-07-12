// Marca institucional: monograma trazado en línea fina, no un emoji — el
// tipo de detalle que separa "producto de IA" de "firma de gestión patrimonial".
export default function Logo() {
  return (
    <div className="logo">
      <svg className="logo-mark" width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="2.5" y="2.5" width="19" height="19" rx="4" />
        <path d="M7 15.5 L11 9 L14 13 L17 7.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <strong>Invert<span className="logo-accent">IA</span></strong>
    </div>
  )
}

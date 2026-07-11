import '../src/styles.css'


export const metadata = {
  title: 'InvertIA — Robo-Advisor',
  description:
    'Plataforma de asesoramiento financiero con IA: análisis de mercado en tiempo real, ' +
    'noticias financieras y portafolios explicables con supervisión humana.',
  keywords: 'robo-advisor, inversiones, portafolio, IA, finanzas, ETF',
  // WCAG: idioma principal declarado (3.1.1)
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      {/*
        WCAG 2.4.1 — Skip link para saltar la navegación al contenido principal.
        El CSS lo posiciona fuera de pantalla y lo muestra al recibir foco.
      */}
      <body>
        <a href="#main-content" className="skip-link">
          Saltar al contenido principal
        </a>
        {children}
      </body>
    </html>
  )
}

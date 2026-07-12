import { test, expect } from '@playwright/test'
import { completarCuestionario, OPCIONES_MODERADAS } from './helpers.js'

// El usuario no encontraba dónde se cumplía HU2 (propuesta explicable): estaba
// enterrada solo en el Dashboard tras el flujo. Ahora "Análisis IA" también la
// muestra, detrás de un botón explícito "Generar análisis" que abre un modal con
// la propuesta (treemap), las noticias que la respaldan y qué modelo la redactó.
test('la pestaña Análisis IA genera un reporte con propuesta, evidencia y modelo de IA', async ({ page }) => {
  await page.goto('/')

  // Sin diagnóstico aún: estado vacío con CTA hacia el Dashboard, no un vacío mudo.
  await page.getByTestId('nav-analisis').click()
  await expect(page.locator('.ai-my-proposal-empty')).toBeVisible()
  await expect(page.locator('.ai-my-proposal-empty')).toContainText('diagnóstico')

  // Tras completar el diagnóstico, aparece el disparador "Generar análisis".
  await completarCuestionario(page, 'Cliente Análisis', OPCIONES_MODERADAS)
  await page.getByTestId('nav-analisis').click()
  await expect(page.getByTestId('generate-report-btn')).toBeVisible()
  await page.getByTestId('generate-report-btn').click()

  // El modal trae las 3 secciones pedidas: propuesta, noticias, modelo de IA.
  const report = page.getByTestId('analysis-report')
  await expect(report).toBeVisible()
  await expect(report.getByTestId('treemap')).toBeVisible()
  await expect(report).toContainText('Noticias que respaldan')
  await expect(report).toContainText('Modelo de IA')
  await expect(report).toContainText('Asesor Financiero IA')

  // Sin pestañas internas anidadas: el contexto vive en un <details> nativo.
  await expect(page.locator('.ai-tabs-nav')).toHaveCount(0)
})

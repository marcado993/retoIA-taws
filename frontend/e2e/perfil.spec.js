import { test, expect } from '@playwright/test'
import { completarCuestionario, OPCIONES_MODERADAS } from './helpers.js'

// HU1 + HU2: perfil transparente y propuesta explicable de extremo a extremo.
test('perfil moderado con desglose y propuesta pendiente', async ({ page }) => {
  await completarCuestionario(page, 'Alex Test', OPCIONES_MODERADAS)

  // Gauge y perfil calculados por reglas versionadas
  await expect(page.getByTestId('gauge-score')).toHaveText('67')
  await expect(page.getByTestId('hero-profile-chip')).toContainText('Moderado')

  // Transparencia: una fila de influencia por pregunta
  await expect(page.getByTestId('influence-row')).toHaveCount(6)

  // HU2: treemap, catálogo aprobado con instrumentos reales y límites visibles
  await expect(page.getByTestId('treemap')).toBeVisible()
  await expect(page.getByTestId('holding-row')).toHaveCount(7) // portafolio moderado
  await expect(page.getByTestId('compliance')).toContainText('No ejecuta órdenes')

  // La propuesta no se ejecuta: queda pendiente del asesor, con disclaimer
  await expect(page.getByTestId('status-chip').first()).toHaveText('Pendiente de asesor')
  await expect(page.getByTestId('disclaimer')).toContainText('no ejecuta órdenes')
})

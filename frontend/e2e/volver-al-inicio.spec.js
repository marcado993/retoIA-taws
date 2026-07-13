import { test, expect } from '@playwright/test'
import { completarCuestionario, OPCIONES_MODERADAS } from './helpers.js'

// Navegación sin callejón sin salida: desde el dashboard con un plan activo,
// "Volver al inicio" muestra la landing sin perder el plan — y desde la
// landing siempre hay camino de vuelta al plan.
test('el cliente puede volver al inicio desde su plan y regresar sin perder los datos', async ({ page }) => {
  await completarCuestionario(page, 'Cliente Navegacion', OPCIONES_MODERADAS)
  await expect(page.getByTestId('gauge-score')).not.toHaveText('0')

  await page.getByTestId('back-to-home-btn').click()
  await expect(page.getByTestId('hero-cta')).toBeVisible()
  await expect(page.getByTestId('back-to-plan-btn')).toBeVisible()

  await page.getByTestId('back-to-plan-btn').click()
  await expect(page.getByTestId('gauge-score')).not.toHaveText('0')
  await expect(page.getByTestId('hero-cta')).toHaveCount(0)
})

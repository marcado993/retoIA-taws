import { test, expect } from '@playwright/test'

// HU1 (patrón Betterment): landing con hero, pilares, casos de uso y confianza,
// antes del cuestionario. Un caso de uso pre-rellena la pregunta "objetivo".
test('la landing precede al cuestionario y un caso de uso pre-rellena la primera respuesta', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('hero-cta')).toBeVisible()
  await expect(page.getByTestId('trust-bar')).toContainText('Reglas de perfilamiento versionadas')
  await expect(page.getByTestId('goal-card')).toHaveCount(4)

  // "Construir patrimonio" = objetivo crecimiento (4ª tarjeta)
  await page.getByTestId('goal-card').nth(3).click()

  await expect(page.getByTestId('client-name')).toBeVisible()
  await page.getByTestId('client-name').fill('Caso De Uso')
  await page.getByTestId('goto-preguntas').click()

  // La respuesta pre-rellenada por el caso de uso ya cuenta como respondida.
  await expect(page.locator('.q-dot.done')).toHaveCount(1)
  await expect(page.locator('.q-text')).toContainText('cuánto tiempo')
})

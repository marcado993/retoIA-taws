import { test, expect } from '@playwright/test'

// HU1: reglas visibles y versionadas para cualquier usuario.
test('la pestaña Reglas muestra versión, fórmula y knockouts', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('nav-reglas').click()

  await expect(page.getByTestId('rules-version')).toHaveText('v1.0.0')
  await expect(page.getByTestId('rules-formula')).toContainText('score = 100')
  await expect(page.getByTestId('knockout-note')).toHaveCount(3)

  // Trazabilidad bibliográfica: cada pregunta cita su fuente + lista de referencias.
  await expect(page.locator('.rules-question-source').first()).toContainText('CFA Institute')
  await expect(page.getByTestId('rules-references')).toContainText('FINRA Rule 2111')
  await expect(page.getByTestId('rules-references')).toContainText('Markowitz')
})

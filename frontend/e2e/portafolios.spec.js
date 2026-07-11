import { test, expect } from '@playwright/test'

// HU2 (patrón "Explore portfolio options" de Betterment): comparar los 3 portafolios
// modelo sin necesidad de completar el cuestionario.
test('la pestaña Portafolios compara los 3 perfiles con datos del catálogo', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('nav-portafolios').click()

  const cards = page.getByTestId('portfolio-card')
  await expect(cards).toHaveCount(3)
  await expect(cards.nth(0)).toContainText('Conservador')
  await expect(cards.nth(2)).toContainText('Agresivo')
  await expect(page.getByTestId('portfolio-disclaimer')).toContainText('Catálogo aprobado')
})

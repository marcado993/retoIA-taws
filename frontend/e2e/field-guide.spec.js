import { test, expect } from '@playwright/test'

// Guía dinámica de llenado en el modal de diagnóstico: la flecha señala el
// primer campo vacío y "salta" al siguiente conforme se completa cada uno.
// El nombre se valida con regex (solo letras) antes de dejar avanzar.
test('la flecha guía salta de campo en campo y valida el nombre con regex', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('hero-cta').click()

  // Al abrir, la guía apunta al nombre.
  await expect(page.getByTestId('field-guide')).toContainText('Escribe tu nombre')

  // Nombre inválido (con números): error visible, la guía sigue en nombre.
  await page.getByTestId('client-name').fill('Ana123')
  await expect(page.getByTestId('name-error')).toBeVisible()
  await expect(page.getByTestId('field-guide')).toContainText('Escribe tu nombre')

  // Nombre válido: la guía salta al siguiente campo (meta objetivo).
  await page.getByTestId('client-name').fill('Ana Torres')
  await expect(page.getByTestId('name-error')).toHaveCount(0)
  await expect(page.getByTestId('field-guide')).toContainText('acumular')
})

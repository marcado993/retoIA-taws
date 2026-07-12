import { test, expect } from '@playwright/test'
import { completarCuestionario, switchToAsesor, OPCIONES_MODERADAS } from './helpers.js'

// HU3 + REGLAS.md §3.4: el backend re-valida cualquier edición del asesor —
// al menos 3 clases de activo y ningún instrumento por encima del 50% (salvo
// liquidez/renta fija en perfil Conservador). Defensa en profundidad: el
// cliente HTTP no puede saltarse esto aunque manipule la asignación editada.
test('el backend rechaza una edición que concentra más del 50% en un solo instrumento', async ({ page }) => {
  await completarCuestionario(page, 'Cliente Diversificación', OPCIONES_MODERADAS)

  await switchToAsesor(page)
  await page.getByTestId('queue-row').first().click()
  await page.getByTestId('advisor-name').fill('Laura Ibarra')
  await page.getByTestId('btn-editar').click()

  // Concentra el 60% en SPY (renta variable, sin exención) — viola el tope del 50%.
  await page.getByTestId('edit-weight-SPY').fill('60')
  await page.getByTestId('edit-weight-AGG').fill('0')
  await page.getByTestId('edit-weight-BND').fill('0')
  await page.getByTestId('edit-weight-EFA').fill('10')

  // El total sí suma 100%, así que el botón se habilita client-side...
  await expect(page.locator('.edit-total')).toContainText('100%')
  await page.getByTestId('advisor-notes').fill('Ajuste de convicción en SPY')
  await page.getByTestId('btn-aprobar-cambios').click()

  // ...pero el backend rechaza la concentración y lo muestra en pantalla.
  await expect(page.getByTestId('error-text')).toContainText('50%')
  await expect(page.getByTestId('error-text')).toContainText('SPY')

  // La propuesta sigue pendiente: la edición inválida nunca se aplicó.
  await expect(page.getByTestId('queue-row').first().getByTestId('status-chip'))
    .toHaveText('Pendiente de asesor')
})

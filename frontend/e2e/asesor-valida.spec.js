import { test, expect } from '@playwright/test'
import { completarCuestionario, switchToAsesor, OPCIONES_MODERADAS } from './helpers.js'

// HU3: validaciones duras — rechazo con motivo obligatorio y edición que suma 100%.
test('rechazo sin motivo se bloquea y la edición valida la suma de pesos', async ({ page }) => {
  await completarCuestionario(page, 'Cliente Validar', OPCIONES_MODERADAS)

  await switchToAsesor(page)
  await page.getByTestId('nav-asesor').click()
  await page.getByTestId('queue-row').first().click()
  await page.getByTestId('advisor-name').fill('María Gómez')

  // H5 prevención de errores: rechazar deshabilitado hasta escribir el motivo
  await expect(page.getByTestId('btn-rechazar')).toBeDisabled()
  await page.getByTestId('advisor-notes').fill('motivo temporal')
  await expect(page.getByTestId('btn-rechazar')).toBeEnabled()
  await page.getByTestId('advisor-notes').fill('')

  // Editar: si los pesos no suman 100%, no se puede aprobar
  await page.getByTestId('btn-editar').click()
  await page.getByTestId('edit-weight-BIL').fill('5') // 10 → 5, total 95
  await expect(page.getByTestId('btn-aprobar-cambios')).toBeDisabled()

  // Corregir a 100% y aprobar con cambios (genera nueva versión)
  await page.getByTestId('edit-weight-AGG').fill('25') // 20 → 25, total 100
  await page.getByTestId('advisor-notes').fill('Ajuste de liquidez')
  await page.getByTestId('btn-aprobar-cambios').click()

  await expect(page.getByTestId('queue-row').first().getByTestId('status-chip'))
    .toHaveText('Aprobada con cambios')
})

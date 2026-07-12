import { test, expect } from '@playwright/test'
import { completarCuestionario, switchToAsesor, OPCIONES_MODERADAS } from './helpers.js'

// HU3: el asesor autorizado aprueba y la decisión queda auditada.
test('el asesor aprueba una propuesta y queda registrada en auditoría', async ({ page }) => {
  await completarCuestionario(page, 'Cliente Aprobar', OPCIONES_MODERADAS)

  await switchToAsesor(page)
  await page.getByTestId('nav-asesor').click()
  await page.getByTestId('queue-row').first().click()
  await page.getByTestId('advisor-name').fill('María Gómez')
  await page.getByTestId('advisor-notes').fill('Coherente con el perfil')
  await page.getByTestId('btn-aprobar').click()

  await expect(page.getByTestId('queue-row').first().getByTestId('status-chip'))
    .toHaveText('Aprobada')
  await expect(page.getByTestId('decision-note')).toContainText('María Gómez')

  // Dashboard de casos: el historial de aprobados registra el caso resuelto.
  await expect(page.getByTestId('approval-history')).toContainText('Cliente Aprobar')
  await expect(page.getByTestId('approval-history')).toContainText('María Gómez')

  // Auditoría: responsable + versión de reglas
  await page.getByTestId('nav-auditoria').click()
  const table = page.getByTestId('audit-table')
  await expect(table).toContainText('asesor:María Gómez')
  await expect(table).toContainText('v1.0.0')
})

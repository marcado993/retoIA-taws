import { test, expect } from '@playwright/test'
import { generarBorrador, switchToAsesor, OPCIONES_MODERADAS } from './helpers.js'

// Visibilidad del sistema (Nielsen H1): la propuesta nace como un borrador que
// solo ve el cliente. "Generar otra propuesta" guarda los datos y pide una
// candidata distinta; "Esta es la propuesta que quiero" recién ahí la manda
// a la cola del asesor.
test('el cliente puede regenerar la propuesta y solo la confirmada llega al asesor', async ({ page }) => {
  await generarBorrador(page, 'Cliente Regenera', OPCIONES_MODERADAS)

  await expect(page.getByTestId('draft-banner')).toBeVisible()
  await expect(page.getByTestId('status-chip')).toHaveText('Vista previa (sin enviar)')

  // Aún no llega al asesor: es un borrador (la cola puede tener propuestas de
  // otros specs, así que se verifica por nombre, no por conteo total).
  await switchToAsesor(page)
  await expect(page.getByTestId('queue-row').filter({ hasText: 'Cliente Regenera' })).toHaveCount(0)

  // Vuelve al dashboard del cliente y pide otra propuesta con los mismos datos.
  await page.getByTestId('role-cliente').click()
  await page.getByTestId('regenerate-btn').click()
  await expect(page.getByTestId('draft-banner')).toBeVisible()
  await expect(page.getByTestId('status-chip')).toHaveText('Vista previa (sin enviar)')

  // Confirma esta candidata: recién ahora se envía al asesor.
  await page.getByTestId('confirm-proposal-btn').click()
  await expect(page.getByTestId('draft-banner')).toHaveCount(0)
  await expect(page.getByTestId('status-chip')).toHaveText('Pendiente de asesor')

  await switchToAsesor(page)
  await expect(page.getByTestId('queue-row').filter({ hasText: 'Cliente Regenera' })).toHaveCount(1)
})

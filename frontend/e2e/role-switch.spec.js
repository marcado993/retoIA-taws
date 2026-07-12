import { test, expect } from '@playwright/test'
import { completarCuestionario, switchToAsesor, OPCIONES_MODERADAS } from './helpers.js'

// Cada rol ve SOLO sus propias pestañas — no es un permiso dentro de la misma
// vista, es una vista distinta. "Asistente Financiero IA" (cliente) nunca ve
// el Panel Asesor ni la auditoría completa; "Asistente Financiero" (asesor)
// solo ve su dashboard de casos (estadísticas + aprobar/editar/rechazar) y
// el registro — nada de las pestañas del cliente.
test('cada rol oculta por completo las pestañas del otro', async ({ page }) => {
  await completarCuestionario(page, 'Cliente Rol', OPCIONES_MODERADAS)

  // Rol cliente (por defecto): sin Panel Asesor ni Auditoría.
  await expect(page.getByTestId('nav-dashboard')).toBeVisible()
  await expect(page.getByTestId('nav-analisis')).toBeVisible()
  await expect(page.getByTestId('nav-portafolios')).toBeVisible()
  await expect(page.getByTestId('nav-reglas')).toBeVisible()
  await expect(page.getByTestId('nav-asesor')).toHaveCount(0)
  await expect(page.getByTestId('nav-auditoria')).toHaveCount(0)

  // Cambiar a "Asistente Financiero": dashboard de casos (estadísticas +
  // historial + cola para aprobar/editar/rechazar) y el registro — nada del cliente.
  await switchToAsesor(page)
  await expect(page.getByTestId('nav-asesor')).toBeVisible()
  await expect(page.getByTestId('nav-auditoria')).toBeVisible()
  await expect(page.getByTestId('nav-dashboard')).toHaveCount(0)
  await expect(page.getByTestId('nav-analisis')).toHaveCount(0)
  await expect(page.getByTestId('nav-portafolios')).toHaveCount(0)
  await expect(page.getByTestId('nav-reglas')).toHaveCount(0)

  // El "dashboard de casos" del asesor: estadísticas + historial ya visibles
  // sin tener que seleccionar nada, más la cola para actuar.
  await expect(page.locator('.advisor-stats-card, [data-testid="approval-history"]').first()).toBeVisible()
  await page.getByTestId('queue-row').first().click()
  await expect(page.getByTestId('btn-aprobar')).toBeVisible()
})

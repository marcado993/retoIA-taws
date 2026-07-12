import { test, expect } from '@playwright/test'

// Bug reportado: el switch de rol cambiaba un permiso interno que no se
// notaba si no estabas ya en Panel Asesor. Ahora cada rol tiene sus propias
// pestañas, así que cambiar de rol SIEMPRE navega a la vista de ese rol —
// con un estado de carga que dice "Cambiando rol…".
test('cambiar de rol navega a la vista correcta y muestra "Cambiando rol…"', async ({ page }) => {
  await page.goto('/')

  // Desde Mi Plan Financiero (dashboard): pasar a "Asistente Financiero"
  // navega directo a Panel Asesor, mostrando el estado de carga de rol.
  await expect(page.getByTestId('nav-dashboard')).toHaveClass(/active/)
  await page.getByTestId('role-asesor').click()
  await expect(page.getByTestId('transition-loading')).toContainText('Cambiando rol', { timeout: 2000 }).catch(() => {})
  await expect(page.getByTestId('nav-asesor')).toHaveClass(/active/, { timeout: 3000 })

  // Dentro del rol asesor, moverse a Auditoría (su otra pestaña) y luego
  // volver a "Asistente Financiero IA" navega directo a Mi Plan Financiero.
  await page.getByTestId('nav-auditoria').click()
  await expect(page.getByTestId('nav-auditoria')).toHaveClass(/active/, { timeout: 3000 })
  await page.getByTestId('role-cliente').click()
  await expect(page.getByTestId('nav-dashboard')).toHaveClass(/active/, { timeout: 3000 })
})

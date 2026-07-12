import { expect } from '@playwright/test'

// Índice (1-4) de la opción a elegir en cada una de las 6 preguntas.
export const OPCIONES_MODERADAS = [3, 3, 3, 3, 3, 3] // score 67 → Moderado
export const OPCIONES_KNOCKOUT = [4, 4, 4, 4, 4, 1]  // score 85 pero sin fondo de emergencia

// Completa el diagnóstico hasta la propuesta y la confirma ("esta es la que
// quiero") — es el flujo de extremo a extremo que usan la mayoría de specs,
// que esperan encontrar la propuesta ya en la cola del asesor.
export async function completarCuestionario(page, nombre, picks) {
  await generarBorrador(page, nombre, picks)
  await expect(page.getByTestId('draft-banner')).toBeVisible()
  await page.getByTestId('confirm-proposal-btn').click()
  await expect(page.getByTestId('draft-banner')).toHaveCount(0)
}

// Llega solo hasta el borrador (vista previa, sin confirmar) — para los tests
// que ejercitan "Generar otra propuesta" / "Esta es la que quiero" en sí mismos.
export async function generarBorrador(page, nombre, picks) {
  await page.goto('/')
  // Landing (patrón Betterment): el CTA del hero abre el diagnóstico en un modal.
  await page.getByTestId('hero-cta').click()
  await expect(page.getByTestId('modal')).toBeVisible()
  await page.getByTestId('client-name').fill(nombre)
  await page.getByTestId('goto-preguntas').click()
  for (let i = 0; i < picks.length; i++) {
    await page.getByTestId('question-option').nth(picks[i] - 1).click()
    await expect(page.locator('.q-dot.done')).toHaveCount(i + 1)
  }
  // H6: pantalla de revisión de respuestas antes de calcular
  await page.getByTestId('goto-review').click()
  await expect(page.getByTestId('review-row')).toHaveCount(picks.length)
  await page.getByTestId('submit-profile').click()
  await expect(page.getByTestId('gauge-score')).not.toHaveText('0')
  // El modal se cierra solo al llegar la propuesta (aunque sea un borrador).
  await expect(page.getByTestId('modal')).not.toBeVisible()
}

// El rol por defecto ("Asistente Financiero IA") es de solo lectura en el Panel
// Asesor; hay que cambiar a "Asistente Financiero" para aprobar/editar/rechazar.
export async function switchToAsesor(page) {
  await page.getByTestId('role-asesor').click()
  await expect(page.getByTestId('role-asesor')).toHaveAttribute('aria-selected', 'true')
}

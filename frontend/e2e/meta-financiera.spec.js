import { test, expect } from '@playwright/test'
import { completarCuestionario, OPCIONES_MODERADAS } from './helpers.js'

// HU2 + HU3 (enfoque de agente personalizado): la meta financiera del cliente
// (monto, plazo, aporte mensual) debe verse como comparación estructurada —
// tanto en la propuesta como en el resumen del asesor — y la explicación de la
// IA no debe contener cifras o afirmaciones inventadas (bug real encontrado:
// una estadística fabricada "90% de los grandes inversores…" estaba mezclada
// en el mismo párrafo que los números auditables).
test('la meta financiera aparece como comparación estructurada, sin afirmaciones inventadas', async ({ page }) => {
  await completarCuestionario(page, 'Cliente Meta', OPCIONES_MODERADAS)

  const proposalGoalFit = page.getByTestId('goal-fit-card')
  await expect(proposalGoalFit).toBeVisible()
  await expect(proposalGoalFit).toContainText('Retorno anual necesario')
  await expect(proposalGoalFit).toContainText('Retorno de esta propuesta')
  await expect(page.getByTestId('goal-fit-status')).toBeVisible()

  const explanation = await page.locator('.explanation, .agent-body').first().textContent()
  expect(explanation).not.toContain('90%')
  expect(explanation).not.toContain('Warren Buffett')
  expect(explanation).not.toContain('grandes inversores')

  // El asesor también debe ver la meta como bloque estructurado, no en el párrafo.
  await page.getByTestId('nav-asesor').click()
  await page.getByTestId('queue-row').first().click()
  await expect(page.getByTestId('goal-fit-card')).toBeVisible()
})

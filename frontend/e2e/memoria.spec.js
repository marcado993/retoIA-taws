import { test, expect } from '@playwright/test'
import { completarCuestionario, OPCIONES_MODERADAS } from './helpers.js'

// Memoria del agente (continuidad de la conversación): si un cliente ya se
// diagnosticó antes, el agente lo recuerda en el segundo diagnóstico — con
// cifras leídas del historial guardado, nunca generadas por el LLM.
test('el agente recuerda a un cliente que ya se diagnosticó antes', async ({ page }) => {
  // Nombre único (letras solamente: el formulario valida el nombre con regex,
  // ver field-guide.spec.js) para no chocar con historial de corridas previas.
  const sufijo = Math.random().toString(36).replace(/[^a-z]/g, '').padEnd(4, 'x').slice(0, 4)
  const cliente = `Memoria Prueba ${sufijo}`

  // Primer diagnóstico: cliente nuevo, no debe mostrar la tarjeta de memoria.
  await completarCuestionario(page, cliente, OPCIONES_MODERADAS)
  await expect(page.getByTestId('client-memory-card')).toHaveCount(0)

  // Segundo diagnóstico del mismo cliente: el agente ya lo conoce.
  await completarCuestionario(page, cliente, OPCIONES_MODERADAS)
  await expect(page.getByTestId('client-memory-card')).toBeVisible()
  await expect(page.getByTestId('client-memory-card')).toContainText('Diagnóstico #2')
})

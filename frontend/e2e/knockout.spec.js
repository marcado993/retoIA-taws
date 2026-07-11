import { test, expect } from '@playwright/test'
import { completarCuestionario, OPCIONES_KNOCKOUT } from './helpers.js'

// HU1: las reglas de tope protegen al usuario aunque su puntaje sea alto.
test('perfil agresivo sin fondo de emergencia queda capado a Moderado', async ({ page }) => {
  await completarCuestionario(page, 'Caso Knockout', OPCIONES_KNOCKOUT)

  await expect(page.getByTestId('gauge-score')).toHaveText('85')
  await expect(page.getByTestId('hero-profile-chip')).toContainText('Moderado')
  await expect(page.getByTestId('knockout-note')).toContainText('fondo de emergencia')
})

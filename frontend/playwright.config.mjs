import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// BD temporal para que los e2e no toquen los datos de la demo (ver ROBO_DB_PATH en store.py).
const E2E_DB = path.join(__dirname, 'e2e', '.e2e-db.json')
if (fs.existsSync(E2E_DB)) fs.unlinkSync(E2E_DB)

export default defineConfig({
  testDir: './e2e',
  workers: 1, // los specs comparten el backend; la cola de revisión depende del orden
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'python -m uvicorn app.main:app --port 8001',
      cwd: path.join(__dirname, '..', 'backend'),
      url: 'http://localhost:8001/api/health',
      reuseExistingServer: false,
      timeout: 60_000,
      // Deterministas y offline: sin llamar a DeepSeek (clave vacía) ni a Yahoo/RSS
      // (ROBO_OFFLINE usa snapshot/mock). `load_dotenv(override=False)` respeta estas
      // — si no se fuerza vacío aquí, el backend cargaría la key real de backend/.env
      // y los e2e dependerían de la API real (lento, no determinista, gasta presupuesto).
      env: { ...process.env, ROBO_DB_PATH: E2E_DB, DEEPSEEK_API_KEY: '', ROBO_OFFLINE: '1' },
    },
    {
      command: 'npm run dev',
      cwd: __dirname,
      url: 'http://localhost:3000',
      reuseExistingServer: false,
      timeout: 60_000,
      env: { ...process.env, BACKEND_PORT: '8001' },
    },
  ],
})

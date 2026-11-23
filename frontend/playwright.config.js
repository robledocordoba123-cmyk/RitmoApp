import { defineConfig, devices } from '@playwright/test'

// AM-05 (DOC-07): pruebas de punta a punta con Playwright. Un navegador de
// verdad recorre la aplicación como lo haría una persona, contra la API real
// y una base de datos con los datos de demostración.
//
// La API debe estar corriendo en http://localhost:4000 con una base de datos
// SOLO para estas pruebas (ver e2e/README.md). Playwright enciende la página
// con Vite en el puerto 5174, y Vite le pasa las peticiones de /api a la API.
const PUERTO = 5174

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      // En el computador se usa el Chrome instalado; en GitHub Actions, el
      // Chromium que descarga Playwright.
      use: { ...devices['Desktop Chrome'], channel: process.env.CI ? undefined : 'chrome' },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PUERTO} --strictPort`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})

import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  // AM-04 (DOC-07): pruebas de componentes con Vitest y Testing Library.
  // jsdom simula el navegador; la API se reemplaza con un fetch falso en cada prueba.
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    // Las pruebas de punta a punta (e2e/) las corre Playwright, no Vitest.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/test/**', 'src/**/*.test.{js,jsx}'],
      reporter: ['text-summary', 'json-summary', 'lcov'],
    },
  },
})

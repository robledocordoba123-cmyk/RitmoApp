import { test, expect } from '@playwright/test'

// AM-05 (DOC-07): el flujo principal de la persona que más usa RitmoApp.
// Datos: los de prisma/seed.js y prisma/seed-demo.js. La contraseña es la de
// prueba de la demo, que solo existe en esa base de datos.
const ESTUDIANTE = { correo: 'estudiante@ritmocentral.test', clave: 'Prueba123!' }

async function iniciarSesion(page, { correo, clave }) {
  await page.goto('/login')
  await page.getByLabel('Correo').fill(correo)
  await page.getByLabel('Contraseña').fill(clave)
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

test.describe('Flujo del estudiante de punta a punta (HU-04, HU-08, HU-09, HU-10)', () => {
  test('CP-236 · inicia sesión, reserva una clase, la ve en Mis reservas y la cancela', async ({ page }) => {
    await iniciarSesion(page, ESTUDIANTE)
    await expect(page).toHaveURL(/\/estudiante\/inicio/)

    // Catálogo: se toma la última clase que se puede reservar. Las de más
    // adelante no tienen reservas de la cuenta demo, así que no hay cruce de horario.
    await page.getByRole('link', { name: 'Catálogo' }).click()
    await expect(page.getByRole('heading', { name: 'Catálogo' })).toBeVisible()
    const boton = page.getByRole('button', { name: 'Reservar', exact: true }).last()
    await expect(boton).toBeEnabled()
    const tarjeta = boton.locator('xpath=..')
    const ritmo = await tarjeta.locator('p.font-medium').first().innerText()
    const fecha = await tarjeta.locator('p', { has: page.locator('svg.lucide-calendar-days') }).innerText()

    await boton.click()
    await expect(page.getByText('¡Reserva confirmada!')).toBeVisible()

    // Mis reservas: la clase aparece confirmada, con el mismo ritmo y la misma fecha.
    await page.getByRole('link', { name: 'Mis reservas' }).click()
    const reserva = page.locator('div', { hasText: ritmo }).filter({ hasText: fecha.trim() }).filter({ has: page.getByRole('button', { name: 'Cancelar reserva' }) }).last()
    await expect(reserva).toBeVisible()
    await expect(reserva.getByText('Confirmada')).toBeVisible()

    // Se cancela para dejar la base como estaba. La pantalla pide confirmar.
    page.once('dialog', (dialogo) => dialogo.accept())
    await reserva.getByRole('button', { name: 'Cancelar reserva' }).click()
    await expect(page.getByText('Reserva cancelada.')).toBeVisible()
  })

  test('CP-237 · con la contraseña equivocada no entra y explica por qué', async ({ page }) => {
    await iniciarSesion(page, { correo: ESTUDIANTE.correo, clave: 'NoEsLaClave1!' })
    await expect(page.getByText('Credenciales inválidas.')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })
})

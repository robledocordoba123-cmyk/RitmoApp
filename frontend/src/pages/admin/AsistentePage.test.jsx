import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext'
import AsistentePage from './AsistentePage'
import { apiFalsa, iniciarSesionComo, llamadasA } from '../../test/api-falsa'

function mostrar() {
  iniciarSesionComo({ id: 'a1', nombre: 'Admin', rol: 'ADMIN_ACADEMIA' })
  render(
    <AuthProvider>
      <MemoryRouter>
        <AsistentePage />
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('RF-23 · HU-24: asistente de IA (pantalla)', () => {
  test('CP-193 · envía la pregunta y muestra la respuesta como texto con lo que consultó', async () => {
    const fetchFalso = apiFalsa({
      'GET /asistente/estado': { body: { disponible: true } },
      'POST /asistente': {
        body: { respuesta: 'El salón más vacío fue Estudio Urbano, con 42 % de ocupación.', consultas: ['Ocupación por salón'], vueltas: 2 },
      },
    })
    mostrar()

    await userEvent.type(await screen.findByLabelText('Tu pregunta'), '¿Qué salón estuvo más vacío?')
    await userEvent.click(screen.getByRole('button', { name: /preguntar/i }))

    expect(await screen.findByText('El salón más vacío fue Estudio Urbano, con 42 % de ocupación.')).toBeInTheDocument()
    expect(screen.getByText('Ocupación por salón')).toBeInTheDocument()
    expect(llamadasA(fetchFalso, 'POST', '/asistente')[0].body).toEqual({ pregunta: '¿Qué salón estuvo más vacío?' })
  })

  test('CP-194 · si el asistente no está activo lo dice, y si falla muestra el motivo', async () => {
    apiFalsa({ 'GET /asistente/estado': { body: { disponible: false } } })
    mostrar()
    expect(await screen.findByText('El asistente no está activo')).toBeInTheDocument()
  })

  test('CP-195 · si la API rechaza la pregunta, se ve el mensaje y no una respuesta', async () => {
    apiFalsa({
      'GET /asistente/estado': { body: { disponible: true } },
      'POST /asistente': { status: 429, body: { error: 'Llegaste al límite de 20 preguntas por hora al asistente. Intenta más tarde.' } },
    })
    mostrar()

    await userEvent.click(await screen.findByRole('button', { name: '¿A quién se le vence la membresía esta semana?' }))
    expect(await screen.findByText(/límite de 20 preguntas/)).toBeInTheDocument()
    expect(screen.getByText('No se pudo responder')).toBeInTheDocument()
  })
})

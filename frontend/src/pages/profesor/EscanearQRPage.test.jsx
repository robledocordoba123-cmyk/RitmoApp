import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext'
import EscanearQRPage from './EscanearQRPage'
import { apiFalsa, iniciarSesionComo, llamadasA } from '../../test/api-falsa'

const INSCRITOS = [
  { estudianteId: 'e1', nombre: 'Ana Ruiz', email: 'ana@x.test', estadoAsistencia: null },
  { estudianteId: 'e2', nombre: 'Beto Gil', email: 'beto@x.test', estadoAsistencia: 'ASISTIO' },
]

function mostrar() {
  iniciarSesionComo({ id: 'p1', nombre: 'Profe', rol: 'PROFESOR' })
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/profesor/clases/c1/escanear']}>
        <Routes>
          <Route path="/profesor/clases/:id/escanear" element={<EscanearQRPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('Asistencia con QR: pantalla del profesor', () => {
  test('CP-171 · un código pegado a mano se envía a la API y el estudiante aparece como registrado', async () => {
    const api = apiFalsa({
      'GET /clases/c1/inscritos': { body: INSCRITOS },
      'POST /qr/clases/c1/asistencia': { body: { estudiante: { id: 'e1', nombre: 'Ana Ruiz' }, estado: 'ASISTIO', yaEstabaRegistrado: false } },
    })
    mostrar()
    expect(await screen.findByText('1 de 2 inscritos con asistencia')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Código QR'), 'codigo-firmado')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(await screen.findByText('Ana Ruiz')).toBeInTheDocument()
    expect(screen.getByText('2 de 2 inscritos con asistencia')).toBeInTheDocument()
    expect(llamadasA(api, 'POST', '/qr/clases/c1/asistencia')[0].body).toEqual({ codigo: 'codigo-firmado' })
  })

  test('CP-172 · si la API rechaza el código, nadie queda registrado', async () => {
    apiFalsa({
      'GET /clases/c1/inscritos': { body: INSCRITOS },
      'POST /qr/clases/c1/asistencia': { status: 400, body: { error: 'Código QR no válido o vencido.' } },
    })
    mostrar()
    await screen.findByText('1 de 2 inscritos con asistencia')

    await userEvent.type(screen.getByLabelText('Código QR'), 'codigo-falso')
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(await screen.findByText('Aún no has escaneado a nadie en esta sesión.')).toBeInTheDocument()
    expect(screen.getByText('1 de 2 inscritos con asistencia')).toBeInTheDocument()
  })
})

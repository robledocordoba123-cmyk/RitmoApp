import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext'
import MisPagosPage from './MisPagosPage'
import { apiFalsa, iniciarSesionComo } from '../../test/api-falsa'

function mostrarPagos() {
  iniciarSesionComo({ id: 'e1', nombre: 'Ana', rol: 'ESTUDIANTE' })
  render(
    <AuthProvider>
      <MemoryRouter>
        <MisPagosPage />
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('RF-12 · HU-12: mis pagos (pantalla)', () => {
  test('CP-131 · muestra la membresía vigente y el historial con valor y medio de pago', async () => {
    apiFalsa({
      'GET /pagos/mios': {
        body: {
          membresia: { estado: 'AL_DIA', vigenteHasta: '2027-02-01T12:00:00.000Z', diasRestantes: 20 },
          pagos: [
            {
              id: 'p1',
              registradoEn: '2027-01-02T12:00:00.000Z',
              nombreTarifa: 'Mensualidad',
              medio: 'TRANSFERENCIA',
              referencia: 'NEQUI-123',
              vigenteDesde: '2027-01-02T12:00:00.000Z',
              vigenteHasta: '2027-02-01T12:00:00.000Z',
              monto: 120000,
            },
          ],
        },
      },
    })
    mostrarPagos()

    expect(await screen.findByText(/Vigente hasta el/)).toBeInTheDocument()
    expect(screen.getByText('Al día')).toBeInTheDocument()
    expect(screen.getByText('Mensualidad')).toBeInTheDocument()
    expect(screen.getByText(/Transferencia/)).toHaveTextContent('NEQUI-123')
    expect(screen.getByText(/120\.000/)).toBeInTheDocument()
  })

  test('CP-132 · sin pagos avisa que no hay membresía y muestra un mensaje en vez de la tabla', async () => {
    apiFalsa({ 'GET /pagos/mios': { body: { membresia: { estado: 'SIN_PAGOS', vigenteHasta: null, diasRestantes: 0 }, pagos: [] } } })
    mostrarPagos()

    expect(await screen.findByText('Aún no tienes pagos registrados')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Todavía no tienes una membresía activa.')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

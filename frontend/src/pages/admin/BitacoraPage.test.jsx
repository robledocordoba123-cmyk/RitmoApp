import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext'
import BitacoraPage from './BitacoraPage'
import { apiFalsa, iniciarSesionComo } from '../../test/api-falsa'

function mostrar() {
  iniciarSesionComo({ id: 'a1', nombre: 'Admin', rol: 'ADMIN_ACADEMIA' })
  render(
    <AuthProvider>
      <MemoryRouter>
        <BitacoraPage />
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('RF-21 · HU-21: bitácora (pantalla)', () => {
  test('CP-163 · muestra quién hizo cada cambio y permite buscar', async () => {
    apiFalsa({
      'GET /bitacora': {
        body: [
          { id: 'b2', accion: 'Registró un pago', detalle: 'Mensualidad · $ 120.000', fecha: '2026-10-16T15:00:00.000Z', usuario: { nombre: 'Laura Admin', rol: 'ADMIN_ACADEMIA' } },
          { id: 'b1', accion: 'Reservó una clase', detalle: null, fecha: '2026-10-16T14:00:00.000Z', usuario: { nombre: 'Tomás Ospina', rol: 'ESTUDIANTE' } },
        ],
      },
    })
    mostrar()

    expect(await screen.findByText('Registró un pago')).toBeInTheDocument()
    expect(screen.getByText('Tomás Ospina')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(3) // encabezado + 2 movimientos

    await userEvent.type(screen.getByRole('searchbox'), 'tomás')
    expect(screen.getAllByRole('row')).toHaveLength(2)
    expect(screen.queryByText('Registró un pago')).not.toBeInTheDocument()
  })

  test('CP-164 · sin movimientos muestra "Sin registros"', async () => {
    apiFalsa({ 'GET /bitacora': { body: [] } })
    mostrar()

    expect(await screen.findByText('Sin registros')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

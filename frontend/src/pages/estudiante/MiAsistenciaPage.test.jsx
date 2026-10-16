import { describe, expect, test } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext'
import MiAsistenciaPage from './MiAsistenciaPage'
import { apiFalsa, iniciarSesionComo } from '../../test/api-falsa'

function mostrar() {
  iniciarSesionComo({ id: 'e1', nombre: 'Ana', rol: 'ESTUDIANTE' })
  render(
    <AuthProvider>
      <MemoryRouter>
        <MiAsistenciaPage />
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('RF-11 · HU-11: mi asistencia (pantalla)', () => {
  test('CP-144 · muestra el porcentaje y cada clase con su estado (asistió, faltó o sin registrar)', async () => {
    apiFalsa({
      'GET /asistencias/mias': {
        body: {
          resumen: { asistio: 1, inasistencia: 1, excusa: 0, sinRegistrar: 1, porcentajeAsistencia: 50 },
          registros: [
            { claseId: 'c3', ritmo: 'Tango', salon: 'Salón 1', profesor: 'Carlos', fechaHoraInicio: '2026-10-14T23:00:00.000Z', estado: null },
            { claseId: 'c2', ritmo: 'Bachata', salon: 'Salón 2', profesor: 'Laura', fechaHoraInicio: '2026-10-10T23:00:00.000Z', estado: 'INASISTENCIA' },
            { claseId: 'c1', ritmo: 'Salsa', salon: 'Salón 1', profesor: 'Carlos', fechaHoraInicio: '2026-10-05T23:00:00.000Z', estado: 'ASISTIO' },
          ],
        },
      },
    })
    mostrar()

    const filas = await screen.findAllByRole('row')
    expect(filas).toHaveLength(4) // encabezado + 3 clases
    expect(within(filas[1]).getByText('Sin registrar')).toBeInTheDocument()
    expect(within(filas[2]).getByText('Faltó')).toBeInTheDocument()
    expect(within(filas[3]).getByText('Asistió')).toBeInTheDocument()
    expect(screen.getByText('% de asistencia')).toBeInTheDocument()
  })

  test('CP-145 · sin historial muestra un mensaje en vez de la tabla', async () => {
    apiFalsa({
      'GET /asistencias/mias': { body: { resumen: { asistio: 0, inasistencia: 0, excusa: 0, sinRegistrar: 0, porcentajeAsistencia: null }, registros: [] } },
    })
    mostrar()

    expect(await screen.findByText('Todavía no tienes historial')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

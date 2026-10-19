import { describe, expect, test } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../context/AuthContext'
import ReporteAsistencia from './ReporteAsistencia'
import { apiFalsa, iniciarSesionComo } from '../test/api-falsa'

const RANGO = { desde: '2026-10-01', hasta: '2026-10-16' }

function mostrar() {
  iniciarSesionComo({ id: 'a1', nombre: 'Admin', rol: 'ADMIN_ACADEMIA' })
  render(
    <AuthProvider>
      <ReporteAsistencia rango={RANGO} />
    </AuthProvider>
  )
}

describe('OE-4 · RF-20: reporte de asistencia (pantalla)', () => {
  test('CP-177 · muestra el resumen, marca en rojo a quien falta mucho y cambia a la vista por clase', async () => {
    apiFalsa({
      'GET /reportes/asistencia': {
        body: {
          ...RANGO,
          resumen: { clases: 2, clasesSinRegistrar: 0, asistio: 3, inasistencia: 1, excusa: 0, sinRegistrar: 0, porcentajeAsistencia: 75 },
          porClase: [
            { claseId: 'c2', ritmo: 'Bachata', salon: 'Salón 2', profesor: 'Laura', fechaHoraInicio: '2026-10-15T23:00:00.000Z', inscritos: 2, asistio: 1, inasistencia: 1, excusa: 0, sinRegistrar: 0, porcentajeAsistencia: 50 },
            { claseId: 'c1', ritmo: 'Salsa', salon: 'Salón 1', profesor: 'Carlos', fechaHoraInicio: '2026-10-10T23:00:00.000Z', inscritos: 2, asistio: 2, inasistencia: 0, excusa: 0, sinRegistrar: 0, porcentajeAsistencia: 100 },
          ],
          porEstudiante: [
            { estudianteId: 'e2', nombre: 'Beto', clases: 2, asistio: 1, inasistencia: 1, excusa: 0, sinRegistrar: 0, porcentajeAsistencia: 50 },
            { estudianteId: 'e1', nombre: 'Ana', clases: 2, asistio: 2, inasistencia: 0, excusa: 0, sinRegistrar: 0, porcentajeAsistencia: 100 },
          ],
        },
      },
    })
    mostrar()

    expect(await screen.findByText('75%')).toBeInTheDocument()
    const filas = screen.getAllByRole('row')
    expect(within(filas[1]).getByText('Beto')).toBeInTheDocument()
    expect(within(filas[1]).getByText('50%').className).toMatch(/red/)
    expect(within(filas[2]).getByText('100%').className).toMatch(/green/)

    await userEvent.click(screen.getByRole('button', { name: 'Por clase' }))
    expect(screen.getByText('Bachata')).toBeInTheDocument()
    expect(screen.queryByText('Beto')).not.toBeInTheDocument()
  })

  test('CP-178 · sin clases en el rango muestra un mensaje en vez de la tabla', async () => {
    apiFalsa({
      'GET /reportes/asistencia': {
        body: { ...RANGO, resumen: { clases: 0, clasesSinRegistrar: 0, asistio: 0, inasistencia: 0, excusa: 0, sinRegistrar: 0, porcentajeAsistencia: null }, porClase: [], porEstudiante: [] },
      },
    })
    mostrar()

    expect(await screen.findByText('Sin clases en ese rango')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

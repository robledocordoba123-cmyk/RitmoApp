import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AuthProvider } from '../../context/AuthContext'
import AsistenciaPage from './AsistenciaPage'
import { apiFalsa, llamadasA, iniciarSesionComo } from '../../test/api-falsa'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

function mostrarAsistencia() {
  iniciarSesionComo({ id: 'p1', nombre: 'Profe Salsa', rol: 'PROFESOR' })
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/profesor/clases/c1/asistencia']}>
        <Routes>
          <Route path="/profesor/clases/:id/asistencia" element={<AsistenciaPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )
}

const INSCRITOS = [
  { estudianteId: 'e1', nombre: 'Ana Gómez', email: 'ana@ritmo.test', estadoAsistencia: null },
  { estudianteId: 'e2', nombre: 'Zoe Restrepo', email: 'zoe@ritmo.test', estadoAsistencia: 'EXCUSA' },
]

describe('RF-16 · HU-16: registrar asistencia (pantalla)', () => {
  test('CP-137 · DEF-04: si la API rechaza la clase, muestra el motivo en vez de quedarse cargando', async () => {
    apiFalsa({ 'GET /clases/c1/inscritos': { status: 403, body: { error: 'Solo el profesor asignado a esta clase puede ver la lista de inscritos.' } } })
    mostrarAsistencia()

    expect(await screen.findByText('No se pudo abrir esta clase')).toBeInTheDocument()
    expect(screen.getByText('Solo el profesor asignado a esta clase puede ver la lista de inscritos.')).toBeInTheDocument()
  })

  test('CP-138 · muestra los inscritos y guarda la asistencia marcada por el profesor', async () => {
    const fetchFalso = apiFalsa({
      'GET /clases/c1/inscritos': { body: INSCRITOS },
      'POST /clases/c1/asistencia': { body: [] },
    })
    mostrarAsistencia()

    expect(await screen.findByText('Ana Gómez')).toBeInTheDocument()
    const botonesAna = screen.getAllByRole('button', { name: 'Inasistencia' })
    await userEvent.click(botonesAna[0])
    await userEvent.click(screen.getByRole('button', { name: /guardar asistencia/i }))

    expect(llamadasA(fetchFalso, 'POST', '/clases/c1/asistencia')[0].body).toEqual({
      asistencias: [
        { estudianteId: 'e1', estado: 'INASISTENCIA' },
        { estudianteId: 'e2', estado: 'EXCUSA' },
      ],
    })
    expect(toast.success).toHaveBeenCalledWith('Asistencia guardada.')
  })
})

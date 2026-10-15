import { describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AuthProvider } from '../../context/AuthContext'
import CatalogoPage from './CatalogoPage'
import { apiFalsa, llamadasA, iniciarSesionComo } from '../../test/api-falsa'

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const CLASES = [
  { id: 'c1', ritmo: { id: 'r1', nombre: 'Salsa' }, salon: { nombre: 'Salón 1' }, profesor: { nombre: 'Carlos' }, fechaHoraInicio: '2027-01-10T23:00:00.000Z', cupoMaximo: 10, cuposDisponibles: 3 },
  { id: 'c2', ritmo: { id: 'r2', nombre: 'Bachata' }, salon: { nombre: 'Salón 2' }, profesor: { nombre: 'Laura' }, fechaHoraInicio: '2027-01-11T23:00:00.000Z', cupoMaximo: 8, cuposDisponibles: 0 },
]

function membresia(estado) {
  return estado === 'AL_DIA'
    ? { estado, vigenteHasta: '2027-02-01T12:00:00.000Z', diasRestantes: 20 }
    : { estado, vigenteHasta: '2026-09-01T12:00:00.000Z', diasRestantes: 0 }
}

function mostrarCatalogo() {
  iniciarSesionComo({ id: 'e1', nombre: 'Ana', rol: 'ESTUDIANTE' })
  render(
    <AuthProvider>
      <MemoryRouter>
        <CatalogoPage />
      </MemoryRouter>
    </AuthProvider>
  )
}

// La tarjeta de una clase, para buscar solo dentro de ella. El nombre del
// ritmo también sale en el filtro (<option>), por eso se toma el que es <p>.
function tarjetaDe(ritmo) {
  return screen.getAllByText(ritmo).find((el) => el.tagName === 'P').closest('div.pt-5')
}

describe('RF-09 · HU-09: reservar desde el catálogo (pantalla)', () => {
  test('CP-127 · muestra los cupos y no deja reservar una clase llena', async () => {
    apiFalsa({ 'GET /clases': { body: CLASES }, 'GET /pagos/mios': { body: { membresia: membresia('AL_DIA'), pagos: [] } } })
    mostrarCatalogo()

    await screen.findByRole('button', { name: 'Reservar' })
    expect(within(tarjetaDe('Salsa')).getByText('3 cupos disponibles de 10')).toBeInTheDocument()
    expect(within(tarjetaDe('Salsa')).getByRole('button', { name: 'Reservar' })).toBeEnabled()
    expect(within(tarjetaDe('Bachata')).getByRole('button', { name: 'Sin cupos' })).toBeDisabled()
  })

  test('CP-128 · al reservar envía la clase elegida, confirma y vuelve a cargar los cupos', async () => {
    const fetchFalso = apiFalsa({
      'GET /clases': { body: CLASES },
      'GET /pagos/mios': { body: { membresia: membresia('AL_DIA'), pagos: [] } },
      'POST /reservas': { status: 201, body: { id: 'r-nueva' } },
    })
    mostrarCatalogo()

    await userEvent.click(await screen.findByRole('button', { name: 'Reservar' }))

    expect(llamadasA(fetchFalso, 'POST', '/reservas')[0].body).toEqual({ claseId: 'c1' })
    expect(toast.success).toHaveBeenCalledWith('¡Reserva confirmada!')
    expect(llamadasA(fetchFalso, 'GET', '/clases')).toHaveLength(2)
  })

  test('CP-129 · si la API rechaza la reserva, muestra su mensaje', async () => {
    apiFalsa({
      'GET /clases': { body: CLASES },
      'GET /pagos/mios': { body: { membresia: membresia('AL_DIA'), pagos: [] } },
      'POST /reservas': { status: 409, body: { error: 'Ya tienes una reserva en esta clase.' } },
    })
    mostrarCatalogo()

    await userEvent.click(await screen.findByRole('button', { name: 'Reservar' }))

    expect(toast.error).toHaveBeenCalledWith('Ya tienes una reserva en esta clase.')
  })

  test('CP-130 · RN-05: con la membresía vencida avisa y bloquea las reservas', async () => {
    apiFalsa({ 'GET /clases': { body: CLASES }, 'GET /pagos/mios': { body: { membresia: membresia('VENCIDA'), pagos: [] } } })
    mostrarCatalogo()

    expect(await screen.findByRole('alert')).toHaveTextContent('Tu membresía venció')
    expect(within(tarjetaDe('Salsa')).getByRole('button', { name: 'Membresía vencida' })).toBeDisabled()
  })
})

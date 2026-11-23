import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext'
import TarifasPage from './TarifasPage'
import { apiFalsa, iniciarSesionComo, llamadasA } from '../../test/api-falsa'

const MENSUALIDAD = { id: 't1', nombre: 'Mensualidad', valor: 120000, duracionDias: 30, activa: true }

function mostrarTarifas() {
  iniciarSesionComo({ id: 'a1', nombre: 'Admin', rol: 'ADMIN_ACADEMIA' })
  render(
    <AuthProvider>
      <MemoryRouter>
        <TarifasPage />
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('RF-18 · HU-18: editar una tarifa (pantalla)', () => {
  test('CP-234 · HU-18-CA-03: el administrador cambia el valor de una tarifa y la pantalla envía solo esa tarifa', async () => {
    let tarifas = [MENSUALIDAD]
    const fetchFalso = apiFalsa({
      'GET /tarifas': () => ({ body: tarifas }),
      'PUT /tarifas/t1': (opciones) => {
        tarifas = [{ ...MENSUALIDAD, ...JSON.parse(opciones.body) }]
        return { body: tarifas[0] }
      },
    })
    const usuario = userEvent.setup()
    mostrarTarifas()

    await usuario.click(await screen.findByRole('button', { name: 'Editar Mensualidad' }))
    const formulario = screen.getByRole('form', { name: 'Editar Mensualidad' })
    expect(formulario).toHaveTextContent('Los pagos ya registrados conservan el valor con el que se pagaron.')

    const valor = screen.getByLabelText('Valor en pesos')
    await usuario.clear(valor)
    await usuario.type(valor, '150000')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText(/150\.000/)).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Editar Mensualidad' })).not.toBeInTheDocument()
    const [edicion] = llamadasA(fetchFalso, 'PUT', '/tarifas/t1')
    expect(edicion.body).toEqual({ nombre: 'Mensualidad', valor: 150000, duracionDias: 30 })
  })

  test('CP-235 · cancelar la edición no envía nada y deja la tarifa como estaba', async () => {
    const fetchFalso = apiFalsa({ 'GET /tarifas': { body: [MENSUALIDAD] } })
    const usuario = userEvent.setup()
    mostrarTarifas()

    await usuario.click(await screen.findByRole('button', { name: 'Editar Mensualidad' }))
    await usuario.clear(screen.getByLabelText('Valor en pesos'))
    await usuario.type(screen.getByLabelText('Valor en pesos'), '1')
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByText(/120\.000/)).toBeInTheDocument()
    expect(llamadasA(fetchFalso, 'PUT', '/tarifas/t1')).toHaveLength(0)
  })
})

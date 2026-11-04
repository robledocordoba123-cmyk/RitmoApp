import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import RegistroEstudiantePage from './RegistroEstudiantePage'
import CodigoInvitacion from '../components/CodigoInvitacion'
import { apiFalsa, iniciarSesionComo, llamadasA } from '../test/api-falsa'

function mostrar(ruta, elemento = <RegistroEstudiantePage />) {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path={ruta.split('?')[0]} element={elemento} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )
}

async function llenar(usuario) {
  await usuario.type(screen.getByLabelText('Tu nombre'), 'Sara Ríos')
  await usuario.type(screen.getByLabelText('Correo'), 'sara@estudiante.test')
  await usuario.type(screen.getByLabelText('Contraseña'), 'Prueba123!')
}

describe('HU-22: registro de estudiantes con código de invitación (pantallas)', () => {
  test('CP-230 · HU-22-CA-01: con el código del enlace muestra la academia, crea la cuenta y pide revisar el correo', async () => {
    const fetchFalso = apiFalsa({
      'GET /auth/invitacion/ABCD2345': { status: 200, body: { academia: 'Academia Son Caleño' } },
      'POST /auth/registro-estudiante': { status: 201, body: { academia: 'Academia Son Caleño', confirmacionPendiente: true, email: 'sara@estudiante.test' } },
    })
    const usuario = userEvent.setup()
    mostrar('/registro-estudiante?codigo=ABCD2345')

    expect(await screen.findByText('Te vas a registrar en Academia Son Caleño')).toBeInTheDocument()
    await llenar(usuario)
    await usuario.click(screen.getByRole('checkbox', { name: /Acepto la/ }))
    await usuario.click(screen.getByRole('button', { name: /Crear mi cuenta/ }))

    expect(await screen.findByText('Revisa tu correo')).toBeInTheDocument()
    const [envio] = llamadasA(fetchFalso, 'POST', '/auth/registro-estudiante')
    expect(envio.body).toMatchObject({ codigo: 'ABCD2345', nombre: 'Sara Ríos', email: 'sara@estudiante.test', aceptaPoliticaDatos: true, menorDeEdad: false })
  })

  test('CP-231 · HU-22-CA-02: un código que no sirve se explica y la API rechaza el registro', async () => {
    apiFalsa({
      'GET /auth/invitacion/VIEJO123': { status: 404, body: { error: 'El código de invitación no es válido o ya venció. Pide uno nuevo a tu academia.' } },
      'POST /auth/registro-estudiante': { status: 400, body: { error: 'El código de invitación no es válido o ya venció. Pide uno nuevo a tu academia.' } },
    })
    const usuario = userEvent.setup()
    mostrar('/registro-estudiante?codigo=VIEJO123')

    expect(await screen.findByText(/Pide uno nuevo a tu academia/)).toBeInTheDocument()
    await llenar(usuario)
    await usuario.click(screen.getByRole('checkbox', { name: /Acepto la/ }))
    await usuario.click(screen.getByRole('button', { name: /Crear mi cuenta/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/no es válido o ya venció/)
    expect(screen.queryByText('Revisa tu correo')).not.toBeInTheDocument()
  })

  test('CP-232 · HU-22-CA-03: si es menor de edad pide y envía la autorización de su representante', async () => {
    const fetchFalso = apiFalsa({
      'GET /auth/invitacion/ABCD2345': { status: 200, body: { academia: 'Academia Son Caleño' } },
      'POST /auth/registro-estudiante': { status: 201, body: { academia: 'Academia Son Caleño', confirmacionPendiente: true, email: 'sara@estudiante.test' } },
    })
    const usuario = userEvent.setup()
    mostrar('/registro-estudiante?codigo=ABCD2345')

    await screen.findByText('Te vas a registrar en Academia Son Caleño')
    expect(screen.queryByRole('checkbox', { name: /representante legal/ })).not.toBeInTheDocument()
    await llenar(usuario)
    await usuario.click(screen.getByRole('checkbox', { name: 'Soy menor de edad' }))
    const autorizacion = screen.getByRole('checkbox', { name: /representante legal/ })
    expect(autorizacion).toBeRequired()
    await usuario.click(autorizacion)
    await usuario.click(screen.getByRole('checkbox', { name: /Acepto la/ }))
    await usuario.click(screen.getByRole('button', { name: /Crear mi cuenta/ }))

    await screen.findByText('Revisa tu correo')
    expect(llamadasA(fetchFalso, 'POST', '/auth/registro-estudiante')[0].body).toMatchObject({ menorDeEdad: true, autorizaRepresentante: true })
  })

  test('CP-233 · el administrador genera el código y ve el enlace para compartir', async () => {
    iniciarSesionComo({ id: 'a1', nombre: 'Admin', rol: 'ADMIN_ACADEMIA', tenantId: 't1' })
    const venceEn = new Date(Date.now() + 30 * 864e5).toISOString()
    const fetchFalso = apiFalsa({
      'GET /invitacion': { status: 200, body: { codigo: null, venceEn: null, vigente: false } },
      'POST /invitacion': { status: 201, body: { codigo: 'ABCD2345', venceEn, vigente: true } },
    })
    const usuario = userEvent.setup()
    mostrar('/admin/equipo', <CodigoInvitacion />)

    await usuario.click(await screen.findByRole('button', { name: /Generar código/ }))
    expect(await screen.findByLabelText('Código de invitación')).toHaveTextContent('ABCD2345')
    expect(screen.getByText(/\/registro-estudiante\?codigo=ABCD2345$/)).toBeInTheDocument()
    expect(llamadasA(fetchFalso, 'POST', '/invitacion')).toHaveLength(1)
  })
})

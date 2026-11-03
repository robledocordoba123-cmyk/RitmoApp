import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import ConfirmarCuentaPage from './ConfirmarCuentaPage'
import OnboardingPage from './OnboardingPage'
import { apiFalsa, llamadasA } from '../test/api-falsa'

function mostrar(ruta, elemento) {
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

describe('RF-06 · HU-06: confirmar la cuenta (pantallas)', () => {
  test('CP-206 · al abrir el enlace manda el token a la API y muestra la cuenta confirmada', async () => {
    const fetchFalso = apiFalsa({
      'POST /auth/confirmar': { status: 200, body: { mensaje: 'Tu cuenta quedó confirmada. Ya puedes iniciar sesión.' } },
    })
    mostrar('/confirmar-cuenta?token=abc123', <ConfirmarCuentaPage />)

    expect(await screen.findByText(/quedó confirmada/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
    expect(llamadasA(fetchFalso, 'POST', '/auth/confirmar')).toHaveLength(1)
    expect(llamadasA(fetchFalso, 'POST', '/auth/confirmar')[0].body).toEqual({ token: 'abc123' })
  })

  test('CP-207 · si el enlace venció, explica el error y deja pedir uno nuevo (HU-06-CA-03)', async () => {
    const fetchFalso = apiFalsa({
      'POST /auth/confirmar': { status: 400, body: { error: 'El enlace no es válido o ya venció. Pide uno nuevo.' } },
      'POST /auth/reenviar-confirmacion': { status: 200, body: { mensaje: 'Te enviamos un enlace nuevo.' } },
    })
    mostrar('/confirmar-cuenta?token=viejo', <ConfirmarCuentaPage />)

    expect(await screen.findByText(/ya venció/)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/enlace nuevo/), 'laura@academia.co')
    await userEvent.click(screen.getByRole('button', { name: /reenviar/i }))

    expect(await screen.findByText('Te enviamos un enlace nuevo.')).toBeInTheDocument()
    expect(llamadasA(fetchFalso, 'POST', '/auth/reenviar-confirmacion')[0].body).toEqual({ email: 'laura@academia.co' })
  })

  test('CP-208 · al registrar la academia pide revisar el correo y no abre sesión (HU-06-CA-01)', async () => {
    apiFalsa({
      'POST /auth/onboarding': {
        status: 201,
        body: { mensaje: 'Academia registrada.', confirmacionPendiente: true, email: 'laura@academia.co' },
      },
    })
    mostrar('/registro-academia', <OnboardingPage />)

    await userEvent.type(screen.getByLabelText('Nombre de la academia'), 'Salsa Viva')
    await userEvent.type(screen.getByLabelText('NIT'), '900123')
    await userEvent.type(screen.getByLabelText('Tu nombre'), 'Laura')
    await userEvent.type(screen.getByLabelText('Correo'), 'laura@academia.co')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Prueba123!')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: /crear academia/i }))

    expect(await screen.findByRole('heading', { name: 'Revisa tu correo' })).toBeInTheDocument()
    expect(screen.getByText('laura@academia.co')).toBeInTheDocument()
    expect(localStorage.getItem('ritmoapp_sesion')).toBeNull()
  })
})

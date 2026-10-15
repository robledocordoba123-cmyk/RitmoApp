import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import LoginPage from './LoginPage'
import { apiFalsa, llamadasA } from '../test/api-falsa'

function mostrarLogin() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/estudiante/inicio" element={<p>Panel del estudiante</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('RF-04 · HU-04: inicio de sesión (pantalla)', () => {
  test('CP-124 · los campos se encuentran por su etiqueta (accesibilidad, PR #14)', () => {
    apiFalsa({})
    mostrarLogin()

    expect(screen.getByLabelText('Correo')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
  })

  test('CP-125 · con datos correctos inicia sesión, guarda la sesión y lleva al panel del rol', async () => {
    const fetchFalso = apiFalsa({
      'POST /auth/login': { status: 200, body: { token: 't-123', usuario: { id: 'u1', nombre: 'Ana', rol: 'ESTUDIANTE' } } },
    })
    mostrarLogin()

    await userEvent.type(screen.getByLabelText('Correo'), 'ana@ritmo.test')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Prueba123!')
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(await screen.findByText('Panel del estudiante')).toBeInTheDocument()
    expect(llamadasA(fetchFalso, 'POST', '/auth/login')[0].body).toEqual({ email: 'ana@ritmo.test', password: 'Prueba123!' })
    expect(JSON.parse(localStorage.getItem('ritmoapp_sesion')).token).toBe('t-123')
  })

  test('CP-126 · con datos incorrectos muestra el mensaje de la API y no entra', async () => {
    apiFalsa({ 'POST /auth/login': { status: 401, body: { error: 'Correo o contraseña incorrectos.' } } })
    mostrarLogin()

    await userEvent.type(screen.getByLabelText('Correo'), 'ana@ritmo.test')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'mala')
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeInTheDocument()
    expect(screen.queryByText('Panel del estudiante')).not.toBeInTheDocument()
    expect(localStorage.getItem('ritmoapp_sesion')).toBeNull()
  })
})

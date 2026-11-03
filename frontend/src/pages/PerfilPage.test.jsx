import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import PerfilPage from './PerfilPage'
import { apiFalsa, iniciarSesionComo, llamadasA } from '../test/api-falsa'

// jsdom no dibuja en un canvas: la reducción de la foto se reemplaza por una
// que devuelve una imagen ya lista, y aquí solo se prueba la pantalla.
vi.mock('../utils/imagen', async (original) => ({
  ...(await original()),
  reducirFoto: vi.fn(async () => 'data:image/jpeg;base64,FOTOREDUCIDA'),
}))

const PERFIL = { id: 'e1', nombre: 'Ana', email: 'ana@academia.test', rol: 'ESTUDIANTE', tenantId: 't1', fotoPerfil: null }

function mostrarPerfil() {
  iniciarSesionComo({ id: 'e1', nombre: 'Ana', rol: 'ESTUDIANTE' })
  render(
    <AuthProvider>
      <MemoryRouter>
        <PerfilPage />
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('RF-07 · HU-07: mi perfil (pantalla)', () => {
  test('CP-218 · HU-07-CA-01: guarda el nombre y la foto nuevos y actualiza la sesión', async () => {
    const fetchFalso = apiFalsa({
      'GET /perfil': { body: PERFIL },
      'PATCH /perfil': (op) => ({ body: { ...PERFIL, ...JSON.parse(op.body) } }),
    })
    mostrarPerfil()
    const usuario = userEvent.setup()

    const nombre = await screen.findByLabelText('Nombre')
    await usuario.clear(nombre)
    await usuario.type(nombre, 'Ana María')
    await usuario.upload(screen.getByLabelText('Elegir foto de perfil'), new File(['x'], 'yo.png', { type: 'image/png' }))
    await usuario.click(screen.getByRole('button', { name: /Guardar cambios/ }))

    expect(await screen.findByRole('status')).toHaveTextContent('Tu perfil quedó actualizado.')
    const [envio] = llamadasA(fetchFalso, 'PATCH', '/perfil')
    expect(envio.body).toEqual({ nombre: 'Ana María', fotoPerfil: 'data:image/jpeg;base64,FOTOREDUCIDA' })
    expect(JSON.parse(localStorage.getItem('ritmoapp_sesion')).usuario).toMatchObject({
      nombre: 'Ana María',
      fotoPerfil: 'data:image/jpeg;base64,FOTOREDUCIDA',
    })
  })

  test('CP-219 · HU-07-CA-02: un archivo que no es JPG, PNG o WebP se rechaza y explica los formatos', async () => {
    const fetchFalso = apiFalsa({ 'GET /perfil': { body: PERFIL } })
    mostrarPerfil()
    // applyAccept: false simula a alguien que elige "Todos los archivos" en el selector.
    const usuario = userEvent.setup({ applyAccept: false })

    await screen.findByLabelText('Nombre')
    await usuario.upload(screen.getByLabelText('Elegir foto de perfil'), new File(['x'], 'animacion.gif', { type: 'image/gif' }))

    expect(screen.getByRole('alert')).toHaveTextContent('JPG, PNG o WebP')
    expect(llamadasA(fetchFalso, 'PATCH', '/perfil')).toHaveLength(0)
  })

  test('CP-220 · HU-07-CA-03: el correo se muestra pero no se puede editar', async () => {
    apiFalsa({ 'GET /perfil': { body: PERFIL } })
    mostrarPerfil()

    const correo = await screen.findByLabelText('Correo')
    expect(correo).toHaveValue('ana@academia.test')
    expect(correo).toBeDisabled()
    expect(screen.getByText(/no se puede cambiar aquí/)).toBeInTheDocument()
  })
})

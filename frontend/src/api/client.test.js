import { describe, expect, test, vi } from 'vitest'
import { api, ApiError, cuandoVenzaLaSesion } from './client'
import { apiFalsa, llamadasA } from '../test/api-falsa'

describe('Cliente de la API', () => {
  test('CP-121 · envía el token y el cuerpo en JSON', async () => {
    const fetchFalso = apiFalsa({ 'POST /reservas': { status: 201, body: { id: 'r1' } } })

    const res = await api.post('/reservas', { claseId: 'c1' }, 'mi-token')

    expect(res).toEqual({ id: 'r1' })
    const [llamada] = llamadasA(fetchFalso, 'POST', '/reservas')
    expect(llamada.headers.Authorization).toBe('Bearer mi-token')
    expect(llamada.body).toEqual({ claseId: 'c1' })
  })

  test('CP-122 · un error de la API llega con el mensaje y el código que mandó el backend', async () => {
    apiFalsa({ 'POST /reservas': { status: 409, body: { error: 'Ya tienes una reserva en esta clase.' } } })

    const error = await api.post('/reservas', { claseId: 'c1' }, 'mi-token').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.message).toBe('Ya tienes una reserva en esta clase.')
    expect(error.status).toBe(409)
  })

  test('CP-123 · un 401 con sesión abierta avisa que la sesión venció; sin sesión, no', async () => {
    const alVencer = vi.fn()
    cuandoVenzaLaSesion(alVencer)
    apiFalsa({ 'GET /pagos/mios': { status: 401, body: { error: 'Token inválido.' } }, 'POST /auth/login': { status: 401, body: { error: 'Credenciales inválidas.' } } })

    await api.get('/pagos/mios', 'token-vencido').catch(() => {})
    expect(alVencer).toHaveBeenCalledTimes(1)

    await api.post('/auth/login', { email: 'a@b.co', password: 'x' }).catch(() => {})
    expect(alVencer).toHaveBeenCalledTimes(1)
  })
})

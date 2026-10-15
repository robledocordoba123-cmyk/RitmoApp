import { vi } from 'vitest'

// Reemplaza fetch por una API falsa. `rutas` relaciona "MÉTODO /ruta" con la
// respuesta: { status, body }. Devuelve el mock para revisar qué se llamó.
export function apiFalsa(rutas) {
  const fetchFalso = vi.fn(async (url, opciones = {}) => {
    const ruta = url.replace(/^\/api/, '').split('?')[0]
    const clave = `${opciones.method || 'GET'} ${ruta}`
    const respuesta = rutas[clave] ?? (ruta === '/health' ? { status: 200, body: { ok: true } } : null)
    if (!respuesta) throw new Error(`La prueba no esperaba la petición ${clave}`)
    const { status = 200, body = null } = typeof respuesta === 'function' ? respuesta(opciones) : respuesta
    return { ok: status >= 200 && status < 300, status, json: async () => body }
  })
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

// Peticiones hechas a una ruta, con el cuerpo ya convertido a objeto.
export function llamadasA(fetchFalso, metodo, ruta) {
  return fetchFalso.mock.calls
    .filter(([url, op = {}]) => (op.method || 'GET') === metodo && url.replace(/^\/api/, '').split('?')[0] === ruta)
    .map(([url, op = {}]) => ({ url, headers: op.headers, body: op.body ? JSON.parse(op.body) : undefined }))
}

export function iniciarSesionComo(usuario) {
  localStorage.setItem('ritmoapp_sesion', JSON.stringify({ token: 'token-de-prueba', usuario }))
}

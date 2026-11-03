import { useEffect, useRef, useState } from 'react'
import { Camera, Save, Trash2, Mail } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import Avatar from '../components/Avatar'
import { FORMATOS_VALIDOS, formatoPermitido, reducirFoto } from '../utils/imagen'

const CLASE_INPUT =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'

// RF-07 · HU-07 · UI-30: cada usuario, de cualquier rol, edita su nombre y su
// foto. El correo se muestra pero no se edita (HU-07-CA-03).
export default function PerfilPage() {
  const { token, actualizarUsuario } = useAuth()
  const [perfil, setPerfil] = useState(null)
  const [nombre, setNombre] = useState('')
  const [foto, setFoto] = useState(null)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [guardando, setGuardando] = useState(false)
  const selectorArchivo = useRef(null)

  useEffect(() => {
    api
      .get('/perfil', token)
      .then((datos) => {
        setPerfil(datos)
        setNombre(datos.nombre)
        setFoto(datos.fotoPerfil)
      })
      .catch((e) => setError(e.message))
  }, [token])

  async function elegirFoto(e) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    setMensaje('')
    // HU-07-CA-02: se avisa antes de intentar subir algo que la API rechazaría.
    if (!formatoPermitido(archivo)) {
      setError(`Ese archivo no es una imagen permitida. Usa una foto en ${FORMATOS_VALIDOS}.`)
      return
    }
    try {
      setFoto(await reducirFoto(archivo))
      setError('')
    } catch {
      setError('No pudimos leer esa imagen. Prueba con otra foto.')
    }
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    setError('')
    setMensaje('')
    try {
      const actualizado = await api.patch('/perfil', { nombre, fotoPerfil: foto }, token)
      setPerfil(actualizado)
      actualizarUsuario({ nombre: actualizado.nombre, fotoPerfil: actualizado.fotoPerfil })
      setMensaje('Tu perfil quedó actualizado.')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Mi perfil" subtitle="Tu nombre y tu foto se ven en el menú y en las listas de tu academia." />

      <Card>
        <CardHeader title="Datos personales" />
        <CardBody>
          {perfil === null && !error ? (
            <p className="text-sm text-gray-500">Cargando tu perfil…</p>
          ) : (
            <form onSubmit={guardar} className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar nombre={nombre} foto={foto} tamano="h-20 w-20 text-xl" />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" icon={Camera} onClick={() => selectorArchivo.current?.click()}>
                    Cambiar foto
                  </Button>
                  {foto && (
                    <Button type="button" variant="ghost" icon={Trash2} onClick={() => setFoto(null)}>
                      Quitar foto
                    </Button>
                  )}
                  <input
                    ref={selectorArchivo}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Elegir foto de perfil"
                    className="hidden"
                    onChange={elegirFoto}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Formatos permitidos: {FORMATOS_VALIDOS}.</p>

              <div>
                <label htmlFor="perfil-nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre
                </label>
                <input
                  id="perfil-nombre"
                  required
                  maxLength={80}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className={CLASE_INPUT}
                />
              </div>

              <div>
                <label htmlFor="perfil-correo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Correo
                </label>
                <input id="perfil-correo" value={perfil?.email || ''} readOnly disabled className={`${CLASE_INPUT} opacity-70`} />
                <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Mail size={12} /> Es tu usuario para iniciar sesión, por eso no se puede cambiar aquí.
                </p>
              </div>

              {error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                  {error}
                </p>
              )}
              {mensaje && (
                <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                  {mensaje}
                </p>
              )}

              <Button type="submit" icon={Save} disabled={guardando || !perfil}>
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

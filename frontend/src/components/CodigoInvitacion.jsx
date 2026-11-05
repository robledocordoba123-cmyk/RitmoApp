import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Ticket, RefreshCw, Copy, PowerOff } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Card, CardHeader, CardBody } from './ui/Card'
import Button from './ui/Button'

const FECHA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' })

// HU-22 (en la pantalla Equipo, UI-15): el administrador genera el código que
// comparte con sus estudiantes para que se registren solos. Generar otro deja
// sin servir el anterior; desactivarlo cierra el registro hasta generar uno.
export default function CodigoInvitacion() {
  const { token } = useAuth()
  const [invitacion, setInvitacion] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    api.get('/invitacion', token).then(setInvitacion).catch((err) => toast.error(err.message))
  }, [token])

  async function cambiar(accion) {
    setOcupado(true)
    try {
      const nueva = accion === 'generar' ? await api.post('/invitacion', {}, token) : await api.delete('/invitacion', token)
      setInvitacion(nueva)
      toast.success(accion === 'generar' ? 'Código listo para compartir.' : 'El código quedó desactivado.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setOcupado(false)
    }
  }

  const enlace = invitacion?.vigente ? `${window.location.origin}/registro-estudiante?codigo=${invitacion.codigo}` : ''

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace)
      toast.success('Enlace copiado.')
    } catch {
      toast.error('No se pudo copiar. Copia el enlace a mano.')
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader title="Código de invitación para estudiantes" />
      <CardBody>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Compártelo con tus estudiantes para que creen su cuenta solos. Siempre quedan como estudiantes de tu academia y deben
          confirmar su correo. Los profesores los sigues agregando tú.
        </p>
        {invitacion === null ? (
          <p className="text-sm text-gray-500">Cargando…</p>
        ) : invitacion.vigente ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span aria-label="Código de invitación" className="font-mono text-2xl font-semibold tracking-widest text-indigo-700 dark:text-indigo-300">
                {invitacion.codigo}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Vence el {FECHA.format(new Date(invitacion.venceEn))}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 break-all">{enlace}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" icon={Copy} onClick={() => void copiar()}>Copiar enlace</Button>
              <Button type="button" variant="secondary" icon={RefreshCw} disabled={ocupado} onClick={() => void cambiar('generar')}>
                Generar otro
              </Button>
              <Button type="button" variant="danger" icon={PowerOff} disabled={ocupado} onClick={() => void cambiar('desactivar')}>
                Desactivar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {invitacion.codigo ? 'El código anterior venció.' : 'Tu academia no tiene un código activo.'}
            </p>
            <Button type="button" icon={Ticket} disabled={ocupado} onClick={() => void cambiar('generar')}>
              Generar código
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

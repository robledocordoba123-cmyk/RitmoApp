import { describe, expect, test } from 'vitest'
import { pesos, ESTADOS_MEMBRESIA, MEDIOS_DE_PAGO } from './formato'
import { rutaInicioPara } from '../rutas'

describe('Formatos y rutas que usan varias pantallas', () => {
  test('CP-118 · muestra los valores en pesos colombianos sin decimales', () => {
    expect(pesos(120000)).toMatch(/\$\s?120\.000$/)
    expect(pesos(0)).toMatch(/\$\s?0$/)
  })

  test('CP-119 · cada estado de membresía y cada medio de pago tiene su texto', () => {
    expect(Object.keys(ESTADOS_MEMBRESIA)).toEqual(['AL_DIA', 'VENCIDA', 'SIN_PAGOS'])
    expect(ESTADOS_MEMBRESIA.VENCIDA).toEqual({ texto: 'Vencida', color: 'red' })
    expect(MEDIOS_DE_PAGO.TRANSFERENCIA).toBe('Transferencia')
  })

  test('CP-120 · después del login cada rol va a su propio panel', () => {
    expect(rutaInicioPara('SUPERADMIN')).toBe('/superadmin/inicio')
    expect(rutaInicioPara('ADMIN_ACADEMIA')).toBe('/admin/inicio')
    expect(rutaInicioPara('PROFESOR')).toBe('/profesor/inicio')
    expect(rutaInicioPara('ESTUDIANTE')).toBe('/estudiante/inicio')
    expect(rutaInicioPara('OTRO')).toBe('/login')
  })
})

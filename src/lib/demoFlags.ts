import { useMemo } from 'react'
import { useLocation } from 'react-router'
import { restaurant } from './catalog'
import { readItem, writeItem } from './storage'

/**
 * Flags de la demo, por URL. Se guardan en la sesión para que sigan
 * activos al navegar entre pantallas.
 *   ?forzar=cerrado   menú fuera de horario (M8)
 *   ?forzar=abierto   abierto aunque sea fuera de horario
 *   ?forzar=agotado   se acaba una parte del plato de la comanda en curso (M4g);
 *                     se usa una vez y no cambia el forzado abierto/cerrado
 *   ?forzar=ninguno   quita todos los forzados
 *   ?compas=0         sin compañeros de mesa simulados (Carlos, Teléfono 3)
 *   ?dia=martes       el menú se comporta como si hoy fuera ese día (combos del día);
 *                     acepta el nombre o el número (0 = domingo); ?dia=hoy lo quita
 */
export interface DemoFlags {
  horario: 'cerrado' | 'abierto' | null
  agotado: boolean
  compas: boolean
  /** Día de la semana forzado (0 = domingo), o null para usar el real. */
  dia: number | null
}

const KEY = `${restaurant.id}:demo`
const DEFAULTS: DemoFlags = { horario: null, agotado: false, compas: true, dia: null }

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

/** "martes", "Sábado", "2" → número de día; "hoy" o algo inválido → null. */
function parseDay(value: string | null): number | null {
  if (!value) return null
  const v = value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
  if (/^[0-6]$/.test(v)) return Number(v)
  const index = DAY_NAMES.indexOf(v)
  return index >= 0 ? index : null
}

function stored(): DemoFlags {
  try {
    return { ...DEFAULTS, ...JSON.parse(readItem('session', KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

const save = (flags: DemoFlags) => writeItem('session', KEY, JSON.stringify(flags))

/** Lee los flags de la URL (si hay) y los combina con los guardados. */
export function readDemoFlags(search: string = window.location.search): DemoFlags {
  const params = new URLSearchParams(search)
  const flags = stored()
  let changed = false
  for (const value of params.getAll('forzar')) {
    changed = true
    if (value === 'cerrado' || value === 'abierto') flags.horario = value
    else if (value === 'agotado') flags.agotado = true
    else {
      flags.horario = null
      flags.agotado = false
      flags.dia = null
    }
  }
  if (params.has('dia')) {
    flags.dia = parseDay(params.get('dia'))
    changed = true
  }
  if (params.has('compas')) {
    flags.compas = params.get('compas') !== '0'
    changed = true
  }
  if (changed) save(flags)
  return flags
}

/** "Agotado" se usa una sola vez: después de mostrarlo se apaga. */
export function clearAgotado(): void {
  save({ ...stored(), agotado: false })
}

export function useDemoFlags(): DemoFlags {
  const { search } = useLocation()
  return useMemo(() => readDemoFlags(search), [search])
}

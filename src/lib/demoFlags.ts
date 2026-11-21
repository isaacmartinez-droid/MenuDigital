import { useMemo } from 'react'
import { useLocation } from 'react-router'
import { restaurant } from './catalog'
import { readItem, writeItem } from './storage'

/**
 * Flags de la demo, por URL. Se guardan en la sesión para que sigan
 * activos al navegar entre pantallas.
 *   ?forzar=cerrado   menú fuera de horario (M8)
 *   ?forzar=abierto   abierto aunque sea fuera de horario
 *   ?forzar=agotado   se acaba un acompañante de la comanda en curso (M4g)
 *   ?forzar=ninguno   quita el forzado
 *   ?compas=0         sin compañeros de mesa simulados (Carlos, Teléfono 3)
 */
export type Forzar = 'cerrado' | 'abierto' | 'agotado' | null

export interface DemoFlags {
  forzar: Forzar
  compas: boolean
}

const KEY = `${restaurant.id}:demo`
const DEFAULTS: DemoFlags = { forzar: null, compas: true }
const FORZAR_VALUES = ['cerrado', 'abierto', 'agotado']

function stored(): DemoFlags {
  try {
    return { ...DEFAULTS, ...JSON.parse(readItem('session', KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

/** Lee los flags de la URL (si hay) y los combina con los guardados. */
export function readDemoFlags(search: string = window.location.search): DemoFlags {
  const params = new URLSearchParams(search)
  const flags = stored()
  let changed = false
  if (params.has('forzar')) {
    const value = params.get('forzar') ?? ''
    flags.forzar = FORZAR_VALUES.includes(value) ? (value as Forzar) : null
    changed = true
  }
  if (params.has('compas')) {
    flags.compas = params.get('compas') !== '0'
    changed = true
  }
  if (changed) writeItem('session', KEY, JSON.stringify(flags))
  return flags
}

/** Consume un forzado de una sola vez (ej. "agotado" ya se mostró). */
export function clearForzar(): void {
  writeItem('session', KEY, JSON.stringify({ ...stored(), forzar: null }))
}

export function useDemoFlags(): DemoFlags {
  const { search } = useLocation()
  return useMemo(() => readDemoFlags(search), [search])
}

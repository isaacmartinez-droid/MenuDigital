import { restaurant } from './catalog'
import { readItem, writeItem } from './storage'
import type { StaffRole } from '../store/catalogEdits'

/**
 * Quién entró con su PIN en esta pestaña (P0). La barra del personal muestra su nombre
 * y el registro de cambios dice quién hizo cada cosa. Sin PIN (link directo), vale el
 * nombre de ejemplo de cada área.
 */
export interface StaffSession {
  name: string
  role: StaffRole
}

const KEY = `${restaurant.id}:personal:sesion`

export function readSession(): StaffSession | null {
  try {
    return JSON.parse(readItem('session', KEY) ?? 'null') as StaffSession | null
  } catch {
    return null
  }
}

export const saveSession = (session: StaffSession) => writeItem('session', KEY, JSON.stringify(session))

/** Nombre para el registro: quien entró con PIN o, si no, el dueño de ejemplo. */
export const actorName = () => readSession()?.name ?? restaurant.staff.owner

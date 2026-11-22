import { restaurant } from './catalog'
import { actorName } from './staffSession'
import { readItem, writeItem } from './storage'
import { fmt, t } from './text'

/**
 * Registro de cambios del panel y de caja (P4c "Registro de cambios"): quién, qué y a
 * qué hora. Se guarda en este navegador (los últimos 50). API real: GET /api/registro.
 */
export interface LogEntry {
  at: string
  who: string
  action: string
}

const KEY = `${restaurant.id}:registro`
const MAX = 50

export function readLog(): LogEntry[] {
  try {
    return JSON.parse(readItem('local', KEY) ?? '[]') as LogEntry[]
  } catch {
    return []
  }
}

type LogKey = keyof typeof t.staff.panel.log

/** Anota un cambio: logAction('dishSaved', { name: 'Quesillo' }). */
export function logAction(key: Exclude<LogKey, 'entry'>, vars: Record<string, string> = {}): void {
  const entry: LogEntry = { at: new Date().toISOString(), who: actorName(), action: fmt(t.staff.panel.log[key], vars) }
  writeItem('local', KEY, JSON.stringify([entry, ...readLog()].slice(0, MAX)))
  window.dispatchEvent(new Event('registro'))
}

/** "8:05 pm · María guardó el plato Quesillo" */
export function logLine(entry: LogEntry): string {
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: restaurant.schedule.timezone,
  })
    .format(new Date(entry.at))
    .replace(' AM', ' am')
    .replace(' PM', ' pm')
  return fmt(t.staff.panel.log.entry, { time, who: entry.who, action: entry.action })
}

/** Para que el registro se vuelva a dibujar (esta pestaña u otra). */
export function subscribeLog(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) onChange()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener('registro', onChange)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('registro', onChange)
  }
}

export const logSnapshot = () => readItem('local', KEY)

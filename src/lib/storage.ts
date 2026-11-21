import { restaurant } from './catalog'

/**
 * Acceso a localStorage/sessionStorage que nunca rompe la app
 * (modo privado, almacenamiento lleno o bloqueado).
 */
type Area = 'local' | 'session'

const area = (a: Area): Storage | null => {
  try {
    return a === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function readItem(a: Area, key: string): string | null {
  try {
    return area(a)?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function writeItem(a: Area, key: string, value: string): void {
  try {
    area(a)?.setItem(key, value)
  } catch {
    /* sin almacenamiento: la app sigue funcionando en memoria */
  }
}

export function removeItem(a: Area, key: string): void {
  try {
    area(a)?.removeItem(key)
  } catch {
    /* nada */
  }
}

/** Prefijo de todas las claves de una mesa: "fritanga-nica:mesa:5:" */
export const tablePrefix = (tableId: string) => `${restaurant.id}:mesa:${tableId}:`

/** Clave de una mesa: tableKey('5', 'pedido') → "fritanga-nica:mesa:5:pedido" */
export const tableKey = (tableId: string, name: string) => `${tablePrefix(tableId)}${name}`

/** Borra todo lo guardado de una mesa (al cerrar la cuenta). */
export function clearTableStorage(tableId: string): void {
  const prefix = tablePrefix(tableId)
  for (const a of ['local', 'session'] as const) {
    const s = area(a)
    if (!s) continue
    try {
      const keys: string[] = []
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i)
        if (k?.startsWith(prefix)) keys.push(k)
      }
      keys.forEach((k) => s.removeItem(k))
    } catch {
      /* nada */
    }
  }
}

/** Id corto y único (no depende de crypto.randomUUID, que exige HTTPS). */
export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

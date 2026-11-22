import { useMemo, useSyncExternalStore } from 'react'
import { restaurant } from './catalog'
import { parseServer, serverKey, type ServerTable } from './server'
import { readItem } from './storage'

/**
 * Lo que el personal marcó en el "servidor" de la mesa, al día: si caja la bloqueó,
 * y si el mesero aceptó o rechazó un pedido. Se entera por el evento storage (otra
 * pestaña) y, por las dudas, revisando cada pocos segundos. API real: WebSocket.
 */
export function useTableServer(tableId: string): ServerTable | null {
  const key = serverKey(tableId)
  const raw = useSyncExternalStore(
    (onChange) => {
      const onStorage = (e: StorageEvent) => {
        if (e.key === key || e.key === null) onChange()
      }
      window.addEventListener('storage', onStorage)
      const id = window.setInterval(onChange, restaurant.staffDemo.pollMs)
      return () => {
        window.removeEventListener('storage', onStorage)
        window.clearInterval(id)
      }
    },
    () => readItem('local', key),
  )
  return useMemo(() => parseServer(raw), [raw])
}

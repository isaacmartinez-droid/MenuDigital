import { useEffect } from 'react'
import { watchComanda } from './api'
import { restaurant } from './catalog'
import { notifyStatus } from './notifications'
import { fmt, t } from './text'
import { comandasStore, useComandas } from '../store/comandas'

/**
 * Sigue en cocina todas las órdenes de este teléfono que no se entregaron
 * (así el estado está al día en cualquier pantalla, también en la barra del
 * menú). Cuando una pasa a "¡Ya está!", el teléfono vibra (donde se pueda) y
 * la pestaña cambia de título hasta que se entrega.
 */
export function useKitchenUpdates(mesa: string) {
  const store = comandasStore(mesa)
  // Clave estable: cambia solo cuando entra o sale una orden en curso.
  const pending = useComandas(mesa, (s) =>
    s.comandas
      .filter((c) => c.mine && c.status !== 'entregada')
      .map((c) => c.id)
      .join(','),
  )

  useEffect(() => {
    if (!pending) return
    const stops = pending.split(',').map((id) => {
      const comanda = store.getState().comandas.find((c) => c.id === id)
      return comanda ? watchComanda(comanda, (status, times) => store.getState().setStatus(id, status, times)) : undefined
    })
    return () => stops.forEach((stop) => stop?.())
  }, [store, pending])

  useEffect(() => {
    const originalTitle = document.title
    const unsubscribe = store.subscribe((state, prev) => {
      const before = new Map(prev.comandas.map((c) => [c.id, c.status]))
      for (const c of state.comandas) {
        if (!c.mine || before.get(c.id) === c.status || !before.has(c.id)) continue
        // Aviso del sistema en cada paso (si el cliente lo activó y el paso está en la config).
        void notifyStatus(c, c.status, mesa)
        if (c.status === 'lista') {
          try {
            navigator.vibrate?.([200, 100, 200])
          } catch {
            /* sin vibración en este teléfono */
          }
          document.title = fmt(t.tracking.readyTabTitle, { name: restaurant.name })
        } else if (c.status === 'entregada') {
          document.title = originalTitle
        }
      }
    })
    return () => {
      unsubscribe()
      document.title = originalTitle
    }
  }, [store, mesa])
}

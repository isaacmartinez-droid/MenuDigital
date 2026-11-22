import { restaurant } from './catalog'
import { readItem, removeItem, writeItem } from './storage'

/**
 * ¿Hay una pantalla del personal (cocina, caja o panel) abierta en este
 * navegador? La pantalla deja una marca de hora cada pocos segundos. Si está
 * abierta cuando el cliente envía su pedido, el pedido espera a que la cocina
 * (y, para llevar, la caja) lo mueva a mano, en lugar de avanzar solo con los
 * tiempos del simulador. Así se muestra la demo con la mesa en una pestaña y la
 * cocina en otra.
 */
const KEY = `${restaurant.id}:personal:activo`
const { heartbeatMs, liveWithinMs } = restaurant.staffDemo

export function isStaffLive(now: number = Date.now()): boolean {
  const last = Number(readItem('local', KEY))
  return Boolean(last) && now - last < liveWithinMs
}

/** Marca que el personal está mirando; devuelve la función para dejar de marcar. */
export function startStaffHeartbeat(): () => void {
  const beat = () => writeItem('local', KEY, String(Date.now()))
  // Al cerrar la pestaña se borra la marca. Mientras está abierta (aunque esté de fondo, donde
  // Chrome frena los temporizadores a uno por minuto) la marca vale liveWithinMs (30 min).
  const close = () => removeItem('local', KEY)
  beat()
  const id = window.setInterval(beat, heartbeatMs)
  window.addEventListener('pagehide', close)
  return () => {
    window.clearInterval(id)
    window.removeEventListener('pagehide', close)
    close()
  }
}

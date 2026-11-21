import type { Comanda, ComandaStatus } from '../types/order'
import { restaurant } from './catalog'
import { etaFor } from './comandaStatus'
import { fmt, t } from './text'
import { paths } from './useMesa'
import { isTakeout } from './channel'

/**
 * Avisos del sistema en cada paso de la orden.
 *
 * Límites (de la web, no de la app): necesitan permiso del cliente, una
 * conexión segura (https o localhost) y la página abierta, aunque sea en
 * segundo plano. Para que lleguen con el navegador cerrado hace falta un
 * servidor que mande notificaciones push. En iPhone solo funcionan si la app
 * está agregada a la pantalla de inicio.
 */

export const notificationsSupported = (): boolean =>
  typeof window !== 'undefined' &&
  window.isSecureContext &&
  'Notification' in window &&
  'serviceWorker' in navigator

export const notificationPermission = (): NotificationPermission | 'unsupported' =>
  notificationsSupported() ? Notification.permission : 'unsupported'

/** Registra el service worker que muestra los avisos (al arrancar la app). */
export function registerNotificationWorker(onOpen: (url: string) => void): void {
  if (!notificationsSupported()) return
  navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type === 'abrir' && typeof event.data.url === 'string') onOpen(event.data.url)
  })
}

/** Pide permiso (tiene que ser después de un toque del cliente). */
export async function enableNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/** Muestra el aviso de un paso, si ese paso está en la config y hay permiso. */
export async function notifyStatus(comanda: Comanda, status: ComandaStatus, mesa: string): Promise<void> {
  if (notificationPermission() !== 'granted') return
  if (!restaurant.notifications.statuses.includes(status)) return
  // Para llevar, "lista" y "entregada" dicen otra cosa (se recoge en el local).
  const takeoutCopy = isTakeout(mesa) && (status === 'lista' || status === 'entregada') ? t.web.notify[status] : null
  const copy = takeoutCopy ?? t.tracking.notify[status]
  const eta = etaFor(comanda, Date.now())
  const vars = { id: comanda.id, mesa, min: `${eta.minFrom}–${eta.minTo}` }
  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(fmt(copy.title, vars), {
      body: fmt(copy.body, vars),
      // Un aviso por orden: el paso nuevo reemplaza al anterior y vuelve a sonar.
      tag: comanda.id,
      renotify: true,
      icon: restaurant.logo.png,
      data: { url: paths.tracking(mesa, comanda.id) },
    } as NotificationOptions)
  } catch {
    /* sin avisos en este navegador */
  }
}

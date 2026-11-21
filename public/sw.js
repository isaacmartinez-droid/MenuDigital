/*
 * Service worker mínimo: solo para mostrar los avisos del seguimiento y, al
 * tocar uno, volver a la app en la orden correspondiente. No guarda caché.
 * Con un backend real, acá también llegarían las notificaciones "push".
 */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows[0]
      if (open) {
        await open.focus()
        // La app navega sola (sin recargar) al recibir este mensaje.
        open.postMessage({ type: 'abrir', url })
        return
      }
      await self.clients.openWindow(url)
    })(),
  )
})

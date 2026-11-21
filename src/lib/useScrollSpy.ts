import { useEffect, useState } from 'react'

/**
 * Devuelve el id de la sección que está arriba en pantalla.
 * `offset` es el alto de lo que queda fijo arriba (las pestañas).
 */
export function useScrollSpy(ids: string[], offset: number, enabled = true): string {
  const [active, setActive] = useState(ids[0] ?? '')
  const key = ids.join('|')

  useEffect(() => {
    if (!enabled) return
    const list = key.split('|')
    let frame = 0
    const update = () => {
      frame = 0
      let current = list[0]
      for (const id of list) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top - offset <= 8) current = id
      }
      // Al llegar al final, la última sección es la activa aunque no suba hasta arriba.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = list[list.length - 1]
      }
      setActive(current)
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [key, offset, enabled])

  return active
}

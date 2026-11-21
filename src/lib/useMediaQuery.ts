import { useSyncExternalStore } from 'react'

/** Si la pantalla cumple la media query; se actualiza al cambiar el tamaño de la ventana. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Computadora (D1–D5): el mismo corte que la variante desktop: de index.css. */
export const DESKTOP_QUERY = '(min-width: 1200px)'

export const useIsDesktop = () => useMediaQuery(DESKTOP_QUERY)

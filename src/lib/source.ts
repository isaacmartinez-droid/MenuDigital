import { restaurant } from './catalog'
import { readItem, writeItem } from './storage'

/** De dónde llegó a la web (?src=ig|fb|google|wa). Se recuerda mientras la pestaña esté abierta. */
const SOURCE_KEY = `${restaurant.id}:web:origen`

export function captureSource(search: string): void {
  const src = new URLSearchParams(search).get('src')?.toLowerCase()
  if (src && restaurant.web.sources.includes(src)) writeItem('session', SOURCE_KEY, src)
}

export const readSource = (): string | undefined => readItem('session', SOURCE_KEY) ?? undefined

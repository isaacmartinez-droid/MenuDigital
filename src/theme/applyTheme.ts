import type { RestaurantConfig } from '../types/restaurant'

/**
 * Aplica la identidad del restaurante: cada color de la config pasa a ser
 * la variable CSS que usan las utilidades de Tailwind (--color-verde, etc.).
 * Así otro restaurante solo cambia config/restaurant.json.
 */
export function applyTheme(config: RestaurantConfig, root: HTMLElement = document.documentElement) {
  for (const [token, value] of Object.entries(config.colors)) {
    root.style.setProperty(`--color-${token}`, value)
  }
  document.title = config.name
  const themeColor = document.querySelector('meta[name="theme-color"]')
  themeColor?.setAttribute('content', config.colors.fondo)
}

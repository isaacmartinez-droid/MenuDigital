import { restaurant } from './catalog'

/** Textos de interfaz, todos desde config/restaurant.json. */
export const t = restaurant.texts

/** Reemplaza {clave} por su valor: fmt('Mesa {mesa}', { mesa: 5 }) → "Mesa 5". */
export function fmt(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  )
}

/** "plato" o "platos" según la cantidad. */
export const platos = (n: number) => (n === 1 ? t.common.plate : t.common.plates)

/** "Mesa 5" */
export const tableLabel = (mesa: string) => fmt(t.common.table, { mesa })

import type { Dish, TagTone } from '../types/menu'
import { menu, restaurant } from './catalog'
import { useDemoFlags } from './demoFlags'
import { zonedNow } from './schedule'
import { fmt, t } from './text'
import { useNow } from './useNow'

/** Categoría que se muestra como carrusel "Combos especiales". */
export const COMBOS_CATEGORY = 'combos'

/** ¿Se puede pedir este plato el día `day`? Sin `days`, todos los días. */
export const isOnDay = (dish: Dish, day: number): boolean => !dish.days?.length || dish.days.includes(day)

/** [2] → "martes"; [2, 4] → "martes y jueves"; [1, 3, 5] → "lunes, miércoles y viernes". */
export function daysLabel(days: number[]): string {
  const names = [...days].sort((a, b) => a - b).map((d) => t.combos.daysPlural[d])
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} ${t.combos.and} ${names.at(-1)}` : (names[0] ?? '')
}

/** "Solo los martes". */
export const onlyDaysText = (dish: Dish): string => fmt(t.combos.onlyDays, { days: daysLabel(dish.days ?? []) })

export interface DayBadge {
  label: string
  tone: TagTone
}

/** Etiqueta de un plato atado a días: "Combo de hoy" o "Solo los martes". */
export function dayBadge(dish: Dish, today: number): DayBadge | undefined {
  if (!dish.days?.length) return undefined
  return isOnDay(dish, today) ? { label: t.combos.today, tone: 'promo' } : { label: onlyDaysText(dish), tone: 'combo' }
}

/**
 * Combos en el orden del carrusel: primero el de hoy, después los de todos
 * los días, y al final los de otros días (el más próximo primero). Agotados al final.
 */
export function combosFor(today: number): Dish[] {
  const rank = (d: Dish) => {
    const base = !d.days?.length ? 1 : d.days.includes(today) ? 0 : 2 + Math.min(...d.days.map((x) => (x - today + 7) % 7)) / 10
    return d.available ? base : base + 10
  }
  return menu.dishes.filter((d) => d.category === COMBOS_CATEGORY).sort((a, b) => rank(a) - rank(b))
}

/** Día de la semana de hoy en la zona del local (o el de ?dia=). Se recalcula cada minuto. */
export function useToday(): number {
  const { dia } = useDemoFlags()
  const now = useNow(60_000, dia === null)
  return dia ?? zonedNow(restaurant.schedule.timezone, new Date(now)).day
}

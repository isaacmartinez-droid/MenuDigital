import type { Dish, Promo } from '../types/menu'
import { menu, restaurant } from './catalog'
import { useDemoFlags } from './demoFlags'
import { zonedNow } from './schedule'
import { useNow } from './useNow'
import { formatMoney } from './money'
import { fmt, t } from './text'
import { usePanelSettings } from '../store/panelSettings'
import { catalogStore, promoDishId, useCatalog, type PromoDef } from '../store/catalogEdits'

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

/** Una promo para mostrar: la del día (menu.json) o una creada en el panel. */
export interface PromoView extends Promo {
  id: string
  days: number[]
  /** Solo la web para llevar, o también la mesa. */
  where: 'web' | 'todos'
  on: boolean
  /** La de menu.json (no se puede borrar). */
  builtIn: boolean
}

/** "16:00", "19:00" → "4 a 7 pm"; "11:30", "14:00" → "11:30 am a 2 pm". */
export function shortRange(from: string, to: string): string {
  const part = (hhmm: string) => {
    const m = toMinutes(hhmm)
    const h = Math.floor(m / 60) % 24
    const min = m % 60
    return { text: `${h % 12 || 12}${min ? `:${String(min).padStart(2, '0')}` : ''}`, pm: h >= 12 }
  }
  const a = part(from)
  const b = part(to)
  const suffix = (pm: boolean) => (pm ? 'pm' : 'am')
  return a.pm === b.pm ? `${a.text} a ${b.text} ${suffix(b.pm)}` : `${a.text} ${suffix(a.pm)} a ${b.text} ${suffix(b.pm)}`
}

function viewOf(p: PromoDef): PromoView {
  const dish = menu.dishes.find((d) => d.id === p.dishId)
  return {
    id: p.id,
    label: menu.tags.find((tag) => tag.id === 'promo')?.label ?? menu.promo?.label ?? '',
    title: fmt(t.staff.panel.promos.cardTitle, { label: p.label, price: formatMoney(p.price) }),
    subtitle: fmt(t.staff.panel.promos.todayRange, { range: shortRange(p.from, p.to) }),
    hours: { from: p.from, to: p.to },
    image: dish?.image ?? '',
    dishId: promoDishId(p),
    days: p.days,
    where: p.where,
    on: p.on,
    builtIn: false,
  }
}

/** Todas las promos (la del día primero), con su estado. */
export function allPromos(builtInOn: boolean, created: PromoDef[]): PromoView[] {
  const base = menu.promo
    ? [{ ...menu.promo, id: 'promo-del-dia', days: ALL_DAYS, where: 'web' as const, on: builtInOn, builtIn: true }]
    : []
  return [...base, ...created.map(viewOf)]
}

/** Todas las promos, al día con el panel. */
export function usePromos(): PromoView[] {
  const builtInOn = usePanelSettings((s) => s.promoOn)
  const created = useCatalog((s) => s.promos)
  return allPromos(builtInOn, created)
}

/** La promo a la que pertenece un plato, si es un plato de promo. */
function promoOfDish(dish: Dish): PromoView | undefined {
  if (menu.promo?.dishId === dish.id) return allPromos(true, [])[0]
  const p = catalogStore.getState().promos.find((x) => promoDishId(x) === dish.id)
  return p ? viewOf(p) : undefined
}

/** ¿Es el plato de una promo? */
export const isPromoDish = (dish: Dish): boolean => Boolean(promoOfDish(dish))

/** ¿La promo está en su horario y en su día? (?forzar=abierto la muestra a cualquier hora; cerrado, nunca.) */
export function inSchedule(p: { hours: { from: string; to: string }; days: number[] }, horario: string | null, day: number, minutes: number) {
  if (horario === 'cerrado') return false
  if (!p.days.includes(day)) return false
  if (horario === 'abierto') return true
  const from = toMinutes(p.hours.from)
  const to = toMinutes(p.hours.to)
  // Si termina antes de empezar, cruza la medianoche (ej. 9 pm a 1 am).
  return to > from ? minutes >= from && minutes < to : minutes >= from || minutes < to
}

/**
 * ¿La promo del día está en su horario (promo.hours, en la zona del local)? Se recalcula
 * cada minuto. Con ?forzar=abierto se muestra igual (es para presentar la demo a cualquier
 * hora); con ?forzar=cerrado, no.
 */
export function usePromoInHours(): boolean {
  const { horario, dia } = useDemoFlags()
  const now = useNow(60_000)
  const promo = menu.promo
  if (!promo) return false
  const { day, minutes } = zonedNow(restaurant.schedule.timezone, new Date(now))
  return inSchedule({ hours: promo.hours, days: ALL_DAYS }, horario, dia ?? day, minutes)
}

/** Las promos que se ven ahora: encendidas, en su día y en su horario. */
export function useActivePromos(): PromoView[] {
  const { horario, dia } = useDemoFlags()
  const now = useNow(60_000)
  const promos = usePromos()
  const { day, minutes } = zonedNow(restaurant.schedule.timezone, new Date(now))
  return promos.filter((p) => p.on && inSchedule(p, horario, dia ?? day, minutes))
}

/** ¿Una promo se ve en este canal? (La del día es solo web; las nuevas pueden ser web y mesa.) */
export const promoForChannel = (p: PromoView, takeout: boolean) => takeout || p.where === 'todos'

/**
 * ¿Se puede mostrar y pedir este plato? Un plato de promo, solo si su promo se ve ahora
 * y en este canal; el resto de los platos, siempre (los días y agotados van aparte).
 */
export function promoAllows(dish: Dish, takeout: boolean, active: PromoView[]): boolean {
  const own = promoOfDish(dish)
  if (!own) return true
  const live = active.find((p) => p.id === own.id)
  return Boolean(live && promoForChannel(live, takeout))
}

/** "Enchilada", 2 → "2 enchiladas"; "Fresco de cacao", 2 → "2 frescos de cacao". */
export function promoLabel(name: string, quantity: number): string {
  const lower = name.toLowerCase()
  if (quantity === 1) return `1 ${lower}`
  const stop: string[] = t.staff.panel.promos.pluralStop
  let stopped = false
  const words = lower.split(/\s+/).map((w) => {
    if (stopped) return w
    if (stop.includes(w)) {
      stopped = true
      return w
    }
    if (/[sx]$/.test(w)) return w
    if (/z$/.test(w)) return `${w.slice(0, -1)}ces`
    if (/ón$/.test(w)) return `${w.slice(0, -2)}ones`
    if (/án$/.test(w)) return `${w.slice(0, -2)}anes`
    if (/[aeiouáéó]$/.test(w)) return `${w}s`
    return `${w}es`
  })
  return `${quantity} ${words.join(' ')}`
}

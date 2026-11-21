import type { Dish } from '../types/menu'
import { menu, restaurant } from './catalog'
import { useDemoFlags } from './demoFlags'
import { zonedNow } from './schedule'
import { useNow } from './useNow'

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** ¿Es el plato de la promo del día (menu.json → promo.dishId)? */
export const isPromoDish = (dish: Dish): boolean => menu.promo?.dishId === dish.id

/**
 * ¿La promo está en su horario (promo.hours, en la zona del local)? Se recalcula cada
 * minuto. Con ?forzar=abierto se muestra igual (es para presentar la demo a cualquier
 * hora); con ?forzar=cerrado, no.
 */
export function usePromoActive(): boolean {
  const { horario } = useDemoFlags()
  const now = useNow(60_000)
  const promo = menu.promo
  if (!promo) return false
  if (horario === 'abierto') return true
  if (horario === 'cerrado') return false
  const { minutes } = zonedNow(restaurant.schedule.timezone, new Date(now))
  return minutes >= toMinutes(promo.hours.from) && minutes < toMinutes(promo.hours.to)
}

/**
 * ¿Se puede mostrar y pedir este plato? La promo es solo de la web para llevar y
 * en su horario; el resto de los platos, siempre (los días y agotados van aparte).
 */
export const promoAllows = (dish: Dish, takeout: boolean, promoActive: boolean): boolean =>
  !isPromoDish(dish) || (takeout && promoActive)

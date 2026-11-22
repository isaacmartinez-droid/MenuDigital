import restaurantJson from '../config/restaurant.json'
import menuJson from '../data/menu.json'
import type { RestaurantConfig } from '../types/restaurant'
import type { Dish, Extra, Menu, SideOption, Tag } from '../types/menu'

/**
 * Punto único de acceso a la config y al menú.
 * Hoy vienen de los JSON del repo; para conectarlo a una API, reemplazá
 * estas dos constantes por lo que devuelva el servidor (mismas interfaces).
 */
export const restaurant: RestaurantConfig = restaurantJson
export const menu = menuJson as Menu

const dishes = new Map(menu.dishes.map((d) => [d.id, d]))
const sides = new Map(menu.sides.map((s) => [s.id, s]))
const extras = new Map(menu.extras.map((e) => [e.id, e]))
const tags = new Map(menu.tags.map((t) => [t.id, t]))

/** Vuelve a indexar los platos (el panel agrega platos y promos; ver store/catalogEdits). */
export function syncDishIndex(): void {
  dishes.clear()
  for (const d of menu.dishes) dishes.set(d.id, d)
}

export const getDish = (id: string): Dish | undefined => dishes.get(id)
export const getSide = (id: string | undefined): SideOption | undefined => (id ? sides.get(id) : undefined)
export const getExtra = (id: string): Extra | undefined => extras.get(id)
export const getTag = (id: string): Tag | undefined => tags.get(id)

export const dishTags = (dish: Dish): Tag[] =>
  dish.tags.map(getTag).filter((t): t is Tag => Boolean(t))

export const dishExtras = (dish: Dish): Extra[] =>
  (dish.extras ?? []).map(getExtra).filter((e): e is Extra => Boolean(e))

export const dishSides = (dish: Dish): SideOption[] =>
  (dish.sides ?? []).map((id) => sides.get(id)).filter((s): s is SideOption => Boolean(s))

/** Platos de una categoría: disponibles primero, agotados al final. */
export function dishesByCategory(categoryId: string): Dish[] {
  const list = menu.dishes.filter((d) => d.category === categoryId)
  return [...list.filter((d) => d.available), ...list.filter((d) => !d.available)]
}

/** Precio unitario = plato + extras elegidos. */
export function unitPrice(dish: Dish, extraIds: string[]): number {
  return extraIds.reduce((sum, id) => sum + (getExtra(id)?.price ?? 0), dish.price)
}

export const isValidTable = (tableId: string | undefined): tableId is string =>
  Boolean(tableId && restaurant.tables.includes(tableId))

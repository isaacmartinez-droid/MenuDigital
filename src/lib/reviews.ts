import type { Dish, Rating, Review } from '../types/menu'
import { restaurant } from './catalog'
import { readItem, writeItem } from './storage'

/**
 * Reseñas que dejan los clientes al pagar. En la demo se guardan en este
 * navegador (no por mesa, así sobreviven al cerrar la cuenta); con API real
 * vendrían del servidor junto con el menú.
 */
export interface StoredReview extends Review {
  dishId: string
}

const KEY = `${restaurant.id}:resenas`

export function loadReviews(): StoredReview[] {
  try {
    return JSON.parse(readItem('local', KEY) ?? '[]') as StoredReview[]
  } catch {
    return []
  }
}

export function addReviews(list: StoredReview[]): void {
  writeItem('local', KEY, JSON.stringify([...loadReviews(), ...list]))
}

/**
 * Reseñas de un plato: las nuevas (más recientes primero) más las de menu.json,
 * con el promedio recalculado. Las que no tienen texto cuentan para el promedio
 * pero no se listan.
 */
export function reviewsFor(dish: Dish): { written: Review[]; rating: Rating | undefined } {
  const mine = loadReviews().filter((r) => r.dishId === dish.id)
  const base = dish.reviews ?? []
  const written = [...[...mine].reverse(), ...base].filter((r) => r.text.trim())
  const baseCount = dish.rating?.count ?? 0
  const count = baseCount + mine.length
  if (!count) return { written, rating: undefined }
  const sum = (dish.rating?.average ?? 0) * baseCount + mine.reduce((s, r) => s + r.rating, 0)
  return { written, rating: { average: sum / count, count } }
}

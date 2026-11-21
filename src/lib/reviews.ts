import type { Dish, Rating, Review } from '../types/menu'
import { restaurant } from './catalog'
import { readItem, writeItem } from './storage'
import type { NewReview } from './api'

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

/** Plato pedido para calificar: [id, nombre]. */
export type DishEntry = [dishId: string, name: string]
export type Overall = 'rico' | 'mal' | null

/**
 * Reseñas que se mandan: con pocos platos, estrellas y comentario de cada uno;
 * con muchos, "todo rico" = 5 a todos, o 2 a los marcados como "no estuvo bien".
 */
export function reviewsToSend(
  dishes: DishEntry[],
  ratings: Record<string, number>,
  comments: Record<string, string>,
  overall: Overall,
  author: string,
): NewReview[] {
  if (dishes.length <= restaurant.ratings.perDishMax) {
    return dishes
      .filter(([id]) => ratings[id])
      .map(([id]) => ({ dishId: id, rating: ratings[id], text: comments[id], author }))
  }
  if (overall === 'rico') return dishes.map(([id]) => ({ dishId: id, rating: 5, author }))
  if (overall === 'mal') return Object.entries(ratings).map(([id, rating]) => ({ dishId: id, rating, author }))
  return []
}

/** Órdenes para llevar ya calificadas en este teléfono (para no pedir dos veces la calificación). */
const RATED_KEY = `${restaurant.id}:web:calificadas`

const ratedIds = (): string[] => {
  try {
    return JSON.parse(readItem('local', RATED_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

export const isRated = (comandaId: string): boolean => ratedIds().includes(comandaId)

export function markRated(comandaId: string): void {
  if (!isRated(comandaId)) writeItem('local', RATED_KEY, JSON.stringify([...ratedIds(), comandaId]))
}

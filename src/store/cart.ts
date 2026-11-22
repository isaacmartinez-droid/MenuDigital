import { useStore } from 'zustand'
import type { CartItem } from '../types/order'
import { getDish, getExtra, getSide, unitPrice } from '../lib/catalog'
import { newId } from '../lib/storage'
import { tableStoreFactory } from './tableStore'
import { itemLimit } from './panelSettings'

/**
 * Carrito de la mesa: lo que este teléfono está armando y todavía no envió.
 * Se guarda en localStorage por mesa, así no se pierde si se va la señal
 * o se recarga la página.
 */
export interface NewLine {
  dishId: string
  quantity: number
  sideId?: string
  extraIds: string[]
  note?: string
}

export type AddResult = { ok: true; lineId: string } | { ok: false; reason: 'limit' | 'unavailable' }

interface CartState {
  items: CartItem[]
  /** Nombre que puso el cliente (se recuerda para la próxima comanda). */
  customerName: string
  /**
   * Nota general para la cocina ("sin chile", "traer todo junto"); viaja con cada
   * comanda y se recuerda para la siguiente, como el nombre (se puede editar o quitar).
   */
  kitchenNote: string
  /** El cliente tocó "Enviar" sin señal: se envía solo cuando vuelva. */
  pendingSend: boolean
  setPendingSend: (pending: boolean) => void
  /** Agrega una línea; si ya existe una idéntica, suma cantidad. */
  add: (line: NewLine) => AddResult
  /** El + con un toque: acompañante por defecto, sin extras ni nota. */
  quickAdd: (dishId: string) => AddResult
  /** Quita uno de la línea más reciente de ese plato. */
  decrementDish: (dishId: string) => void
  /** Quita uno de una línea (para "Deshacer"). */
  decrementLine: (lineId: string) => void
  setLineQuantity: (lineId: string, quantity: number) => AddResult
  /** Reemplaza una línea (al editarla desde el detalle). */
  replaceLine: (lineId: string, line: NewLine) => AddResult
  /** Edita la nota de un plato desde "Tu pedido" (vacía = sin nota). */
  setLineNote: (lineId: string, note: string) => void
  setCustomerName: (name: string) => void
  setKitchenNote: (note: string) => void
  /** Vacía el pedido después de enviarlo (el nombre y la nota se recuerdan). */
  clear: () => void
}


const sameConfig = (a: CartItem, b: NewLine) =>
  a.dishId === b.dishId &&
  (a.sideId ?? '') === (b.sideId ?? '') &&
  (a.note ?? '').trim() === (b.note ?? '').trim() &&
  a.extraIds.length === b.extraIds.length &&
  [...a.extraIds].sort().join() === [...b.extraIds].sort().join()

export const countItems = (items: CartItem[]) => items.reduce((n, i) => n + i.quantity, 0)

export const lineTotal = (item: CartItem) => {
  const dish = getDish(item.dishId)
  return dish ? unitPrice(dish, item.extraIds) * item.quantity : 0
}

export const cartTotal = (items: CartItem[]) => items.reduce((sum, i) => sum + lineTotal(i), 0)

/** Detalle de una línea: acompañante, extras y nota ("Gallo pinto", "Queso extra", "sin repollo"). */
export const lineDetails = (item: CartItem): string[] =>
  [
    getSide(item.sideId)?.name,
    ...item.extraIds.map((id) => getExtra(id)?.shortName ?? getExtra(id)?.name),
    item.note?.trim(),
  ].filter((part): part is string => Boolean(part))

/** Cantidad de un plato sumando todas sus líneas. */
export const dishQuantity = (items: CartItem[], dishId: string) =>
  items.filter((i) => i.dishId === dishId).reduce((n, i) => n + i.quantity, 0)

const carts = tableStoreFactory<CartState>('pedido', () => (set, get) => ({
  items: [],
  customerName: '',
  kitchenNote: '',
  pendingSend: false,
  setPendingSend: (pendingSend) => set({ pendingSend }),

  add: (line) => {
    const { items } = get()
    if (countItems(items) + line.quantity > itemLimit()) return { ok: false, reason: 'limit' }
    const existing = items.find((i) => sameConfig(i, line))
    if (existing) {
      set({ items: items.map((i) => (i === existing ? { ...i, quantity: i.quantity + line.quantity } : i)) })
      return { ok: true, lineId: existing.lineId }
    }
    const lineId = newId()
    const note = line.note?.trim() || undefined
    set({ items: [...items, { ...line, note, lineId }] })
    return { ok: true, lineId }
  },

  quickAdd: (dishId) => {
    const dish = getDish(dishId)
    if (!dish || !dish.available) return { ok: false, reason: 'unavailable' }
    return get().add({ dishId, quantity: 1, sideId: dish.defaultSide, extraIds: [] })
  },

  decrementDish: (dishId) => {
    const { items } = get()
    const line = [...items].reverse().find((i) => i.dishId === dishId)
    if (line) get().decrementLine(line.lineId)
  },

  decrementLine: (lineId) => {
    set({
      items: get()
        .items.map((i) => (i.lineId === lineId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0),
    })
  },

  setLineQuantity: (lineId, quantity) => {
    const { items } = get()
    const line = items.find((i) => i.lineId === lineId)
    if (!line) return { ok: true, lineId }
    if (countItems(items) - line.quantity + quantity > itemLimit()) return { ok: false, reason: 'limit' }
    set({
      items: items
        .map((i) => (i.lineId === lineId ? { ...i, quantity } : i))
        .filter((i) => i.quantity > 0),
    })
    return { ok: true, lineId }
  },

  // Se guarda tal cual mientras se escribe (sin recortar, para no comerse los espacios).
  setLineNote: (lineId, note) =>
    set({ items: get().items.map((i) => (i.lineId === lineId ? { ...i, note: note || undefined } : i)) }),
  replaceLine: (lineId, line) => {
    const { items } = get()
    const old = items.find((i) => i.lineId === lineId)
    const rest = items.filter((i) => i.lineId !== lineId)
    if (countItems(rest) + line.quantity > itemLimit()) return { ok: false, reason: 'limit' }
    const note = line.note?.trim() || undefined
    const twin = rest.find((i) => sameConfig(i, line))
    if (twin) {
      set({ items: rest.map((i) => (i === twin ? { ...i, quantity: i.quantity + line.quantity } : i)) })
      return { ok: true, lineId: twin.lineId }
    }
    // Conserva la posición de la línea en la lista.
    const index = old ? items.indexOf(old) : items.length
    const next = [...rest]
    next.splice(index, 0, { ...line, note, lineId })
    set({ items: next })
    return { ok: true, lineId }
  },

  setCustomerName: (customerName) => set({ customerName }),
  setKitchenNote: (kitchenNote) => set({ kitchenNote }),
  // Al enviar se vacía todo, también la nota para la cocina (si no, se repetía en el pedido siguiente).
  clear: () => set({ items: [], kitchenNote: '', pendingSend: false }),
}))

export const cartStore = carts.get
export const resetCartStore = carts.reset

export function useCart<T>(tableId: string, selector: (s: CartState) => T): T {
  return useStore(carts.get(tableId), selector)
}

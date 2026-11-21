import type { CartItem, Comanda, ComandaItem } from '../types/order'
import { getDish, getExtra, getSide, restaurant, unitPrice } from './catalog'
import { ApiError, sendComanda } from './api'
import { fmt, t } from './text'
import { cartStore, countItems } from '../store/cart'
import { comandasStore } from '../store/comandas'

/** Pasa las líneas del carrito a líneas de comanda, con nombres y precios congelados. */
export function toComandaItems(items: CartItem[]): ComandaItem[] {
  return items.flatMap((line): ComandaItem[] => {
    const dish = getDish(line.dishId)
    if (!dish) return []
    const unit = unitPrice(dish, line.extraIds)
    return [
      {
        dishId: dish.id,
        name: dish.name,
        quantity: line.quantity,
        sideId: line.sideId,
        sideName: getSide(line.sideId)?.name,
        extras: line.extraIds.flatMap((id) => {
          const e = getExtra(id)
          return e ? [{ id: e.id, name: e.name, price: e.price }] : []
        }),
        note: line.note,
        unitPrice: unit,
        lineTotal: unit * line.quantity,
      },
    ]
  })
}

/** Nombre con el que sale la comanda: el que puso, o "Teléfono N". */
export const customerLabel = (name: string) =>
  name.trim() || fmt(t.common.device, { n: restaurant.ordering.myDeviceNumber })

export type SubmitResult =
  | { ok: true; comanda: Comanda }
  | { ok: false; reason: 'empty' | 'limit' | 'offline' | 'server' }

/** Envíos en curso por mesa: evita mandar el mismo carrito dos veces. */
const inFlight = new Map<string, Promise<SubmitResult>>()

/**
 * Envía el carrito de la mesa como una comanda nueva, directo a cocina.
 * Si no hay señal, el carrito queda marcado para enviarse solo al volver.
 * Si ya hay un envío en curso (ej. el reintento automático al volver la
 * señal y un toque en "Enviar" al mismo tiempo), devuelve ese mismo resultado.
 */
export function submitCart(tableId: string): Promise<SubmitResult> {
  const running = inFlight.get(tableId)
  if (running) return running
  const attempt = doSubmit(tableId).finally(() => inFlight.delete(tableId))
  inFlight.set(tableId, attempt)
  return attempt
}

async function doSubmit(tableId: string): Promise<SubmitResult> {
  const cart = cartStore(tableId).getState()
  if (!cart.items.length) return { ok: false, reason: 'empty' }
  if (countItems(cart.items) > restaurant.ordering.maxItemsPerComanda) return { ok: false, reason: 'limit' }
  try {
    const { comanda, account } = await sendComanda({
      tableId,
      customerName: customerLabel(cart.customerName),
      items: toComandaItems(cart.items),
    })
    comandasStore(tableId).getState().setAccount(account)
    cartStore(tableId).getState().clear()
    return { ok: true, comanda }
  } catch (error) {
    if (error instanceof ApiError && error.code === 'offline') {
      cartStore(tableId).getState().setPendingSend(true)
      return { ok: false, reason: 'offline' }
    }
    return { ok: false, reason: 'server' }
  }
}

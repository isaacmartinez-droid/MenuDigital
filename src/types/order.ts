/**
 * Modelo de pedidos. Cuenta de mesa → varias comandas → platos.
 * Una comanda enviada no se modifica nunca; "Pedir algo más" crea otra.
 */

/** Línea del carrito (todavía no enviada). */
export interface CartItem {
  lineId: string
  dishId: string
  quantity: number
  sideId?: string
  extraIds: string[]
  note?: string
}

/**
 * Línea de una comanda enviada. Guarda nombres y precios del momento del envío,
 * para que un cambio de menú no altere lo que ya se pidió.
 */
export interface ComandaItem {
  dishId: string
  name: string
  quantity: number
  sideId?: string
  sideName?: string
  extras: { id: string; name: string; price: number }[]
  note?: string
  /** (precio del plato + extras) */
  unitPrice: number
  /** unitPrice × quantity */
  lineTotal: number
}

export type ComandaStatus = 'recibida' | 'en-el-comal' | 'lista' | 'entregada'

/** Cambio pedido por cocina cuando se acaba una parte del plato (M4g). */
export interface Substitution {
  dishId: string
  componentId: string
  componentName: string
  substituteId: string
  substituteName: string
  /** true = se quitó sin reemplazo ("Sin acompañante"). */
  removes?: boolean
  at: string
}

export interface Comanda {
  /** "FN-0142" */
  id: string
  number: number
  tableId: string
  /** Nombre que puso el cliente, o "Teléfono N". */
  customerName: string
  /** true si la hizo este teléfono. */
  mine: boolean
  items: ComandaItem[]
  /** Nota general para la cocina ("traer todo junto"). */
  note?: string
  total: number
  status: ComandaStatus
  /** ISO */
  createdAt: string
  /** ISO del último cambio de estado. */
  statusAt: string
  substitutions: Substitution[]
}

/** Comanda lista para enviar que espera conexión (M9). */
export interface PendingComanda {
  localId: string
  tableId: string
  customerName: string
  items: ComandaItem[]
  total: number
  createdAt: string
}

export type WaiterReason = string

/**
 * Qué paga este teléfono. Cada persona pide desde su teléfono, así que lo normal
 * es "solo lo mío"; "toda la mesa" es cuando uno paga por todos.
 */
export type PayScope = 'mine' | 'table'

export type PayMethod = 'efectivo' | 'tarjeta'

/** Lo que se le manda a caja al avisar. */
export interface BillRequest {
  scope: PayScope
  tip: TipChoice
  /** Opcional: para que caja se prepare (con efectivo, el vuelto). */
  method: PayMethod | null
  /** Con cuánto paga en efectivo, en C$ (opcional). */
  cashGiven: number | null
}

/** Propina elegida para la cuenta de la mesa (voluntaria). */
export type TipChoice =
  | { kind: 'percent'; percent: number }
  | { kind: 'amount'; amount: number }
  | { kind: 'none' }

/**
 * Capa de API del cliente en mesa.
 *
 * HOY: todo se simula en el navegador con setTimeout y un "servidor" falso
 * guardado en localStorage por mesa (así varias pestañas ven la misma cuenta).
 * MAÑANA: cada función hace fetch al backend con la misma firma, y las
 * pantallas no cambian. Los puntos a reemplazar están marcados con "API real:".
 */
import type { BillRequest, Channel, Comanda, ComandaItem, ComandaStatus, PayMethod, PayScope, Substitution } from '../types/order'
import { getDish, getExtra, getSide, restaurant, unitPrice } from './catalog'
import { tipAmount } from './money'
import { readDemoFlags } from './demoFlags'
import { newId, readItem, tableKey, writeItem } from './storage'
import { addReviews } from './reviews'
import { msToNextStatus, simulatedStatus } from './simulator'
import { fmt, t } from './text'
import { isTakeout } from './channel'

export class ApiError extends Error {
  readonly code: 'offline' | 'server'
  constructor(code: 'offline' | 'server', message = code) {
    super(message)
    this.code = code
  }
}

export interface NewComanda {
  tableId: string
  customerName: string
  items: ComandaItem[]
  /** Nota general para la cocina. */
  note?: string
  /** Solo para llevar: canal, WhatsApp y origen (?src=). */
  channel?: Channel
  phone?: string
  source?: string
}

export interface Receipt {
  tableId: string
  /** "mine": pagó solo lo suyo; "table": pagó toda la mesa. */
  scope: PayScope
  /** Lo consumido (lo suyo o la mesa, según scope). */
  subtotal: number
  /** Propina voluntaria (0 si no dejaron). */
  tip: number
  /** subtotal + propina */
  total: number
  method: PayMethod | null
  /** Vuelto en C$ si pagó en efectivo con más del total. */
  change: number | null
  cashier: string
  paidAt: string
}

const { timings, ordering, staff } = restaurant
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine)

/** Simula la ida y vuelta al servidor; falla si no hay señal. */
async function roundTrip<T>(fn: () => T, ms: number = timings.apiLatencyMs): Promise<T> {
  if (!isOnline()) throw new ApiError('offline')
  await wait(ms)
  if (!isOnline()) throw new ApiError('offline')
  return fn()
}

/* ------------------------------------------------------------------ */
/* "Servidor" simulado                                                  */
/* ------------------------------------------------------------------ */

interface ServerTable {
  comandas: Comanda[]
  matesSeeded: boolean
  /** Lo que se pidió al avisar a caja (la propina se calcula al cobrar). */
  bill?: BillRequest
}

const serverKey = (tableId: string) => tableKey(tableId, 'servidor')

function loadServer(tableId: string): ServerTable {
  try {
    const raw = readItem('local', serverKey(tableId))
    if (raw) return JSON.parse(raw) as ServerTable
  } catch {
    /* estado dañado: se empieza de cero */
  }
  return { comandas: [], matesSeeded: false }
}

const saveServer = (tableId: string, state: ServerTable) =>
  writeItem('local', serverKey(tableId), JSON.stringify(state))

const comandaId = (n: number) => `${ordering.comandaPrefix}-${String(n).padStart(4, '0')}`

const nextNumber = (state: ServerTable) =>
  state.comandas.length
    ? Math.max(...state.comandas.map((c) => c.number)) + 1
    : ordering.firstComandaNumber

/** Convierte las líneas de un compañero simulado en líneas de comanda. */
function mateItems(items: { dishId: string; quantity: number; sideId?: string; extraIds?: string[] }[]) {
  return items.flatMap((line): ComandaItem[] => {
    const dish = getDish(line.dishId)
    if (!dish) return []
    const extraIds = line.extraIds ?? []
    const unit = unitPrice(dish, extraIds)
    return [
      {
        dishId: dish.id,
        name: dish.name,
        quantity: line.quantity,
        sideId: line.sideId,
        sideName: getSide(line.sideId)?.name,
        extras: extraIds.flatMap((id) => {
          const e = getExtra(id)
          return e ? [{ id: e.id, name: e.name, price: e.price }] : []
        }),
        unitPrice: unit,
        lineTotal: unit * line.quantity,
      },
    ]
  })
}

/** Simula que otros teléfonos de la mesa también pidieron (se apaga con ?compas=0). */
function seedTableMates(state: ServerTable, tableId: string, createdAt: string) {
  if (state.matesSeeded || !readDemoFlags().compas) return
  for (const mate of restaurant.demo.tableMates) {
    if (state.comandas.some((c) => c.number === mate.comandaNumber)) continue
    const items = mateItems(mate.items)
    state.comandas.push({
      id: comandaId(mate.comandaNumber),
      number: mate.comandaNumber,
      tableId,
      customerName: mate.name ?? fmt(t.common.device, { n: mate.deviceNumber }),
      mine: false,
      items,
      total: items.reduce((s, i) => s + i.lineTotal, 0),
      status: 'en-el-comal',
      createdAt,
      statusAt: createdAt,
      substitutions: [],
    })
  }
  state.matesSeeded = true
}

/* ------------------------------------------------------------------ */
/* Funciones públicas                                                   */
/* ------------------------------------------------------------------ */

/**
 * Envía una comanda directo a cocina (sin aceptación del mesero).
 * Devuelve la comanda creada y la cuenta completa de la mesa.
 * API real: POST /api/mesas/:mesa/comandas → { comanda, cuenta }
 * (para llevar: POST /api/pedidos con canal "llevar", nombre, WhatsApp y origen;
 * queda "por confirmar" hasta que caja escribe por WhatsApp).
 */
export async function sendComanda(input: NewComanda): Promise<{ comanda: Comanda; account: Comanda[] }> {
  return roundTrip(() => {
    const state = loadServer(input.tableId)
    const now = new Date().toISOString()
    const number = nextNumber(state)
    const comanda: Comanda = {
      id: comandaId(number),
      number,
      tableId: input.tableId,
      customerName: input.customerName,
      mine: true,
      items: input.items,
      ...(input.note ? { note: input.note } : {}),
      ...(input.channel ? { channel: input.channel } : {}),
      ...(input.phone ? { phone: input.phone } : {}),
      ...(input.source ? { source: input.source } : {}),
      total: input.items.reduce((s, i) => s + i.lineTotal, 0),
      status: 'recibida',
      createdAt: now,
      statusAt: now,
      substitutions: [],
    }
    state.comandas.push(comanda)
    // Los compañeros simulados son de la mesa; el pedido para llevar es solo de este cliente.
    if (!isTakeout(input.tableId)) seedTableMates(state, input.tableId, now)
    saveServer(input.tableId, state)
    return { comanda, account: state.comandas }
  })
}

/** Cuenta completa de la mesa. API real: GET /api/mesas/:mesa/cuenta */
export async function fetchAccount(tableId: string): Promise<Comanda[]> {
  return roundTrip(() => loadServer(tableId).comandas, 150)
}

/**
 * Sigue el estado de una comanda y avisa cada cambio.
 * API real: WebSocket o polling a GET /api/comandas/:id. Devuelve la función para dejar de escuchar.
 */
export function watchComanda(comanda: Comanda, onStatus: (status: ComandaStatus) => void): () => void {
  let timer = 0
  let stopped = false
  const tick = () => {
    if (stopped) return
    onStatus(simulatedStatus(comanda.createdAt))
    const next = msToNextStatus(comanda.createdAt)
    if (next !== null) timer = window.setTimeout(tick, next + 50)
  }
  tick()
  return () => {
    stopped = true
    window.clearTimeout(timer)
  }
}

/**
 * Avisa a los meseros con el motivo. Resuelve cuando el aviso quedó registrado.
 * API real: POST /api/mesas/:mesa/llamados { motivo }
 */
export async function callWaiter(tableId: string, reason: string): Promise<void> {
  void tableId
  void reason
  return roundTrip(() => undefined, 300)
}

/**
 * Avisa cuando un mesero toma el llamado ("Carlos va en camino").
 * Simulado: a los timings.waiterAckMs de haber llamado; sobrevive a recargas.
 * API real: WebSocket con el evento "llamado tomado". Devuelve la función para dejar de escuchar.
 */
export function watchWaiterCall(calledAt: number, onAck: (waiter: string) => void): () => void {
  const id = window.setTimeout(() => onAck(staff.waiter), Math.max(0, calledAt + timings.waiterAckMs - Date.now()))
  return () => window.clearTimeout(id)
}

/**
 * Avisa a caja que este teléfono va a pagar: solo lo suyo o toda la mesa, con
 * la propina y, si lo dijo, cómo paga (con efectivo, con cuánto, para el vuelto).
 * API real: POST /api/mesas/:mesa/cuenta/solicitar { alcance, propina, metodo, efectivo }
 */
export async function requestBill(tableId: string, request: BillRequest): Promise<{ cashier: string }> {
  return roundTrip(() => {
    const state = loadServer(tableId)
    saveServer(tableId, { ...state, bill: request })
    return { cashier: staff.cashier }
  })
}

/**
 * Espera a que caja cobre y cierre la mesa (simulado a los timings.billPaidMs).
 * API real: WebSocket con el evento "mesa cerrada".
 */
export async function waitForPayment(tableId: string, sinceMs: number): Promise<Receipt> {
  // "Pasá a caja" queda timings.billPaidMs (10 min); con ?forzar=pago-rapido, 5 s.
  const delay = readDemoFlags().pagoRapido ? 5000 : timings.billPaidMs
  const remaining = Math.max(0, sinceMs + delay - Date.now())
  await wait(remaining)
  const state = loadServer(tableId)
  const scope = state.bill?.scope ?? 'table'
  const paidComandas = scope === 'mine' ? state.comandas.filter((c) => c.mine) : state.comandas
  const subtotal = paidComandas.reduce((s, c) => s + c.total, 0)
  const tip = state.bill ? tipAmount(subtotal, state.bill.tip) : 0
  const total = subtotal + tip
  const method = state.bill?.method ?? null
  const cash = state.bill?.cashGiven ?? null
  return {
    tableId,
    scope,
    subtotal,
    tip,
    total,
    method,
    change: method === 'efectivo' && cash && cash > total ? cash - total : null,
    cashier: staff.cashier,
    paidAt: new Date().toISOString(),
  }
}

export interface NewReview {
  dishId: string
  /** 1 a 5 */
  rating: number
  /** Comentario opcional (aparece en "Lo que dicen" del plato). */
  text?: string
  author: string
}

/**
 * Calificación al pagar: estrellas y comentario opcional por plato, más un
 * comentario general para el dueño (no se publica).
 * Simulado: se guardan en este navegador y aparecen en el detalle del plato.
 * API real: POST /api/mesas/:mesa/calificaciones { resenas, comentario }
 */
export async function rateDishes(tableId: string, reviews: NewReview[], comment?: string): Promise<void> {
  void tableId
  void comment
  return roundTrip(() => {
    const date = new Date().toISOString().slice(0, 10)
    addReviews(reviews.map((r) => ({ id: newId(), dishId: r.dishId, author: r.author, rating: r.rating, text: r.text?.trim() ?? '', date })))
  }, 300)
}

/**
 * Responde a cocina cuando se acabó una parte del plato.
 * API real: POST /api/comandas/:id/reemplazos
 */
export async function replaceComponent(tableId: string, sub: Substitution & { comandaId: string }): Promise<void> {
  return roundTrip(() => {
    const state = loadServer(tableId)
    const comanda = state.comandas.find((c) => c.id === sub.comandaId)
    if (comanda) {
      const { comandaId: _ignored, ...rest } = sub
      void _ignored
      comanda.substitutions = [...comanda.substitutions, rest]
      saveServer(tableId, state)
    }
  }, 400)
}

/**
 * Capa de API del cliente en mesa.
 *
 * HOY: todo se simula en el navegador con setTimeout y un "servidor" falso
 * guardado en localStorage por mesa (así varias pestañas ven la misma cuenta).
 * MAÑANA: cada función hace fetch al backend con la misma firma, y las
 * pantallas no cambian. Los puntos a reemplazar están marcados con "API real:".
 */
import type { BillRequest, Channel, Comanda, ComandaItem, ComandaStatus, PayMethod, PayScope, Substitution } from '../types/order'
import { restaurant } from './catalog'
import { tipAmount } from './money'
import { readDemoFlags } from './demoFlags'
import { newId } from './storage'
import { addReviews } from './reviews'
import { msToNextStatus, simulatedStatus } from './simulator'
import { fmt, t } from './text'
import { isTakeout } from './channel'
import {
  comandaId,
  itemsFromIds,
  loadServer,
  markNumbersUsed,
  nextComandaNumber,
  saveServer,
  serverKey,
  type ServerTable,
} from './server'
import { isStaffLive } from './staffLive'
import { panelSettingsStore } from '../store/panelSettings'

export class ApiError extends Error {
  readonly code: 'offline' | 'server' | 'blocked'
  constructor(code: 'offline' | 'server' | 'blocked', message = code) {
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

const { timings, staff } = restaurant
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
/* "Servidor" simulado (lib/server.ts)                                  */
/* ------------------------------------------------------------------ */

/** Simula que otros teléfonos de la mesa también pidieron (se apaga con ?compas=0). */
function seedTableMates(state: ServerTable, tableId: string, createdAt: string, live: boolean) {
  if (state.matesSeeded || !readDemoFlags().compas) return
  for (const mate of restaurant.demo.tableMates) {
    if (state.comandas.some((c) => c.number === mate.comandaNumber)) continue
    const items = itemsFromIds(mate.items)
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
      ...(live ? { kitchenLive: true, statusTimes: { recibida: createdAt, 'en-el-comal': createdAt } } : {}),
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
    // Caja bloqueó la mesa ("¿Pedidos raros?"): no recibe pedidos nuevos.
    if (state.blocked) throw new ApiError('blocked')
    const now = new Date().toISOString()
    const number = nextComandaNumber(state)
    // Con la cocina abierta en otra pestaña (demo del personal), el pedido espera a que la cocina lo mueva.
    const live = isStaffLive()
    // Regla "El mesero acepta el primer pedido": el primero de la mesa (sin cuenta abierta) espera al mesero.
    const firstOfTable = !state.comandas.some((c) => !c.paid && !c.rejectedAt)
    const needsAccept =
      live && !isTakeout(input.tableId) && firstOfTable && panelSettingsStore.getState().waiterAccepts
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
      ...(live ? { kitchenLive: true, statusTimes: { recibida: now } } : {}),
      ...(needsAccept ? { pendingAccept: true } : {}),
    }
    state.comandas.push(comanda)
    // Los compañeros simulados son de la mesa; el pedido para llevar es solo de este cliente.
    if (!isTakeout(input.tableId)) seedTableMates(state, input.tableId, now, live)
    saveServer(input.tableId, state)
    markNumbersUsed(state.comandas.map((c) => c.number))
    return { comanda, account: state.comandas }
  })
}

/**
 * Escucha los cambios que hace el personal en el "servidor" de una mesa: otra
 * pestaña escribe en localStorage y esta se entera por el evento storage (y,
 * por las dudas, revisando cada pocos segundos). API real: WebSocket.
 */
function watchServer(tableId: string, onChange: (state: ServerTable) => void): () => void {
  const key = serverKey(tableId)
  const check = () => onChange(loadServer(tableId))
  const onStorage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) check()
  }
  window.addEventListener('storage', onStorage)
  const id = window.setInterval(check, restaurant.staffDemo.pollMs)
  check()
  return () => {
    window.removeEventListener('storage', onStorage)
    window.clearInterval(id)
  }
}

/** Cuenta completa de la mesa. API real: GET /api/mesas/:mesa/cuenta */
export async function fetchAccount(tableId: string): Promise<Comanda[]> {
  // Lo que rechazó el mesero no se suma a la cuenta.
  return roundTrip(() => loadServer(tableId).comandas.filter((c) => !c.rejectedAt), 150)
}

/**
 * Sigue el estado de una comanda y avisa cada cambio.
 * API real: WebSocket o polling a GET /api/comandas/:id. Devuelve la función para dejar de escuchar.
 */
export function watchComanda(
  comanda: Comanda,
  onStatus: (status: ComandaStatus, statusTimes?: Comanda['statusTimes']) => void,
): () => void {
  // Con la cocina del personal abierta, el estado lo cambia la cocina (otra pestaña).
  if (comanda.kitchenLive) {
    let last = ''
    return watchServer(comanda.tableId, (state) => {
      const current = state.comandas.find((c) => c.id === comanda.id)
      if (!current) return
      const signature = `${current.status}|${JSON.stringify(current.statusTimes ?? {})}`
      if (signature === last) return
      last = signature
      onStatus(current.status, current.statusTimes)
    })
  }
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
 * Queda en el "servidor" de la mesa, así lo ve la pantalla de Meseros (P3).
 * API real: POST /api/mesas/:mesa/llamados { motivo }
 */
export async function callWaiter(tableId: string, reason: string, at: number): Promise<void> {
  return roundTrip(() => {
    const state = loadServer(tableId)
    state.calls = [...(state.calls ?? []), { at, reason, live: isStaffLive() }]
    saveServer(tableId, state)
  }, 300)
}

/**
 * Avisa cuando un mesero toma el llamado ("Carlos va en camino").
 * - Con el personal abierto (otra pestaña), cuando el mesero toca "Voy".
 * - Si no, simulado a los timings.waiterAckMs de haber llamado; sobrevive a recargas.
 * API real: WebSocket con el evento "llamado tomado". Devuelve la función para dejar de escuchar.
 */
export function watchWaiterCall(tableId: string, calledAt: number, onAck: (waiter: string) => void): () => void {
  if (isStaffLive()) {
    return watchServer(tableId, (state) => {
      const call = state.calls?.find((c) => c.at === calledAt)
      if (call?.ackAt) onAck(call.waiter ?? staff.waiter)
    })
  }
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
    saveServer(tableId, { ...state, bill: request, billAt: new Date().toISOString() })
    return { cashier: staff.cashier }
  })
}

/** Recibo simulado (sin caja del personal): lo que pidió el teléfono al avisar. */
function simulatedReceipt(tableId: string, state: ServerTable): Receipt {
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

/** El cobro de caja que incluyó lo de este teléfono, si ya lo hubo. */
function paymentForMe(tableId: string, state: ServerTable): Receipt | null {
  const mine = state.comandas.filter((c) => c.mine)
  if (!mine.length || !mine.every((c) => c.paid)) return null
  const payment = [...(state.payments ?? [])].reverse().find((p) => mine.some((c) => p.comandaIds.includes(c.id)))
  if (!payment) return null
  return {
    tableId,
    scope: payment.scope,
    subtotal: payment.subtotal,
    tip: payment.tip,
    total: payment.total,
    method: payment.method,
    change: payment.change,
    cashier: payment.cashier,
    paidAt: payment.at,
  }
}

/**
 * Espera a que caja cobre lo de este teléfono y cierre la mesa.
 * - Si la caja del personal está abierta (otra pestaña), avisa cuando cobra.
 * - Si este teléfono avisó a caja (sinceMs), además se simula el cobro a los
 *   timings.billPaidMs (con ?forzar=pago-rapido, 5 s), lo que pase primero.
 * Devuelve la función para dejar de esperar. API real: WebSocket con el evento "mesa cerrada".
 */
export function watchPayment(tableId: string, sinceMs: number | null, onPaid: (receipt: Receipt) => void): () => void {
  let done = false
  let timer = 0
  // El primer chequeo es inmediato: puede terminar antes de tener con qué dejar de escuchar.
  const watch: { stop?: () => void } = {}
  const finish = (receipt: Receipt) => {
    if (done) return
    done = true
    window.clearTimeout(timer)
    watch.stop?.()
    onPaid(receipt)
  }
  watch.stop = watchServer(tableId, (state) => {
    const receipt = paymentForMe(tableId, state)
    if (receipt) finish(receipt)
  })
  if (done) watch.stop()
  if (sinceMs !== null && !done) {
    const delay = readDemoFlags().pagoRapido ? 5000 : timings.billPaidMs
    timer = window.setTimeout(
      () => finish(simulatedReceipt(tableId, loadServer(tableId))),
      Math.max(0, sinceMs + delay - Date.now()),
    )
  }
  return () => {
    done = true
    window.clearTimeout(timer)
    watch.stop?.()
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

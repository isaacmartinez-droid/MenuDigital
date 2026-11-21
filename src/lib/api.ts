/**
 * Capa de API del cliente en mesa.
 *
 * HOY: todo se simula en el navegador con setTimeout y un "servidor" falso
 * guardado en localStorage por mesa (así varias pestañas ven la misma cuenta).
 * MAÑANA: cada función hace fetch al backend con la misma firma, y las
 * pantallas no cambian. Los puntos a reemplazar están marcados con "API real:".
 */
import type { Comanda, ComandaItem, ComandaStatus, SplitMode, Substitution } from '../types/order'
import { getDish, getExtra, getSide, restaurant, unitPrice } from './catalog'
import { readDemoFlags } from './demoFlags'
import { readItem, tableKey, writeItem } from './storage'
import { msToNextStatus, simulatedStatus } from './simulator'
import { fmt, t } from './text'

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
}

export interface Receipt {
  tableId: string
  total: number
  method: string
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
      total: input.items.reduce((s, i) => s + i.lineTotal, 0),
      status: 'recibida',
      createdAt: now,
      statusAt: now,
      substitutions: [],
    }
    state.comandas.push(comanda)
    seedTableMates(state, input.tableId, now)
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
 * Avisa a los meseros. Resuelve cuando uno toma el aviso.
 * API real: POST /api/mesas/:mesa/llamados { motivo } y esperar la confirmación por WebSocket.
 */
export async function callWaiter(tableId: string, reason: string): Promise<{ waiter: string }> {
  void tableId
  void reason
  return roundTrip(() => ({ waiter: staff.waiter }), timings.waiterAckMs)
}

/**
 * Avisa a caja que la mesa va a pagar.
 * API real: POST /api/mesas/:mesa/cuenta/solicitar { modo }
 */
export async function requestBill(tableId: string, split: SplitMode): Promise<{ cashier: string }> {
  void tableId
  void split
  return roundTrip(() => ({ cashier: staff.cashier }))
}

/**
 * Espera a que caja cobre y cierre la mesa (simulado a los timings.billPaidMs).
 * API real: WebSocket con el evento "mesa cerrada".
 */
export async function waitForPayment(tableId: string, sinceMs: number): Promise<Receipt> {
  const remaining = Math.max(0, sinceMs + timings.billPaidMs - Date.now())
  await wait(remaining)
  const total = loadServer(tableId).comandas.reduce((s, c) => s + c.total, 0)
  return {
    tableId,
    total,
    method: restaurant.demo.paymentMethod,
    cashier: staff.cashier,
    paidAt: new Date().toISOString(),
  }
}

/**
 * Calificación rápida por plato (1 a 5).
 * API real: POST /api/mesas/:mesa/calificaciones { [platoId]: estrellas }
 */
export async function rateDishes(tableId: string, ratings: Record<string, number>): Promise<void> {
  void tableId
  void ratings
  return roundTrip(() => undefined, 300)
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

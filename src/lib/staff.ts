import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { Channel, Comanda, ComandaStatus, PayMethod, PayScope, Payment } from '../types/order'
import { restaurant } from './catalog'
import { TAKEOUT } from './channel'
import { tipAmount } from './money'
import { comandaId, isTableSettled, itemsFromIds, parseServer, saveServer, loadServer, markNumbersUsed, type ServerTable } from './server'
import { simulatedStatus } from './simulator'
import { listKeys, readItem, writeItem } from './storage'
import { fmt, t } from './text'

/**
 * Tablero del personal (cocina y caja): junta los pedidos de todas las mesas y
 * de la web que hay en este navegador, más unos pedidos de ejemplo para que la
 * demo no se vea vacía. Los cambios (cocinar, lista, entregado, confirmar,
 * cobrar) se escriben en el mismo "servidor" simulado que lee la mesa, así el
 * cliente los ve en su pestaña. API real: GET /api/cocina, /api/caja y sus acciones.
 */

/** De dónde sale una mesa: del "servidor" de la app o de los ejemplos del personal. */
export type BoardSource = 'real' | 'ejemplo'

/** Id de cuenta del mostrador (pedidos que toma la caja). */
export const COUNTER = 'mostrador'

export interface BoardTable {
  source: BoardSource
  /** "5", "llevar" o "mostrador". */
  tableId: string
  state: ServerTable
}

export interface BoardComanda {
  table: BoardTable
  comanda: Comanda
  /** Estado real: el de cocina o, si avanza solo, el del simulador. */
  status: ComandaStatus
  channel: Channel
}

const id = restaurant.id
const SEEDS_KEY = `${id}:personal:ejemplos`
const { staffSeeds } = restaurant.demo

interface SeedStore {
  createdAt: number
  tables: Record<string, ServerTable>
}

/* ------------------------------------------------------------------ */
/* Pedidos de ejemplo                                                   */
/* ------------------------------------------------------------------ */

const STATUS_ORDER: ComandaStatus[] = ['recibida', 'en-el-comal', 'lista', 'entregada']

function buildSeeds(now: number): SeedStore {
  const tables: Record<string, ServerTable> = {}
  for (const seed of staffSeeds) {
    const channel: Channel | undefined =
      seed.table === TAKEOUT ? 'llevar' : seed.table === COUNTER ? 'mostrador' : undefined
    const comandas = seed.comandas.map((c): Comanda => {
      const items = itemsFromIds(c.items)
      const at = new Date(now - c.minAgo * 60_000).toISOString()
      const status = (STATUS_ORDER.includes(c.status as ComandaStatus) ? c.status : 'recibida') as ComandaStatus
      const passed = STATUS_ORDER.slice(0, STATUS_ORDER.indexOf(status) + 1)
      return {
        id: comandaId(c.number),
        number: c.number,
        tableId: seed.table,
        customerName: c.name ?? fmt(t.common.device, { n: c.device ?? 1 }),
        mine: false,
        items,
        ...(c.note ? { note: c.note } : {}),
        ...(channel ? { channel } : {}),
        ...(c.phone ? { phone: c.phone } : {}),
        total: items.reduce((s, i) => s + i.lineTotal, 0),
        status,
        createdAt: at,
        statusAt: at,
        substitutions: [],
        kitchenLive: true,
        statusTimes: Object.fromEntries(passed.map((s) => [s, at])),
      }
    })
    tables[seed.table] = {
      comandas,
      matesSeeded: true,
      ...(seed.callSecAgo !== undefined
        ? { calls: [{ at: now - seed.callSecAgo * 1000, reason: seed.callReason ?? '', live: true }] }
        : {}),
      ...(seed.billMinAgo !== undefined
        ? {
            bill: { scope: 'table', tip: { kind: 'none' }, method: null, cashGiven: null },
            billAt: new Date(now - seed.billMinAgo * 60_000).toISOString(),
          }
        : {}),
    }
  }
  return { createdAt: now, tables }
}

function loadSeeds(): SeedStore | null {
  try {
    const raw = readItem('local', SEEDS_KEY)
    return raw ? (JSON.parse(raw) as SeedStore) : null
  } catch {
    return null
  }
}

const saveSeeds = (seeds: SeedStore) => writeItem('local', SEEDS_KEY, JSON.stringify(seeds))

/**
 * Crea los pedidos de ejemplo si no hay, si son viejos (staffDemo.seedsMaxAgeMin)
 * o si se pide empezar de cero (?forzar=ejemplos).
 */
export function ensureSeeds(force = false): void {
  const now = Date.now()
  const current = loadSeeds()
  if (!force && current && now - current.createdAt < restaurant.staffDemo.seedsMaxAgeMin * 60_000) return
  saveSeeds(buildSeeds(now))
  markNumbersUsed(staffSeeds.flatMap((s) => s.comandas.map((c) => c.number)))
  notify()
}

/* ------------------------------------------------------------------ */
/* Lectura                                                              */
/* ------------------------------------------------------------------ */

const tablePattern = new RegExp(`^${id}:mesa:([^:]+):servidor$`)
const takeoutKey = `${id}:${TAKEOUT}:servidor`

/** Las cuentas reales (mesas y web) guardadas en este navegador. */
function realTables(): BoardTable[] {
  const tables: BoardTable[] = []
  for (const key of listKeys(`${id}:`)) {
    const match = tablePattern.exec(key)
    const tableId = match ? match[1] : key === takeoutKey ? TAKEOUT : null
    if (!tableId) continue
    const state = parseServer(readItem('local', key))
    if (state) tables.push({ source: 'real', tableId, state })
  }
  return tables
}

export function readBoard(): BoardTable[] {
  const real = realTables()
  const seeds = loadSeeds()
  // Si la mesa de ejemplo está en uso de verdad (alguien abrió /m/6), queda la real.
  const examples = Object.entries(seeds?.tables ?? {})
    .filter(([tableId]) => tableId === TAKEOUT || !real.some((r) => r.tableId === tableId && r.state.comandas.length))
    .map(([tableId, state]): BoardTable => ({ source: 'ejemplo', tableId, state }))
  return [...real, ...examples]
}

/** Estado real de una comanda: el que puso la cocina o, si avanza sola, el del simulador. */
export const effectiveStatus = (c: Comanda): ComandaStatus => (c.kitchenLive ? c.status : simulatedStatus(c.createdAt))

export const channelOf = (c: Comanda): Channel => c.channel ?? 'mesa'

/** Todas las comandas del tablero con su estado real. */
export function boardComandas(tables: BoardTable[]): BoardComanda[] {
  return tables.flatMap((table) =>
    table.state.comandas.map((comanda) => ({
      table,
      comanda,
      status: effectiveStatus(comanda),
      channel: channelOf(comanda),
    })),
  )
}

/** Pedido para llevar que espera que caja lo confirme por WhatsApp. */
export const awaitingConfirmation = (c: BoardComanda) =>
  c.channel === 'llevar' && Boolean(c.comanda.kitchenLive) && !c.comanda.confirmedAt && c.status === 'recibida'

/* ------------------------------------------------------------------ */
/* Suscripción (otras pestañas, el reloj y los cambios propios)         */
/* ------------------------------------------------------------------ */

const listeners = new Set<() => void>()
function notify() {
  listeners.forEach((l) => l())
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith(`${id}:`)) onChange()
  }
  window.addEventListener('storage', onStorage)
  // Por las dudas (y para los pedidos que avanzan solos con el simulador).
  const timer = window.setInterval(onChange, restaurant.staffDemo.pollMs)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
    window.clearInterval(timer)
  }
}

/** Firma de lo guardado: si no cambió, la pantalla no se vuelve a calcular. */
function signature(): string {
  const keys = [...listKeys(`${id}:mesa:`).filter((k) => k.endsWith(':servidor')), takeoutKey, SEEDS_KEY]
  const simulated = Math.floor(Date.now() / 1000)
  return `${keys.map((k) => readItem('local', k) ?? '').join('\u0001')}|${simulated}`
}

/** Cuentas del tablero, al día con lo que pasa en las otras pestañas. */
export function useBoard(): BoardTable[] {
  useEffect(() => ensureSeeds(), [])
  const sig = useSyncExternalStore(subscribe, signature)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- sig resume todo lo que lee readBoard
  return useMemo(() => readBoard(), [sig])
}

/* ------------------------------------------------------------------ */
/* Acciones                                                             */
/* ------------------------------------------------------------------ */

function update(table: BoardTable, change: (state: ServerTable) => void) {
  if (table.source === 'real') {
    const state = loadServer(table.tableId)
    change(state)
    saveServer(table.tableId, state)
  } else {
    const seeds = loadSeeds()
    const state = seeds?.tables[table.tableId]
    if (!seeds || !state) return
    change(state)
    saveSeeds(seeds)
  }
  notify()
}

/** Cocina: "A cocinar", "Lista" o "Entregado". */
export function setComandaStatus(table: BoardTable, comandaId: string, status: ComandaStatus) {
  update(table, (state) => {
    const c = state.comandas.find((x) => x.id === comandaId)
    if (!c) return
    const now = new Date().toISOString()
    // Si avanzaba solo (se pidió sin la cocina abierta), desde ahora lo mueve la cocina.
    const times = c.kitchenLive ? (c.statusTimes ?? {}) : { recibida: c.createdAt }
    c.kitchenLive = true
    c.status = status
    c.statusAt = now
    c.statusTimes = { ...times, [status]: now }
  })
}

/** Caja: el cliente respondió por WhatsApp; el pedido pasa a cocina. */
export function confirmTakeout(table: BoardTable, comandaId: string) {
  update(table, (state) => {
    const c = state.comandas.find((x) => x.id === comandaId)
    if (c) c.confirmedAt = new Date().toISOString()
  })
}

/** Lo que se cobra: toda la mesa o lo de una persona, con la propina que pidió el cliente. */
export function chargeAmounts(state: ServerTable, comandaIds: string[]) {
  const comandas = state.comandas.filter((c) => comandaIds.includes(c.id))
  const subtotal = comandas.reduce((s, c) => s + c.total, 0)
  // La propina es la que eligió quien avisó a caja (si lo que se cobra incluye lo suyo).
  const includesRequester = comandas.some((c) => c.mine)
  const tip = state.bill && includesRequester ? tipAmount(subtotal, state.bill.tip) : 0
  return { subtotal, tip, total: subtotal + tip }
}

export interface ChargeInput {
  comandaIds: string[]
  scope: PayScope
  method: PayMethod
  received: number | null
}

/** Caja: cobra (toda la mesa o una persona). Devuelve el cobro y si la mesa quedó cerrada. */
export function chargeTable(table: BoardTable, input: ChargeInput): { payment: Payment; closed: boolean } | null {
  let result: { payment: Payment; closed: boolean } | null = null
  update(table, (state) => {
    const { subtotal, tip, total } = chargeAmounts(state, input.comandaIds)
    const change = input.method === 'efectivo' && input.received !== null && input.received > total ? input.received - total : null
    const payment: Payment = {
      comandaIds: input.comandaIds,
      scope: input.scope,
      subtotal,
      tip,
      total,
      method: input.method,
      received: input.method === 'efectivo' ? input.received : null,
      change,
      cashier: restaurant.staff.cashier,
      at: new Date().toISOString(),
    }
    for (const c of state.comandas) if (input.comandaIds.includes(c.id)) c.paid = true
    state.payments = [...(state.payments ?? []), payment]
    result = { payment, closed: isTableSettled(state) }
  })
  return result
}

/* ------------------------------------------------------------------ */
/* Meseros (P3)                                                          */
/* ------------------------------------------------------------------ */

/** Mesero: "Voy" (el cliente ve "Carlos va en camino"). */
export function ackCall(table: BoardTable, at: number) {
  update(table, (state) => {
    const call = state.calls?.find((c) => c.at === at)
    if (call && !call.ackAt) {
      call.ackAt = Date.now()
      call.waiter = restaurant.staff.waiter
    }
  })
}

/** Mesero: "Atendido" (el aviso desaparece). */
export function finishCall(table: BoardTable, at: number) {
  update(table, (state) => {
    const call = state.calls?.find((c) => c.at === at)
    if (call) call.doneAt = Date.now()
  })
}

/** Mesero: "Mesa limpia" en el aviso de que la mesa está pagando. */
export function markCleaned(table: BoardTable) {
  update(table, (state) => {
    state.cleanedAt = Date.now()
  })
}

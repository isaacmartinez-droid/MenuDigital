import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { Channel, Comanda, ComandaItem, ComandaStatus, PayMethod, PayScope, Payment } from '../types/order'
import { restaurant } from './catalog'
import { TAKEOUT } from './channel'
import { tipAmount } from './money'
import { comandaId, isTableSettled, itemsFromIds, nextComandaNumber, parseServer, saveServer, loadServer, markNumbersUsed, type ServerTable } from './server'
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
    // Lo que rechazó el mesero no va a la cocina ni a la cuenta.
    if (state) tables.push({ source: 'real', tableId, state: { ...state, comandas: state.comandas.filter((c) => !c.rejectedAt) } })
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
    // Para el corte del día: la mesa se borra al cerrarse, el registro de cobros queda.
    const byChannel: Partial<Record<Channel, number>> = {}
    for (const c of state.comandas.filter((x) => input.comandaIds.includes(x.id))) {
      const ch = channelOf(c)
      byChannel[ch] = (byChannel[ch] ?? 0) + c.total
    }
    appendLedger({ at: payment.at, total, method: input.method, tableId: table.tableId, comandas: input.comandaIds.length, byChannel })
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

/* ------------------------------------------------------------------ */
/* Caja: bloquear, pedido manual y corte (P2c, P2d)                     */
/* ------------------------------------------------------------------ */

/** Caja: "Bloquear mesa" / "Desbloquear mesa". La mesa deja de recibir pedidos. */
export function setBlocked(table: BoardTable, blocked: boolean) {
  update(table, (state) => {
    if (blocked) state.blocked = true
    else delete state.blocked
  })
}

/** Mesero: acepta el primer pedido de la mesa; pasa a la cocina. */
export function acceptComanda(table: BoardTable, comandaId: string) {
  update(table, (state) => {
    const c = state.comandas.find((x) => x.id === comandaId)
    if (c) delete c.pendingAccept
  })
}

/** Mesero: rechaza el primer pedido de la mesa; no entra a la cocina ni a la cuenta. */
export function rejectComanda(table: BoardTable, comandaId: string) {
  update(table, (state) => {
    const c = state.comandas.find((x) => x.id === comandaId)
    if (!c) return
    delete c.pendingAccept
    c.rejectedAt = new Date().toISOString()
  })
}

export interface ManualOrderInput {
  /** "5", "mostrador" o "llevar". */
  tableId: string
  channel: Channel
  customerName: string
  phone?: string
  items: ComandaItem[]
}

/**
 * Caja o mesero: pedido para quien no tiene celular (P2c). Entra directo a la cocina
 * (ya está confirmado) y se suma a la cuenta de la mesa, del mostrador o para llevar.
 * Devuelve la cuenta y la comanda, o null si la mesa está bloqueada.
 */
export function createManualOrder(input: ManualOrderInput): { table: BoardTable; comanda: Comanda } | null {
  const state = loadServer(input.tableId)
  if (state.blocked) return null
  const now = new Date().toISOString()
  const number = nextComandaNumber(state)
  const comanda: Comanda = {
    id: comandaId(number),
    number,
    tableId: input.tableId,
    customerName: input.customerName,
    mine: false,
    items: input.items,
    ...(input.channel !== 'mesa' ? { channel: input.channel } : {}),
    ...(input.phone ? { phone: input.phone } : {}),
    total: input.items.reduce((s, i) => s + i.lineTotal, 0),
    status: 'recibida',
    createdAt: now,
    statusAt: now,
    substitutions: [],
    kitchenLive: true,
    statusTimes: { recibida: now },
    ...(input.channel === 'llevar' ? { confirmedAt: now } : {}),
  }
  state.comandas.push(comanda)
  saveServer(input.tableId, state)
  markNumbersUsed(state.comandas.map((c) => c.number))
  notify()
  return { table: { source: 'real', tableId: input.tableId, state }, comanda }
}

/** Un cobro en el registro de caja (para el corte del día). */
export interface LedgerEntry {
  at: string
  total: number
  method: PayMethod
  tableId: string
  comandas: number
  byChannel: Partial<Record<Channel, number>>
}

export interface DayClose {
  at: string
  total: number
  counted: number | null
}

const LEDGER_KEY = `${id}:caja:cobros`
const CLOSES_KEY = `${id}:caja:cortes`

const readList = <T,>(key: string): T[] => {
  try {
    return JSON.parse(readItem('local', key) ?? '[]') as T[]
  } catch {
    return []
  }
}

function appendLedger(entry: LedgerEntry) {
  writeItem('local', LEDGER_KEY, JSON.stringify([...readList<LedgerEntry>(LEDGER_KEY), entry]))
}

/** Cobros desde el último corte (y de hoy, en la zona del local). */
export function ledgerSinceLastClose(): LedgerEntry[] {
  const closes = readList<DayClose>(CLOSES_KEY)
  const last = closes.length ? Date.parse(closes[closes.length - 1].at) : 0
  const today = localDay(new Date())
  return readList<LedgerEntry>(LEDGER_KEY).filter((e) => Date.parse(e.at) > last && localDay(new Date(e.at)) === today)
}

/** "Cerrar el día": guarda el corte; los cobros siguientes van al próximo. */
export function closeDay(total: number, counted: number | null): DayClose {
  const entry: DayClose = { at: new Date().toISOString(), total, counted }
  writeItem('local', CLOSES_KEY, JSON.stringify([...readList<DayClose>(CLOSES_KEY), entry]))
  notify()
  return entry
}

const localDay = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: restaurant.schedule.timezone }).format(date)

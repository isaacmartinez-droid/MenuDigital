import type { BillRequest, Comanda, ComandaItem, Payment } from '../types/order'
import { getDish, getExtra, getSide, restaurant, unitPrice } from './catalog'
import { readItem, tableKey, writeItem } from './storage'

/**
 * "Servidor" simulado: lo que en la app real guarda el backend. Vive en
 * localStorage, una entrada por mesa (y una para los pedidos web), así varias
 * pestañas del mismo navegador ven lo mismo: la mesa en una y la cocina o la
 * caja en otra. API real: todo esto lo reemplazan los endpoints de api.ts.
 */
export interface ServerTable {
  comandas: Comanda[]
  matesSeeded: boolean
  /** Lo que se pidió al avisar a caja (la propina se calcula al cobrar). */
  bill?: BillRequest
  /** Cuándo avisaron a caja (ISO). */
  billAt?: string
  /** Cobros de caja (toda la mesa o por persona). */
  payments?: Payment[]
  /** Llamados al mesero (P3): el mesero los toma con "Voy" y los cierra con "Atendido". */
  calls?: WaiterCallRecord[]
  /** El mesero tocó "Mesa limpia" en el aviso de que la mesa está pagando (ms). */
  cleanedAt?: number
}

/** Un llamado al mesero. Tiempos en milisegundos. */
export interface WaiterCallRecord {
  at: number
  reason: string
  /** Se llamó con el personal abierto: lo toma un mesero, no el simulador. */
  live: boolean
  /** "Voy": el cliente ve "Carlos va en camino". */
  ackAt?: number
  waiter?: string
  /** "Atendido": el aviso desaparece. */
  doneAt?: number
}

export const serverKey = (tableId: string) => tableKey(tableId, 'servidor')

export function parseServer(raw: string | null): ServerTable | null {
  if (!raw) return null
  try {
    const state = JSON.parse(raw) as ServerTable
    return Array.isArray(state.comandas) ? state : null
  } catch {
    return null
  }
}

export function loadServer(tableId: string): ServerTable {
  return parseServer(readItem('local', serverKey(tableId))) ?? { comandas: [], matesSeeded: false }
}

export const saveServer = (tableId: string, state: ServerTable) =>
  writeItem('local', serverKey(tableId), JSON.stringify(state))

const { comandaPrefix, firstComandaNumber } = restaurant.ordering

/** 142 → "FN-0142" */
export const comandaId = (n: number) => `${comandaPrefix}-${String(n).padStart(4, '0')}`

/**
 * Último número de comanda usado en todo el local (mesas, web y mostrador), así
 * la cocina nunca ve dos "FN-0142". API real: lo numera el servidor.
 */
const COUNTER_KEY = `${restaurant.id}:ultimo-numero`

export function nextComandaNumber(state: ServerTable): number {
  // Nunca por debajo del primer número (los pedidos de ejemplo del personal usan números más bajos).
  const last = Number(readItem('local', COUNTER_KEY)) || 0
  const inTable = state.comandas.length ? Math.max(...state.comandas.map((c) => c.number)) : 0
  return Math.max(last, inTable, firstComandaNumber - 1) + 1
}

/** Registra los números usados (el de la comanda nueva y los de los compañeros simulados). */
export function markNumbersUsed(numbers: number[]): void {
  const last = Number(readItem('local', COUNTER_KEY)) || 0
  writeItem('local', COUNTER_KEY, String(Math.max(last, ...numbers)))
}

/**
 * Este teléfono pagó lo suyo en la caja del personal y se desconecta de la mesa:
 * lo que deben los demás sigue abierto en caja (ya no es "de este teléfono").
 * Con el cobro simulado (sin caja) no se marca nada como pagado y la mesa se cierra entera.
 */
export function keepOthersOpen(tableId: string, before: ServerTable): void {
  if (!before.comandas.some((c) => c.paid) || before.comandas.every((c) => c.paid)) return
  saveServer(tableId, {
    ...before,
    bill: undefined,
    billAt: undefined,
    comandas: before.comandas.map((c) => ({ ...c, mine: false })),
  })
}

/** ¿Se cobró todo lo de la mesa? */
export const isTableSettled = (state: ServerTable) =>
  state.comandas.length > 0 && state.comandas.every((c) => c.paid)

/** Líneas de comanda a partir de ids del menú (compañeros simulados y pedidos de ejemplo). */
export function itemsFromIds(
  items: { dishId: string; quantity: number; sideId?: string; extraIds?: string[] }[],
): ComandaItem[] {
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

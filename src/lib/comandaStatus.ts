import type { Comanda, ComandaItem, ComandaStatus } from '../types/order'
import { restaurant } from './catalog'
import { formatClock, zonedNow } from './schedule'
import { fmt, t } from './text'

/** Detalle de un plato pedido: "con gallo pinto · Queso frito extra · sin repollo". */
export function itemDetails(item: ComandaItem): string {
  return [
    item.sideName ? fmt(t.tracking.withSide, { side: item.sideName.toLowerCase() }) : '',
    ...item.extras.map((e) => e.name),
    item.note ?? '',
  ]
    .filter(Boolean)
    .join(' · ')
}

const ORDER: ComandaStatus[] = ['recibida', 'en-el-comal', 'lista', 'entregada']

/** "En el comal", "¡Ya está!"… (mismos nombres que los pasos de la barra). */
export const statusLabel = (status: ComandaStatus): string => t.tracking.steps[ORDER.indexOf(status)] ?? status

/** Hora en que se envió, en la zona del local: "7:42 pm". */
export const sentAtClock = (comanda: Comanda): string =>
  formatClock(zonedNow(restaurant.schedule.timezone, new Date(comanda.createdAt)).minutes)

/**
 * Minutos que faltan para que esté lista, contando desde el envío
 * (timings.readyEstimateMin). Nunca menos de 1. Con API real lo manda cocina.
 */
export function etaMinutes(comanda: Comanda, now: number): number {
  const elapsedMin = (now - Date.parse(comanda.createdAt)) / 60_000
  return Math.max(1, Math.ceil(restaurant.timings.readyEstimateMin - elapsedMin))
}

/** "7:57 pm" y "8:02 pm" → "7:57 – 8:02 pm"; si cambia am/pm, se dejan los dos. */
function clockRange(from: number, to: number): string {
  const a = formatClock(from)
  const b = formatClock(to)
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)} – ${b}` : `${a} – ${b}`
}

export interface Eta {
  /** "7:57 – 8:02 pm" */
  range: string
  /** Minutos que faltan para el inicio y el fin del rango (mínimo 1). */
  minFrom: number
  minTo: number
}

/**
 * Hora estimada en que la orden está lista, como rango: desde el envío más
 * timings.readyEstimateMin, con timings.etaRangeMin de margen. Con API real la manda cocina.
 */
export function etaFor(comanda: Comanda, now: number): Eta {
  const { readyEstimateMin, etaRangeMin } = restaurant.timings
  const tz = restaurant.schedule.timezone
  const readyAt = Date.parse(comanda.createdAt) + readyEstimateMin * 60_000
  const fromMin = zonedNow(tz, new Date(readyAt)).minutes
  const minFrom = Math.max(1, Math.ceil((readyAt - now) / 60_000))
  return {
    range: clockRange(fromMin, (fromMin + etaRangeMin) % 1440),
    minFrom,
    minTo: minFrom + etaRangeMin,
  }
}

/** La orden de este teléfono que sigue en curso (la más reciente sin entregar), si hay. */
export function activeComanda(comandas: Comanda[]): Comanda | undefined {
  return comandas
    .filter((c) => c.mine && c.status !== 'entregada')
    .sort((a, b) => b.number - a.number)[0]
}

import type { ComandaStatus } from '../types/order'
import { restaurant } from './catalog'

/**
 * Simulador de cocina: el estado de una comanda depende solo del tiempo
 * desde que se envió (config: timings.processingMs, cookingMs, readyMs).
 * Como se calcula a partir de la hora de envío, recargar la página no lo
 * reinicia. Con una API real, el estado lo manda el servidor.
 */
const { processingMs, cookingMs, readyMs } = restaurant.timings

const STEPS: { status: ComandaStatus; until: number }[] = [
  { status: 'recibida', until: processingMs },
  { status: 'en-el-comal', until: processingMs + cookingMs },
  { status: 'lista', until: processingMs + cookingMs + readyMs },
]

export function simulatedStatus(createdAt: string, now: number = Date.now()): ComandaStatus {
  const elapsed = now - Date.parse(createdAt)
  return STEPS.find((s) => elapsed < s.until)?.status ?? 'entregada'
}

/** Milisegundos hasta el próximo cambio de estado, o null si ya se entregó. */
export function msToNextStatus(createdAt: string, now: number = Date.now()): number | null {
  const elapsed = now - Date.parse(createdAt)
  const next = STEPS.find((s) => elapsed < s.until)
  return next ? next.until - elapsed : null
}

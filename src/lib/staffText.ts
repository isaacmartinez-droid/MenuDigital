import type { BoardComanda } from './staff'
import { restaurant } from './catalog'
import { formatClock, zonedNow } from './schedule'
import { fmt, t, tableLabel } from './text'

/** Dónde está el pedido: "Mesa 2 · Teléfono 1", "Para llevar · Ana" o "Mostrador". */
export function placeLabel({ channel, comanda }: BoardComanda): string {
  if (channel === 'llevar') return fmt(t.staff.channelTakeout, { name: comanda.customerName })
  if (channel === 'mostrador') return t.staff.counter
  return fmt(t.staff.channelTable, { mesa: tableLabel(comanda.tableId), name: comanda.customerName })
}

/** Minutos enteros desde una hora ISO. */
export const minutesSince = (iso: string, now: number) => Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000))

/** "recién" o "hace 14 min". */
export const agoText = (iso: string, now: number) => {
  const min = minutesSince(iso, now)
  return min < 1 ? t.staff.justNow : fmt(t.staff.ago, { min })
}

/** Hora actual en la zona del local: "8:22 pm". */
export const clockNow = (now: number) => formatClock(zonedNow(restaurant.schedule.timezone, new Date(now)).minutes)

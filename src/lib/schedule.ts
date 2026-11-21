import type { ScheduleRange } from '../types/restaurant'

export interface OpenState {
  open: boolean
  /** "10:00 pm" si está abierto. */
  closesAt?: string
  /** "4:00 pm" si está cerrado y hay próxima apertura. */
  opensAt?: string
}

const DAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/** Día de la semana y minutos desde medianoche en la zona horaria del local. */
export function zonedNow(timeZone: string, date: Date = new Date()): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0'
  return { day: DAY_INDEX[get('weekday')] ?? 0, minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** 960 → "4:00 pm" */
export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

/**
 * Calcula si el local está abierto ahora. Soporta franjas que cruzan la
 * medianoche (ej. 18:00 a 02:00).
 */
export function getOpenState(ranges: ScheduleRange[], timeZone: string, date: Date = new Date()): OpenState {
  const { day, minutes } = zonedNow(timeZone, date)
  const prevDay = (day + 6) % 7

  for (const r of ranges) {
    const open = toMinutes(r.open)
    const close = toMinutes(r.close)
    const overnight = close <= open
    if (!overnight && r.days.includes(day) && minutes >= open && minutes < close) {
      return { open: true, closesAt: formatClock(close) }
    }
    if (overnight && r.days.includes(day) && minutes >= open) {
      return { open: true, closesAt: formatClock(close) }
    }
    if (overnight && r.days.includes(prevDay) && minutes < close) {
      return { open: true, closesAt: formatClock(close) }
    }
  }

  // Próxima apertura en los próximos 7 días.
  for (let offset = 0; offset <= 7; offset++) {
    const d = (day + offset) % 7
    const opens = ranges
      .filter((r) => r.days.includes(d))
      .map((r) => toMinutes(r.open))
      .filter((open) => offset > 0 || open > minutes)
      .sort((a, b) => a - b)
    if (opens.length) return { open: false, opensAt: formatClock(opens[0]) }
  }
  return { open: false }
}

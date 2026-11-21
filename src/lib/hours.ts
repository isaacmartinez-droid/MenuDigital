import type { ScheduleRange } from '../types/restaurant'
import { restaurant } from './catalog'
import { daysLabel } from './combos'
import { formatClock } from './schedule'
import { fmt, t } from './text'

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** "Todos los días · 4:00 pm a 10:00 pm", una línea por franja del horario. */
export function scheduleLines(ranges: ScheduleRange[] = restaurant.schedule.ranges): string[] {
  return ranges.map((r) =>
    fmt(t.web.hoursRange, {
      days: r.days.length === 7 ? t.web.everyDay : daysLabel(r.days),
      open: formatClock(toMinutes(r.open)),
      close: formatClock(toMinutes(r.close)),
    }),
  )
}

/** Horario del día `day` (0 = domingo): { open: "4:00 pm", close: "10:00 pm" }, o null si no abre. */
export function hoursOn(day: number): { open: string; close: string } | null {
  const range = restaurant.schedule.ranges.find((r) => r.days.includes(day))
  return range ? { open: formatClock(toMinutes(range.open)), close: formatClock(toMinutes(range.close)) } : null
}

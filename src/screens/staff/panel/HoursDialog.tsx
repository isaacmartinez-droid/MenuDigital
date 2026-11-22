import { useId, useState } from 'react'
import { Button } from '../../../components/Button'
import { restaurant } from '../../../lib/catalog'
import { fmt, t } from '../../../lib/text'
import type { ScheduleRange } from '../../../types/restaurant'
import { catalogStore } from '../../../store/catalogEdits'
import { FormDialog } from './form'
import { inputClass } from './formUtils'

/** De lunes a domingo (0 = domingo). */
const WEEK = [1, 2, 3, 4, 5, 6, 0]

interface DayRow {
  open: string
  close: string
  closed: boolean
}

/** Junta los días con el mismo horario en una sola franja. */
function toRanges(rows: Record<number, DayRow>): ScheduleRange[] {
  const ranges: ScheduleRange[] = []
  for (const day of [0, 1, 2, 3, 4, 5, 6]) {
    const row = rows[day]
    if (row.closed) continue
    const same = ranges.find((r) => r.open === row.open && r.close === row.close)
    if (same) same.days.push(day)
    else ranges.push({ days: [day], open: row.open, close: row.close })
  }
  return ranges
}

/**
 * Horarios "Cambiar horario" (sin diseño en el Figma; boceto aprobado): a qué hora abre
 * y cierra cada día, o si está cerrado. Cambia al instante "Abierto / Cerrado" en la
 * mesa y la web. Se puede volver al horario de la config.
 */
export function HoursDialog({ onClose, onSaved }: { onClose: () => void; onSaved: (text: string) => void }) {
  const m = t.staff.panel.hours
  const id = useId()
  const [rows, setRows] = useState<Record<number, DayRow>>(() => {
    const out: Record<number, DayRow> = {}
    for (const day of WEEK) {
      const r = restaurant.schedule.ranges.find((x) => x.days.includes(day))
      out[day] = r ? { open: r.open, close: r.close, closed: false } : { open: '16:00', close: '22:00', closed: true }
    }
    return out
  })
  const [tried, setTried] = useState(false)
  const missing = WEEK.find((d) => !rows[d].closed && (!rows[d].open || !rows[d].close))
  const set = (day: number, patch: Partial<DayRow>) => setRows((r) => ({ ...r, [day]: { ...r[day], ...patch } }))

  const save = () => {
    setTried(true)
    if (missing !== undefined) {
      document.getElementById(`${id}-${missing}-open`)?.focus()
      return false
    }
    catalogStore.getState().setSchedule(toRanges(rows))
    onSaved(m.saved)
    return true
  }

  return (
    <FormDialog
      title={m.editTitle}
      submitLabel={m.save}
      onClose={onClose}
      onSubmit={save}
      extra={
        catalogStore.getState().schedule && (
          <Button
            variant="secondary"
            onClick={() => {
              catalogStore.getState().setSchedule(null)
              onSaved(m.saved)
              onClose()
            }}
          >
            {m.reset}
          </Button>
        )
      }
    >
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left text-small font-medium text-texto-2">
            <th scope="col" className="pb-2 font-medium">
              <span className="sr-only">{m.weekTitle}</span>
            </th>
            <th scope="col" className="pb-2 font-medium">
              {m.open}
            </th>
            <th scope="col" className="pb-2 font-medium">
              {m.close}
            </th>
            <th scope="col" className="pb-2 font-medium">
              {m.closedDay}
            </th>
          </tr>
        </thead>
        <tbody>
          {WEEK.map((day) => {
            const row = rows[day]
            const name = m.days[day]
            const bad = tried && missing === day
            return (
              <tr key={day} className="border-t border-borde">
                <th scope="row" className="py-2 pr-3 text-left text-body font-normal text-texto">
                  {name}
                </th>
                <td className="py-2 pr-2">
                  <input
                    id={`${id}-${day}-open`}
                    type="time"
                    value={row.open}
                    disabled={row.closed}
                    onChange={(e) => set(day, { open: e.target.value })}
                    aria-label={fmt(m.openLabel, { day: name })}
                    aria-invalid={bad}
                    className={`${inputClass(bad)} disabled:opacity-40`}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="time"
                    value={row.close}
                    disabled={row.closed}
                    onChange={(e) => set(day, { close: e.target.value })}
                    aria-label={fmt(m.closeLabel, { day: name })}
                    aria-invalid={bad}
                    className={`${inputClass(bad)} disabled:opacity-40`}
                  />
                </td>
                <td className="py-2">
                  <label className="grid min-h-12 place-items-center">
                    <input
                      type="checkbox"
                      checked={row.closed}
                      onChange={(e) => set(day, { closed: e.target.checked })}
                      aria-label={fmt(m.closedLabel, { day: name })}
                      className="size-[22px] accent-verde"
                    />
                  </label>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {tried && missing !== undefined && (
        <p role="alert" className="text-small text-promo">
          {fmt(m.errorHours, { day: m.days[missing] })}
        </p>
      )}
    </FormDialog>
  )
}

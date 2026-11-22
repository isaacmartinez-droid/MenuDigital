import { Tag } from '../../../components/Tag'
import { Button } from '../../../components/Button'
import { Switch } from '../../../components/staff/Switch'
import { restaurant } from '../../../lib/catalog'
import { cx } from '../../../lib/cx'
import { formatClock, zonedNow } from '../../../lib/schedule'
import { fmt, t } from '../../../lib/text'
import { useOpenState } from '../../../lib/useOpenState'
import { isClosedToday, panelSettingsStore, usePanelSettings } from '../../../store/panelSettings'
import { useState } from 'react'
import { useCatalog } from '../../../store/catalogEdits'
import { HoursDialog } from './HoursDialog'
import { useSavedNote } from './formUtils'
import { PanelCard, PanelNote } from './parts'

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** De lunes a domingo (0 = domingo). */
const WEEK = [1, 2, 3, 4, 5, 6, 0]

/**
 * Panel · Horarios (sin diseño en el Figma; boceto aprobado): el horario de cada
 * día (de la config) y, para hoy, si está abierto y "Cerrar hoy", que hace que la
 * mesa y la web digan "Cerrado" y no dejen pedir hasta mañana.
 */
export function PanelHours() {
  const m = t.staff.panel.hours
  const { ranges, timezone } = restaurant.schedule
  const closedOn = usePanelSettings((s) => s.closedOn)
  const onlyInHours = usePanelSettings((s) => s.onlyInHours)
  const closedToday = isClosedToday(closedOn)
  const state = useOpenState()
  const today = zonedNow(timezone).day
  // Se vuelve a dibujar cuando el dueño cambia el horario.
  useCatalog((s) => s.schedule)
  const [editing, setEditing] = useState(false)
  const [note, showNote] = useSavedNote()

  const status = closedToday
    ? fmt(m.closedToday, { open: state.opensAt ?? '' })
    : state.open
      ? fmt(m.openNow, { close: state.closesAt ?? '' })
      : fmt(m.closedNow, { open: state.opensAt ?? '' })

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-title-lg text-texto">{m.title}</h2>
        <Button variant="secondary" onClick={() => setEditing(true)}>
          {m.edit}
        </Button>
      </div>
      {note}
      <div className="flex flex-col items-start gap-4 lg:flex-row">
        <PanelCard className="w-full flex-1 px-4 pb-2">
          <h3 className="py-3 text-dish text-texto">{m.weekTitle}</h3>
          <ul>
            {WEEK.map((day) => {
              const list = ranges.filter((r) => r.days.includes(day))
              const isToday = day === today
              return (
                <li
                  key={day}
                  aria-current={isToday ? 'date' : undefined}
                  className="flex items-center gap-3 border-t border-borde py-2.5"
                >
                  <span className={cx('w-28 text-body text-texto', isToday && 'font-medium')}>{m.days[day]}</span>
                  <span className="flex-1 text-body text-texto-2">
                    {list.length
                      ? list
                          .map((r) =>
                            fmt(m.range, { open: formatClock(toMinutes(r.open)), close: formatClock(toMinutes(r.close)) }),
                          )
                          .join(' · ')
                      : m.closed}
                  </span>
                  {isToday && <Tag tone="contorno">{m.today}</Tag>}
                </li>
              )
            })}
          </ul>
        </PanelCard>

        <PanelCard className="flex w-full flex-col gap-3 p-4 lg:w-[420px]">
          <h3 className="text-dish text-texto">{m.todayTitle}</h3>
          <p role="status" className={cx('text-body font-medium', state.open ? 'text-verde' : 'text-promo')}>
            {status}
          </p>
          <div className="flex items-center gap-3 border-t border-borde pt-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-dish text-texto">{m.closeToday}</span>
              <span className="text-small text-texto-2">{m.closeTodayBody}</span>
            </div>
            <Switch
              checked={closedToday}
              onChange={(v) => panelSettingsStore.getState().setClosedToday(v)}
              label={m.closeToday}
            />
          </div>
          {!onlyInHours && !closedToday && <p className="text-small text-texto-2">{m.outOfHoursAllowed}</p>}
        </PanelCard>
      </div>
      <PanelNote>{m.footnote}</PanelNote>
      {editing && <HoursDialog onClose={() => setEditing(false)} onSaved={showNote} />}
    </>
  )
}

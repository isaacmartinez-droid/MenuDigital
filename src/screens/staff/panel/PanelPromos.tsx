import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Photo } from '../../../components/Photo'
import { Tag } from '../../../components/Tag'
import { Switch } from '../../../components/staff/Switch'
import { cx } from '../../../lib/cx'
import { shortRange, useActivePromos, usePromos, type PromoView } from '../../../lib/promo'
import { fmt, t } from '../../../lib/text'
import { catalogSnapshot, catalogStore, restoreCatalog, useCatalog, type PromoDef } from '../../../store/catalogEdits'
import { logAction } from '../../../lib/actionLog'
import { panelSettingsStore } from '../../../store/panelSettings'
import { focusPanelAction, useSavedNote } from './formUtils'
import { PanelCard, PanelHeader, PanelNote } from './parts'
import { PromoDialog } from './PromoDialog'

const WEEK = [1, 2, 3, 4, 5, 6, 0]

/** "Todos los días · 4 a 7 pm" o "Martes, Jueves · 4 a 7 pm". */
function scheduleText(p: PromoView): string {
  const m = t.staff.panel.promos
  const days =
    p.days.length === 7 ? m.everyDay : WEEK.filter((d) => p.days.includes(d)).map((d) => t.staff.panel.hours.days[d]).join(', ')
  return fmt(m.schedule, { days, range: shortRange(p.hours.from, p.hours.to) })
}

/**
 * Panel · Promos (sin diseño en el Figma; boceto aprobado): la promo del día y las
 * creadas con "Nueva promo", cada una con sus días y horario, dónde se ve, si se ve
 * ahora y su interruptor. Las creadas se pueden borrar.
 */
export function PanelPromos() {
  const m = t.staff.panel.promos
  const promos = usePromos()
  const activeIds = new Set(useActivePromos().map((p) => p.id))
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<PromoDef | null>(null)
  const created = useCatalog((s) => s.promos)
  const [note, showNote] = useSavedNote()

  const setOn = (p: PromoView, on: boolean) =>
    p.builtIn ? panelSettingsStore.getState().setPromoOn(on) : catalogStore.getState().setPromoOn(p.id, on)

  return (
    <>
      <PanelHeader title={m.title} action={m.add} onAction={() => setCreating(true)} />
      {note}
      <ul className="flex flex-col gap-3">
        {promos.map((p) => {
          const live = activeIds.has(p.id)
          return (
            <li key={p.id}>
              <PanelCard className="flex flex-wrap items-center gap-4 p-4">
                <Photo src={p.image || undefined} className="size-20 shrink-0 rounded-chico" dimmed={!p.on} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-dish text-texto">{p.title}</h3>
                    <Tag tone="promo">{p.label}</Tag>
                  </div>
                  <p className="text-body text-texto-2">
                    {p.where === 'web' ? m.webOnly : m.webAndTable} · {scheduleText(p)}
                  </p>
                  <p className={cx('text-small font-medium', live ? 'text-verde' : 'text-texto-2')}>
                    {!p.on
                      ? m.off
                      : live
                        ? m.activeNow
                        : m.outOfHours}
                  </p>
                </div>
                {!p.builtIn && (
                  <button
                    type="button"
                    onClick={() => setEditing(created.find((x) => x.id === p.id) ?? null)}
                    aria-label={fmt(m.editLabel, { name: p.title })}
                    className="grid size-12 place-items-center rounded-completo text-texto-2 hover:bg-fondo hover:text-texto"
                  >
                    <Pencil aria-hidden size={20} />
                  </button>
                )}
                {!p.builtIn && (
                  <button
                    type="button"
                    onClick={() => {
                      const before = catalogSnapshot()
                      catalogStore.getState().removePromo(p.id)
                      logAction('promoDeleted', { name: p.title })
                      showNote(m.removed, () => restoreCatalog(before))
                      focusPanelAction()
                    }}
                    aria-label={fmt(m.removeLabel, { name: p.title })}
                    className="grid size-12 place-items-center rounded-completo text-texto-2 hover:bg-fondo hover:text-texto"
                  >
                    <Trash2 aria-hidden size={20} />
                  </button>
                )}
                <Switch
                  checked={p.on}
                  onChange={(v) => setOn(p, v)}
                  label={fmt(m.switchLabel, { name: p.title })}
                />
              </PanelCard>
            </li>
          )
        })}
      </ul>
      <PanelNote>{m.footnote}</PanelNote>
      {creating && <PromoDialog onClose={() => setCreating(false)} onSaved={showNote} />}
      {editing && <PromoDialog promo={editing} onClose={() => setEditing(null)} onSaved={showNote} />}
    </>
  )
}

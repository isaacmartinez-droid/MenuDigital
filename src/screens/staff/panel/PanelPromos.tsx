import { Photo } from '../../../components/Photo'
import { Tag } from '../../../components/Tag'
import { Switch } from '../../../components/staff/Switch'
import { menu } from '../../../lib/catalog'
import { cx } from '../../../lib/cx'
import { usePromoInHours } from '../../../lib/promo'
import { formatClock } from '../../../lib/schedule'
import { fmt, t } from '../../../lib/text'
import { panelSettingsStore, usePanelSettings } from '../../../store/panelSettings'
import { PanelCard, PanelHeader, PanelNote } from './parts'

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

/**
 * Panel · Promos (sin diseño en el Figma; boceto aprobado): la promo del día con su
 * horario, si se ve ahora y el interruptor para apagarla. Apagada, desaparece al
 * instante del inicio y del menú de la web. "Nueva promo" viene después.
 */
export function PanelPromos() {
  const m = t.staff.panel.promos
  const promo = menu.promo
  const on = usePanelSettings((s) => s.promoOn)
  const inHours = usePromoInHours()

  return (
    <>
      <PanelHeader title={m.title} action={m.add} />
      {promo && (
        <PanelCard className="flex flex-wrap items-center gap-4 p-4">
          <Photo src={promo.image} className="size-20 shrink-0 rounded-chico" dimmed={!on} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-dish text-texto">{promo.title}</h3>
              <Tag tone="promo">{promo.label}</Tag>
            </div>
            <p className="text-body text-texto-2">
              {m.webOnly} · {promo.subtitle}
            </p>
            <p className={cx('text-small font-medium', on && inHours ? 'text-verde' : 'text-texto-2')}>
              {!on
                ? m.off
                : inHours
                  ? m.activeNow
                  : fmt(m.outOfHours, {
                      from: formatClock(toMinutes(promo.hours.from)),
                      to: formatClock(toMinutes(promo.hours.to)),
                    })}
            </p>
          </div>
          <Switch
            checked={on}
            onChange={(v) => panelSettingsStore.getState().setPromoOn(v)}
            label={fmt(m.switchLabel, { name: promo.title })}
            stateText={on ? m.stateOn : m.stateOff}
          />
        </PanelCard>
      )}
      <PanelNote>{m.footnote}</PanelNote>
    </>
  )
}

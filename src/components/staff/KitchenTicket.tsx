import { useId } from 'react'
import type { BoardComanda } from '../../lib/staff'
import type { ComandaItem } from '../../types/order'
import { Button } from '../Button'
import { ChannelChip } from './ChannelChip'
import { cx } from '../../lib/cx'
import { fmt, t } from '../../lib/text'
import { placeLabel } from '../../lib/staffText'

export type KitchenColumn = 'nuevo' | 'cocinando' | 'listo'

interface KitchenTicketProps {
  entry: BoardComanda
  column: KitchenColumn
  /** "hace 14 min · tarde", "recién · otra comanda de la Mesa 5". */
  timeText: string
  late: boolean
  onAction: () => void
}

/** Acompañante, extras y cambios pedidos por cocina de un plato: "con gallo pinto · Queso frito extra". */
function itemExtras(item: ComandaItem, entry: BoardComanda): string {
  const subs = entry.comanda.substitutions
    .filter((s) => s.dishId === item.dishId)
    .map((s) =>
      s.removes
        ? fmt(t.soldOut.lineNone, { component: s.componentName })
        : fmt(t.soldOut.line, { substitute: s.substituteName, component: s.componentName }),
    )
  return [
    item.sideName ? fmt(t.tracking.withSide, { side: item.sideName.toLowerCase() }) : '',
    ...item.extras.map((e) => e.name),
    ...subs,
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Comanda de la cocina (P1): número a mano, canal y lugar, hace cuánto, los
 * platos y las notas resaltadas. Borde verde si es nueva y rojo si va tarde.
 */
export function KitchenTicket({ entry, column, timeText, late, onAction }: KitchenTicketProps) {
  const { comanda, channel } = entry
  const titleId = useId()
  const notes = [
    ...comanda.items.filter((i) => i.note).map((i) => fmt(t.staff.kitchen.itemNote, { dish: i.name, note: i.note ?? '' })),
    ...(comanda.note ? [fmt(t.staff.kitchen.note, { note: comanda.note })] : []),
  ]
  const k = t.staff.kitchen

  return (
    <article
      aria-labelledby={titleId}
      className={cx(
        'flex flex-col gap-3 rounded-grande bg-tarjeta p-4',
        late ? 'border-2 border-promo' : column === 'nuevo' ? 'border-2 border-verde' : 'border border-borde',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 id={titleId} className="font-mano text-comanda font-bold text-texto">
          {comanda.id}
        </h3>
        <div className="flex min-w-0 flex-col items-end gap-1">
          <ChannelChip channel={channel} label={placeLabel(entry)} />
          <p className={cx('text-right text-small font-medium', late ? 'text-promo' : 'text-texto-2')}>{timeText}</p>
        </div>
      </div>
      <hr className="border-borde" />
      <ul className="flex flex-col gap-2">
        {comanda.items.map((item, i) => {
          const extras = itemExtras(item, entry)
          return (
            <li key={`${item.dishId}-${i}`} className="flex gap-2">
              <span className="text-price text-texto">{item.quantity}×</span>
              <span className="min-w-0 flex-1">
                <span className="block text-body text-texto">{item.name}</span>
                {extras && <span className="block text-small text-texto-2">{extras}</span>}
              </span>
            </li>
          )
        })}
      </ul>
      {notes.map((n) => (
        <p key={n} className="rounded-tarjeta bg-ambar-suave px-3 py-2 text-dish text-texto-sobre-ambar">
          {n}
        </p>
      ))}
      {column === 'listo' ? (
        <>
          <p className="text-small font-medium text-verde">{k.notified[channel]}</p>
          <Button variant="secondary" block onClick={onAction}>
            {k.delivered}
          </Button>
        </>
      ) : (
        <Button block onClick={onAction}>
          {column === 'nuevo' ? k.start : k.ready}
        </Button>
      )}
    </article>
  )
}

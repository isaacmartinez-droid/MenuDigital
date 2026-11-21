import type { ReactNode } from 'react'
import type { Comanda as ComandaModel, ComandaItem } from '../types/order'
import { formatMoney } from '../lib/money'
import { fmt, t } from '../lib/text'

interface ComandaProps {
  comanda: ComandaModel
  /** "Tu orden · Ana" */
  heading: string
  /** Algo a la derecha del número (ej. una pastilla). Opcional. */
  aside?: ReactNode
  /** Texto del pie junto al total. Por defecto "Total de esta orden". */
  footnote?: string
}

/** "con gallo pinto · Queso extra · sin repollo" */
function itemDetails(item: ComandaItem): string {
  return [
    item.sideName ? fmt(t.tracking.withSide, { side: item.sideName.toLowerCase() }) : '',
    ...item.extras.map((e) => e.name),
    item.note ?? '',
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Tarjeta de la comanda con el número "escrito a mano" en Caveat. Cada plato
 * muestra su precio y el detalle (acompañante, extras y nota) para que el
 * cliente pueda verificar lo que pidió.
 */
export function Comanda({ comanda, heading, aside, footnote }: ComandaProps) {
  return (
    <section className="rounded-grande border border-borde bg-tarjeta px-4 pt-4 pb-4" aria-label={comanda.id}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-small text-texto-2">{heading}</p>
          <p className="font-mano text-comanda leading-8 font-bold text-verde">{comanda.id}</p>
        </div>
        {aside}
      </div>
      <hr className="mt-3 border-borde" />
      <ul className="mt-2 space-y-2">
        {comanda.items.map((item, i) => {
          const subs = comanda.substitutions.filter((s) => s.dishId === item.dishId)
          const details = itemDetails(item)
          return (
            <li key={`${item.dishId}-${i}`} className="flex gap-2 text-body text-texto">
              <span className="w-6 shrink-0 font-semibold">{item.quantity}×</span>
              <span className="min-w-0 flex-1">
                {item.name}
                {details && <span className="block text-small text-texto-2">{details}</span>}
                {subs.map((s) => (
                  <span key={s.at} className="block text-small text-texto-2">
                    {s.removes
                      ? fmt(t.soldOut.lineNone, { component: s.componentName })
                      : fmt(t.soldOut.line, { substitute: s.substituteName, component: s.componentName })}
                  </span>
                ))}
              </span>
              <span className="shrink-0">{formatMoney(item.lineTotal)}</span>
            </li>
          )
        })}
      </ul>
      {comanda.note && (
        <p className="mt-2 rounded-chico bg-fondo px-2.5 py-1.5 text-small text-texto-2">
          {fmt(t.order.noteLine, { note: comanda.note })}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-borde pt-3">
        <p className="text-small text-texto-2">{footnote ?? t.tracking.orderTotal}</p>
        <p className="shrink-0 text-price text-texto">{formatMoney(comanda.total)}</p>
      </div>
    </section>
  )
}

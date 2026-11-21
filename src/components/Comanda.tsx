import type { Comanda as ComandaModel } from '../types/order'
import { formatMoney } from '../lib/money'
import { fmt, t } from '../lib/text'

interface ComandaProps {
  comanda: ComandaModel
  /** "Tu orden · Ana" */
  heading: string
  /** "Mesa 5 · te la llevamos" */
  pill: string
  /** "Se suma a la cuenta de la Mesa 5" */
  footnote: string
}

/** Tarjeta de la comanda con el número "escrito a mano" en Caveat. */
export function Comanda({ comanda, heading, pill, footnote }: ComandaProps) {
  return (
    <section className="rounded-grande border border-borde bg-tarjeta px-4 pt-4 pb-4" aria-label={comanda.id}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-small text-texto-2">{heading}</p>
          <p className="font-mano text-comanda leading-8 font-bold text-verde">{comanda.id}</p>
        </div>
        <span className="mt-[11px] inline-flex h-8 shrink-0 items-center rounded-completo bg-verde-suave px-3 text-small text-verde">
          {pill}
        </span>
      </div>
      <hr className="mt-3 border-borde" />
      <ul className="mt-2 space-y-2">
        {comanda.items.map((item, i) => {
          const subs = comanda.substitutions.filter((s) => s.dishId === item.dishId)
          return (
            <li key={`${item.dishId}-${i}`} className="flex gap-2 text-body text-texto">
              <span className="w-5 shrink-0 font-semibold">{item.quantity}×</span>
              <span className="min-w-0">
                {item.name}
                {item.note ? ` · ${item.note}` : ''}
                {subs.map((s) => (
                  <span key={s.at} className="block text-small text-texto-2">
                    {s.removes
                      ? fmt(t.soldOut.lineNone, { component: s.componentName })
                      : fmt(t.soldOut.line, { substitute: s.substituteName, component: s.componentName })}
                  </span>
                ))}
              </span>
            </li>
          )
        })}
      </ul>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <p className="text-small text-texto-2">{footnote}</p>
        <p className="shrink-0 text-price text-texto">{formatMoney(comanda.total)}</p>
      </div>
    </section>
  )
}

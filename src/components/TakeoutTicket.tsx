import type { Comanda } from '../types/order'
import { itemDetails } from '../lib/comandaStatus'
import { formatMoney } from '../lib/money'
import { fmt, t } from '../lib/text'

/**
 * "Tu orden" para llevar (W8): "Mostrá este número al recoger" con el número
 * escrito a mano, lo pedido y el total que se paga al recoger.
 */
export function TakeoutTicket({ comanda }: { comanda: Comanda }) {
  return (
    <section aria-label={comanda.id} className="flex flex-col gap-2 rounded-grande border border-borde bg-tarjeta p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-small text-texto-2">{t.web.showNumber}</p>
          <p className="font-mano text-comanda leading-8 font-bold text-verde">{comanda.id}</p>
        </div>
        <span className="inline-flex h-[31px] shrink-0 items-center rounded-completo bg-verde-suave px-3 text-small font-medium text-verde">
          {t.web.place}
        </span>
      </div>
      <hr className="border-borde" />
      <ul className="flex flex-col gap-2">
        {comanda.items.map((item, i) => {
          const details = itemDetails(item)
          return (
            <li key={i} className="flex gap-2 text-body text-texto">
              <span className="w-6 shrink-0 text-dish">{item.quantity}×</span>
              <span className="min-w-0 flex-1">
                {item.name}
                {details && <span className="text-texto-2"> · {details}</span>}
              </span>
            </li>
          )
        })}
      </ul>
      {comanda.note && <p className="text-small text-texto-2">{fmt(t.order.noteLine, { note: comanda.note })}</p>}
      <p className="flex items-center justify-between gap-3">
        <span className="text-small text-texto-2">{fmt(t.web.payLine, { name: comanda.customerName })}</span>
        <span className="text-price text-texto">{formatMoney(comanda.total)}</span>
      </p>
    </section>
  )
}

import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { Button } from '../../components/Button'
import { NoticeBanner } from '../../components/NoticeBanner'
import { PrintSheet } from '../../components/staff/PrintSheet'
import { StaffBar } from '../../components/staff/StaffBar'
import { restaurant } from '../../lib/catalog'
import { cx } from '../../lib/cx'
import { formatMoney } from '../../lib/money'
import { closeDay, ledgerSinceLastClose, useBoard } from '../../lib/staff'
import { fmt, t } from '../../lib/text'
import type { Channel } from '../../types/order'
import { inputClass } from './panel/formUtils'

const d = t.staff.cashier.dayCloseScreen

/** Números del Figma para cuando todavía no hay cobros (P2d dice "ejemplo"). */
const EXAMPLE = {
  sold: 8450,
  orders: 37,
  cash: 5200,
  cashCount: 23,
  card: 3250,
  cardCount: 14,
  byChannel: [
    { channel: 'mesa' as Channel, count: 24, amount: 5480 },
    { channel: 'llevar' as Channel, count: 9, amount: 2050 },
    { channel: 'mostrador' as Channel, count: 4, amount: 920 },
  ],
}

const orders = (n: number) => (n === 1 ? d.orderOne : fmt(d.orders, { n }))
const payments = (n: number) => (n === 1 ? d.paymentOne : fmt(d.payments, { n }))

const barColor: Record<string, string> = { mesa: 'bg-verde', llevar: 'bg-azul-logo', mostrador: 'bg-texto-2' }

function Kpi({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-grande border border-borde bg-tarjeta p-4">
      <p className="text-small font-medium text-texto-2">{label}</p>
      <p className="text-title-lg text-texto">{value}</p>
      <p className="text-small font-medium text-texto-2">{detail}</p>
    </div>
  )
}

/**
 * P2d Caja · Corte del día: vendido, efectivo, tarjeta y cancelados; ventas por
 * canal; el efectivo que debería haber en caja (fondo + ventas en efectivo), lo
 * contado y la diferencia. "Imprimir corte" y "Cerrar el día". Usa los cobros de
 * caja desde el último corte; si todavía no hay, muestra los números del Figma.
 */
export function DayClose() {
  const id = useId()
  const tables = useBoard()
  const [counted, setCounted] = useState('')
  const [printing, setPrinting] = useState(false)
  const [closed, setClosed] = useState<{ total: number } | null>(null)
  const float = restaurant.ordering.cashFloat

  useEffect(() => {
    document.title = `${t.staff.cashier.dayClose} · ${restaurant.name}`
  }, [])

  // Se recalcula con cada cambio del tablero (un cobro en otra pestaña).
  const data = useMemo(() => {
    void tables
    const ledger = ledgerSinceLastClose()
    if (!ledger.length) return { example: true, ...EXAMPLE }
    const sum = (list: typeof ledger) => list.reduce((s, e) => s + e.total, 0)
    const cash = ledger.filter((e) => e.method === 'efectivo')
    const card = ledger.filter((e) => e.method === 'tarjeta')
    const channels: Channel[] = ['mesa', 'llevar', 'mostrador']
    return {
      example: false,
      sold: sum(ledger),
      orders: ledger.reduce((s, e) => s + e.comandas, 0),
      cash: sum(cash),
      cashCount: cash.length,
      card: sum(card),
      cardCount: card.length,
      byChannel: channels.map((channel) => {
        const list = ledger.filter((e) => e.byChannel[channel])
        return { channel, count: list.length, amount: list.reduce((s, e) => s + (e.byChannel[channel] ?? 0), 0) }
      }),
    }
  }, [tables])

  const expected = float + data.cash
  const countedAmount = counted ? Number(counted) : null
  const diff = countedAmount === null ? null : countedAmount - expected
  const max = Math.max(1, ...data.byChannel.map((c) => c.count))
  const now = new Date()
  const dayName = new Intl.DateTimeFormat('es', { weekday: 'long', timeZone: restaurant.schedule.timezone }).format(now)
  const title = data.example ? d.titleExample : fmt(d.title, { day: dayName })

  return (
    <>
      <StaffBar area="caja" user={restaurant.staff.cashier} />
      <main className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <Link
            to="/caja"
            aria-label={d.back}
            className="grid size-10 shrink-0 place-items-center rounded-completo border border-borde bg-tarjeta text-texto"
          >
            <ChevronLeft size={22} aria-hidden />
          </Link>
          <h2 className="text-title-lg text-texto">{title}</h2>
        </div>
        <p className="text-small text-texto-2">{data.example ? d.exampleNote : d.realNote}</p>
        {closed && (
          <NoticeBanner
            tone="positivo"
            role="status"
            title={fmt(d.closedTitle, { total: formatMoney(closed.total) })}
            body={d.closedBody}
          />
        )}

        <div className="flex flex-col gap-4 md:flex-row">
          <Kpi label={d.sold} value={formatMoney(data.sold)} detail={orders(data.orders)} />
          <Kpi label={d.cash} value={formatMoney(data.cash)} detail={payments(data.cashCount)} />
          <Kpi label={d.card} value={formatMoney(data.card)} detail={payments(data.cardCount)} />
          <Kpi label={d.cancelled} value={data.example ? '1' : '0'} detail={d.cancelledSub} />
        </div>

        <div className="flex flex-1 flex-col gap-4 md:flex-row">
          <section className="flex min-w-0 flex-1 flex-col gap-3 rounded-grande border border-borde bg-tarjeta p-4">
            <h3 className="text-dish text-texto">{d.byChannel}</h3>
            <ul className="flex flex-col gap-3">
              {data.byChannel.map((c) => (
                <li key={c.channel} className="flex flex-col gap-1">
                  <div className="flex justify-between gap-3">
                    <span className="text-body text-texto">{d.channels[c.channel as keyof typeof d.channels]}</span>
                    <span className="text-dish text-texto">
                      {c.count} · {formatMoney(c.amount)}
                    </span>
                  </div>
                  <div aria-hidden className="h-2 overflow-hidden rounded-completo bg-fondo">
                    <div
                      className={cx('h-full rounded-completo', barColor[c.channel])}
                      style={{ width: `${c.count ? Math.max(2, (c.count / max) * 100) : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex min-w-0 flex-1 flex-col gap-3 rounded-grande border border-borde bg-tarjeta p-4">
            <h3 className="text-dish text-texto">{d.drawer}</h3>
            {[
              [d.float, float],
              [d.cashSales, data.cash],
              [d.expected, expected],
            ].map(([label, amount]) => (
              <div key={label} className="flex justify-between gap-3">
                <span className="text-body text-texto-2">{label}</span>
                <span className="text-dish text-texto">{formatMoney(Number(amount))}</span>
              </div>
            ))}
            <div className="flex flex-col gap-2">
              <label htmlFor={`${id}-contado`} className="text-dish text-texto">
                {d.counted}
              </label>
              <input
                id={`${id}-contado`}
                value={counted}
                onChange={(e) => setCounted(e.target.value.replace(/\D/g, '').slice(0, 7))}
                inputMode="numeric"
                autoComplete="off"
                placeholder={formatMoney(expected)}
                className={inputClass()}
              />
            </div>
            {diff !== null && (
              <div aria-live="polite">
                <NoticeBanner
                  tone={diff === 0 ? 'positivo' : 'aviso'}
                  title={
                    diff === 0
                      ? d.even
                      : diff < 0
                        ? fmt(d.short, { amount: formatMoney(-diff) })
                        : fmt(d.over, { amount: formatMoney(diff) })
                  }
                  body={d.diffBody}
                />
              </div>
            )}
          </section>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setPrinting(true)}>
            {d.print}
          </Button>
          <Button
            className="flex-1"
            disabled={Boolean(closed) || data.example}
            title={data.example ? d.exampleNote : undefined}
            onClick={() => setClosed(closeDay(data.sold, countedAmount))}
          >
            {d.close}
          </Button>
        </div>
      </main>

      {printing && (
        <PrintSheet
          title={t.staff.cashier.printSheet.dayClose}
          lines={[title, now.toLocaleString(restaurant.currency.locale)]}
          rows={[
            { label: d.sold, amount: data.sold },
            { label: d.cash, amount: data.cash },
            { label: d.card, amount: data.card },
            ...data.byChannel.map((c) => ({ label: d.channels[c.channel as keyof typeof d.channels], amount: c.amount })),
          ]}
          totals={[
            { label: d.float, amount: float },
            { label: d.expected, amount: expected, strong: true },
            ...(countedAmount !== null ? [{ label: d.counted, amount: countedAmount, strong: true }] : []),
          ]}
          footer={fmt(t.staff.cashier.printSheet.printedBy, { name: restaurant.staff.cashier })}
          onDone={() => setPrinting(false)}
        />
      )}
    </>
  )
}

import { useMemo } from 'react'
import { Link } from 'react-router'
import { NoticeBanner } from '../../components/NoticeBanner'
import { formatMoney } from '../../lib/money'
import { ledgerSinceLastClose, useBoard } from '../../lib/staff'
import type { Channel } from '../../types/order'
import { restaurant } from '../../lib/catalog'
import { cx } from '../../lib/cx'
import { fmt, t } from '../../lib/text'
import type { PanelBar } from '../../types/restaurant'

/** Color de cada barra (token del diseño → clase). */
const barColor: Record<string, string> = {
  verde: 'bg-verde',
  'azul-logo': 'bg-azul-logo',
  'texto-2': 'bg-texto-2',
  borde: 'bg-borde',
  promo: 'bg-promo',
  ambar: 'bg-ambar',
}

function Kpi({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-grande border border-borde bg-tarjeta p-4">
      <p className="text-small font-medium text-texto-2">{label}</p>
      <p className="text-title-lg text-texto">{value}</p>
      {detail && <p className="text-small font-medium text-texto-2">{detail}</p>}
    </div>
  )
}

/** Tarjeta con barras horizontales: cada fila con su nombre, el valor y la barra. */
function Bars({ title, unit = '', bars }: { title: string; unit?: string; bars: PanelBar[] }) {
  const max = Math.max(1, ...bars.map((b) => b.value))
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-3 rounded-grande border border-borde bg-tarjeta p-4">
      <h3 className="text-dish text-texto">{title}</h3>
      <ul className="flex flex-col gap-3">
        {bars.map((b) => (
          <li key={b.label} className="flex flex-col gap-1">
            <div className="flex justify-between gap-3">
              <span className="text-body text-texto">{b.label}</span>
              <span className="shrink-0 text-dish text-texto">
                {b.value}
                {unit}
                {b.extra ? ` · ${b.extra}` : ''}
              </span>
            </div>
            <div aria-hidden className="h-2 overflow-hidden rounded-completo bg-fondo">
              <div
                className={cx('h-full rounded-completo', barColor[b.color] ?? 'bg-verde')}
                style={{ width: `${b.value ? Math.max(2, (b.value / max) * 100) : 0}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Canal de cada barra de "Pedidos por canal" (en el orden de demo.panel). */
const CHANNEL_ROWS: (Channel | null)[] = ['mesa', 'llevar', 'mostrador', null]

/**
 * P4 Panel del dueño · Resumen: vendido, pedidos, tiempo en cocina y respuesta del
 * mesero; pedidos por canal (local contra en línea), de dónde llegan a la web,
 * formas de pago, horas pico y más vendidos, y la queja del día (con link a Reseñas).
 * Si hay cobros de caja hoy (el mismo registro del corte del día), Vendido, Pedidos,
 * canales y formas de pago salen de ahí; lo demás, y todo si no hay cobros, es de
 * ejemplo (demo.panel). La barra y las secciones van en PanelLayout.
 */
export function OwnerPanel() {
  const demo = restaurant.demo.panel
  const p = t.staff.panel
  // Se recalcula con cada cobro (en esta pestaña u otra).
  const tables = useBoard()
  const { kpis, rows, real } = useMemo(() => {
    void tables
    const ledger = ledgerSinceLastClose()
    if (!ledger.length) return { kpis: demo.kpis, rows: demo.rows, real: false }
    const sold = ledger.reduce((s, e) => s + e.total, 0)
    const orders = ledger.reduce((s, e) => s + e.comandas, 0)
    const cash = ledger.filter((e) => e.method === 'efectivo').reduce((s, e) => s + e.total, 0)
    const cashPct = sold ? Math.round((cash / sold) * 100) : 0
    const realKpis = demo.kpis.map((k, i) =>
      i === 0
        ? { ...k, value: formatMoney(sold), detail: ledger.length === 1 ? p.soldRealOne : fmt(p.soldReal, { n: ledger.length }) }
        : i === 1
          ? { ...k, value: String(orders), detail: fmt(p.ticketReal, { amount: formatMoney(orders ? Math.round(sold / orders) : 0) }) }
          : k,
    )
    const realRows = demo.rows.map((row, r) =>
      row.map((card, c) => {
        if (r === 0 && c === 0) {
          return {
            ...card,
            bars: card.bars.map((bar, i) => {
              const ch = CHANNEL_ROWS[i]
              const list = ch ? ledger.filter((e) => e.byChannel[ch]) : []
              const amount = ch ? list.reduce((s, e) => s + (e.byChannel[ch] ?? 0), 0) : 0
              return { ...bar, value: list.length, extra: amount ? formatMoney(amount) : undefined }
            }),
          }
        }
        if (r === 1 && c === 0) {
          return { ...card, bars: card.bars.map((bar, i) => ({ ...bar, value: i === 0 ? cashPct : 100 - cashPct })) }
        }
        return card
      }),
    )
    return { kpis: realKpis, rows: realRows, real: true }
  }, [tables, demo, p])
  const { complaint } = demo

  return (
    <>
      <h2 className="sr-only">{p.sections[0]}</h2>
      <div className="flex flex-col gap-4 md:flex-row">
        {kpis.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </div>
      {rows.map((row, i) => (
        <div key={i} className="flex flex-col gap-4 md:flex-row">
          {row.map((card) => (
            <Bars key={card.title} {...card} />
          ))}
        </div>
      ))}
      <NoticeBanner tone="aviso" title={complaint.title} body={complaint.body} />
      <Link to="/panel/resenas" className="-mt-2 inline-flex min-h-11 items-center self-start text-dish text-verde">
        {p.seeReviews} →
      </Link>
      <p className="text-small text-texto-2">{real ? p.footnoteReal : p.footnote}</p>
    </>
  )
}

import { NoticeBanner } from '../../components/NoticeBanner'
import { restaurant } from '../../lib/catalog'
import { cx } from '../../lib/cx'
import { t } from '../../lib/text'
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

/**
 * P4 Panel del dueño · Resumen: vendido, pedidos, tiempo en cocina y respuesta del
 * mesero; pedidos por canal (local contra en línea), de dónde llegan a la web,
 * formas de pago, horas pico y más vendidos, y la queja del día. Todos los números
 * son de ejemplo (demo.panel en restaurant.json). La barra y las secciones van en
 * PanelLayout.
 */
export function OwnerPanel() {
  const { kpis, rows, complaint } = restaurant.demo.panel
  const p = t.staff.panel

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
      <p className="text-small text-texto-2">{p.footnote}</p>
    </>
  )
}

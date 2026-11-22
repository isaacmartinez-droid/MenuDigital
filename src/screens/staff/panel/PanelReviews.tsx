import { useMemo, useSyncExternalStore } from 'react'
import { ExternalLink } from 'lucide-react'
import { StarRating } from '../../../components/StarRating'
import { Tag } from '../../../components/Tag'
import { menu, restaurant } from '../../../lib/catalog'
import { cx } from '../../../lib/cx'
import { loadReviews } from '../../../lib/reviews'
import { readItem } from '../../../lib/storage'
import { fmt, t } from '../../../lib/text'
import { localDateKey } from '../../../store/panelSettings'
import { PanelCard } from './parts'

interface Row {
  id: string
  dish: string
  author: string
  rating: number
  text: string
  date: string
  /** Cuándo, si no es una fecha ("hoy · 7:40 pm"). */
  when?: string
}

const REVIEWS_KEY = `${restaurant.id}:resenas`

/** Una reseña de 1 o 2 estrellas es una queja. */
const isComplaint = (rating: number) => rating <= 2

const dayFormat = new Intl.DateTimeFormat(restaurant.currency.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })
const formatDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? iso : dayFormat.format(d)
}

function Stat({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: 'queja' }) {
  return (
    <PanelCard className="flex min-w-0 flex-1 flex-col gap-1 p-4">
      <p className="text-small font-medium text-texto-2">{label}</p>
      <p className={cx('text-title-lg', tone ? 'text-promo' : 'text-texto')}>{value}</p>
      <p className="text-small font-medium text-texto-2">{detail}</p>
    </PanelCard>
  )
}

/**
 * Panel · Reseñas (sin diseño en el Figma; boceto aprobado): la nota de Google, la
 * de la app (las de menu.json más las que dejan los clientes al pagar en este
 * navegador) y las quejas; en la lista, las de 1 y 2 estrellas van primero.
 */
export function PanelReviews() {
  const m = t.staff.panel.reviews
  const google = restaurant.web.google
  // Las reseñas que dejan los clientes al pagar llegan desde otra pestaña: se escucha su clave.
  const reviewsRaw = useSyncExternalStore(
    (onChange) => {
      const onStorage = (e: StorageEvent) => {
        if (e.key === REVIEWS_KEY || e.key === null) onChange()
      }
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    },
    () => readItem('local', REVIEWS_KEY),
  )

  const { rows, average, count, complaints } = useMemo(() => {
    void reviewsRaw
    const nameOf = new Map(menu.dishes.map((d) => [d.id, d.name]))
    // La queja de ejemplo del día (la misma del Resumen) cuenta como una calificación más.
    const sample = restaurant.demo.panel.sampleComplaint
    const mine = [
      ...loadReviews(),
      { id: 'queja-ejemplo', dishId: sample.dishId, author: sample.author, rating: sample.rating, text: '', date: localDateKey() },
    ]
    const all: Row[] = [
      ...mine.map((r) => ({
        ...r,
        dish: nameOf.get(r.dishId) ?? '',
        when: r.id === 'queja-ejemplo' ? fmt(m.todayAt, { time: sample.time }) : undefined,
      })),
      ...menu.dishes.flatMap((d) => (d.reviews ?? []).map((r) => ({ ...r, dish: d.name }))),
    ]
    // Promedio: el de cada plato en menu.json (con su cantidad) más las nuevas.
    let sum = mine.reduce((s, r) => s + r.rating, 0)
    let n = mine.length
    for (const d of menu.dishes) {
      if (d.rating) {
        sum += d.rating.average * d.rating.count
        n += d.rating.count
      }
    }
    all.sort((a, b) => Number(isComplaint(b.rating)) - Number(isComplaint(a.rating)) || b.date.localeCompare(a.date))
    return { rows: all, average: n ? sum / n : 0, count: n, complaints: all.filter((r) => isComplaint(r.rating)).length }
  }, [m.todayAt, reviewsRaw])

  return (
    <>
      <h2 className="text-title-lg text-texto">{m.title}</h2>
      <div className="flex flex-col gap-4 md:flex-row">
        <Stat label={m.google} value={`★ ${google.rating.toFixed(1)}`} detail={fmt(m.googleCount, { count: google.count })} />
        <Stat label={m.app} value={count ? `★ ${average.toFixed(1)}` : '—'} detail={fmt(m.appCount, { count })} />
        <Stat label={m.complaints} value={String(complaints)} detail={m.complaintsDetail} tone={complaints ? 'queja' : undefined} />
      </div>

      <PanelCard className="px-4">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <h3 className="text-dish text-texto">{m.listTitle}</h3>
          <a
            href={google.url}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 items-center gap-1.5 text-dish text-verde"
          >
            {m.openGoogle}
            <ExternalLink aria-hidden size={16} />
          </a>
        </div>
        {rows.length ? (
          <ul>
            {rows.map((r) => {
              const bad = isComplaint(r.rating)
              return (
                <li key={r.id} className="flex flex-col gap-1 border-t border-borde py-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StarRating value={r.rating} size={16} label={r.dish} />
                    <span className="text-dish text-texto">{r.dish}</span>
                    {bad && <Tag tone="promo">{m.complaintTag}</Tag>}
                    <span className="text-small text-texto-2">
                      {r.author} · {r.when ?? formatDay(r.date)}
                    </span>
                  </div>
                  <p className={cx('text-body', bad ? 'text-texto' : 'text-texto-2')}>{r.text || m.quickRating}</p>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="border-t border-borde py-4 text-body text-texto-2">{m.empty}</p>
        )}
      </PanelCard>
      <p className="text-small text-texto-2">{m.footnote}</p>
    </>
  )
}

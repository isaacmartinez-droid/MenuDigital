import type { Comanda } from '../types/order'
import { isTakeout } from '../lib/channel'
import { etaFor, sentAtClock } from '../lib/comandaStatus'
import { cx } from '../lib/cx'
import { fmt, t } from '../lib/text'
import { TrackingTimeline } from './TrackingTimeline'

interface StatusCardProps {
  comanda: Comanda
  /** Id de la cuenta: número de mesa o "llevar" (cambian textos y pasos). */
  mesa: string
  /** Hora actual (para que los minutos que faltan bajen solos). */
  now: number
  /** Nivel del título: h1 en el seguimiento, h2 cuando la pantalla ya tiene su título (T5). */
  headingLevel?: 'h1' | 'h2'
}

/**
 * Tarjeta de estado de una orden: hora estimada en rango mientras se prepara,
 * título y texto del paso, y la línea de tiempo. La usan el seguimiento (mesa
 * y web) y la confirmación de la web en tablet (T5).
 */
export function StatusCard({ comanda, mesa, now, headingLevel = 'h1' }: StatusCardProps) {
  const takeout = isTakeout(mesa)
  const status = comanda.status
  const sentAt = fmt(t.tracking.sentAt, { time: sentAtClock(comanda) })
  // Mientras se prepara: hora estimada en rango, como las apps de delivery.
  const inProgress = status === 'recibida' || status === 'en-el-comal'
  const eta = etaFor(comanda, now)
  const headline = {
    recibida: {
      title: t.tracking.processingTitle,
      body: `${takeout ? t.web.processingBody : t.tracking.processingBody} · ${sentAt}`,
    },
    'en-el-comal': {
      title: t.tracking.cookingTitle,
      body: `${fmt(t.tracking.etaIn, { from: eta.minFrom, to: eta.minTo })} · ${sentAt}`,
    },
    lista: { title: t.tracking.readyTitle, body: takeout ? t.web.readyBody : fmt(t.tracking.readyBody, { mesa }) },
    entregada: takeout
      ? { title: t.web.doneTitle, body: t.web.doneBody }
      : { title: t.tracking.deliveredTitle, body: t.tracking.deliveredBody },
  }[status]
  const Heading = headingLevel

  return (
    <section className="rounded-grande border border-borde bg-tarjeta px-4 pt-4 pb-4" aria-labelledby="estado">
      {inProgress && (
        <div className="mb-2.5">
          <p className="text-small text-texto-2">{t.tracking.etaLabel}</p>
          <p className="text-title-lg text-texto tabular-nums">{eta.range}</p>
        </div>
      )}
      <div aria-live="polite">
        <Heading id="estado" className={cx('text-texto', inProgress ? 'text-section' : 'text-title')}>
          {headline.title}
        </Heading>
        <p className="mt-1 text-body text-texto-2">{headline.body}</p>
      </div>
      <div className="mt-4">
        <TrackingTimeline comanda={comanda} status={status} takeout={takeout} />
      </div>
    </section>
  )
}

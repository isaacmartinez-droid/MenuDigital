import { BellRing, Flame, PackageCheck, ReceiptText, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import type { Comanda, ComandaStatus } from '../types/order'
import { stepClocks } from '../lib/comandaStatus'
import { cx } from '../lib/cx'
import { t } from '../lib/text'

const ORDER: ComandaStatus[] = ['recibida', 'en-el-comal', 'lista', 'entregada']

interface TrackingTimelineProps {
  comanda: Comanda
  /** Estado en vivo (puede ir adelante del guardado en la comanda). */
  status: ComandaStatus
  /** Para llevar: "Lista" con bolsa y el último paso es "Recogida". */
  takeout?: boolean
}

/**
 * Línea de tiempo vertical del pedido: cada paso con su ícono y la hora en
 * que pasó. El paso en curso va en ámbar, con un pulso en el ícono y una barra
 * que avanza; los que faltan, en gris (con la hora estimada de "Lista").
 * Al entregarse queda como la historia del pedido. Con "reducir movimiento",
 * sin pulso y con la barra quieta.
 */
export function TrackingTimeline({ comanda, status, takeout = false }: TrackingTimelineProps) {
  const current = ORDER.indexOf(status)
  const allDone = status === 'entregada'
  const state = (i: number) => (allDone || i < current ? 'done' : i === current ? 'current' : 'pending')
  const clocks = stepClocks(comanda, status)
  const labels = takeout ? [...t.tracking.steps.slice(0, 3), t.web.pickedUp] : t.tracking.steps
  const icons = [ReceiptText, Flame, takeout ? ShoppingBag : BellRing, takeout ? PackageCheck : UtensilsCrossed]

  return (
    <ol aria-label={t.tracking.stepsLabel}>
      {ORDER.map((step, i) => {
        const s = state(i)
        const Icon = icons[i]
        const last = i === ORDER.length - 1
        return (
          <li
            key={step}
            aria-current={s === 'current' ? 'step' : undefined}
            className={cx('relative flex gap-3', !last && 'pb-3')}
          >
            {/* Línea que une con el paso siguiente: llena si ya se pasó, punteada si falta. */}
            {!last && (
              <span
                aria-hidden
                className={cx(
                  'absolute top-8 bottom-0 left-[15px] w-0.5',
                  s === 'done' ? 'bg-verde' : 'border-l-2 border-dashed border-borde bg-transparent',
                )}
              />
            )}
            <span
              aria-hidden
              className={cx(
                'relative grid size-8 shrink-0 place-items-center rounded-completo transition-colors duration-500',
                s === 'done' && 'bg-verde text-blanco',
                s === 'current' && 'bg-ambar-suave text-texto',
                s === 'pending' && 'border border-borde bg-fondo text-texto-2',
              )}
            >
              {s === 'current' && (
                <span className="absolute inset-0 hidden rounded-completo bg-ambar/50 motion-safe:block motion-safe:animate-ping-soft" />
              )}
              <Icon size={17} strokeWidth={2.25} className="relative" />
            </span>
            <div className="min-w-0 flex-1 pt-1.5">
              <p className="flex items-baseline justify-between gap-3">
                <span
                  className={cx(
                    'text-dish',
                    s === 'pending' ? 'font-normal text-texto-2' : 'text-texto',
                  )}
                >
                  {labels[i]}
                  <span className="sr-only">
                    {' · '}
                    {s === 'done' ? t.tracking.stepDone : s === 'current' ? t.tracking.stepNow : t.tracking.stepPending}
                  </span>
                </span>
                <span
                  className={cx(
                    'shrink-0 text-small tabular-nums',
                    s === 'current' ? 'font-semibold text-texto-sobre-ambar' : 'text-texto-2',
                  )}
                >
                  {s === 'current' && !allDone ? t.tracking.now : clocks[i]}
                </span>
              </p>
              {/* El paso en curso "trabaja": una barra que avanza una y otra vez. */}
              {s === 'current' && (
                <span aria-hidden className="relative mt-2 block h-1.5 overflow-hidden rounded-completo bg-ambar-suave">
                  <span
                    data-progress
                    className="absolute inset-y-0 left-0 w-1/2 rounded-completo bg-ambar motion-safe:w-2/5 motion-safe:animate-progress"
                  />
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

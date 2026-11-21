import { Bell, Check, Clock, Flame } from 'lucide-react'
import type { ComandaStatus } from '../types/order'
import { cx } from '../lib/cx'
import { t } from '../lib/text'

const ICONS = [Clock, Flame, Bell, Check]
const ORDER: ComandaStatus[] = ['recibida', 'en-el-comal', 'lista', 'entregada']

interface TrackingBarProps {
  status: ComandaStatus
}

/**
 * Barra horizontal de 4 tramos: hechos en verde, el actual en ámbar,
 * pendientes en color borde. "Entregada" marca los 4 como hechos.
 */
export function TrackingBar({ status }: TrackingBarProps) {
  const current = ORDER.indexOf(status)
  const allDone = status === 'entregada'
  const state = (i: number) => (allDone || i < current ? 'done' : i === current ? 'current' : 'pending')
  const labels = t.tracking.steps

  return (
    <div>
      <div className="flex gap-1" aria-hidden>
        {ORDER.map((step, i) => (
          <span
            key={step}
            className={cx(
              'h-1.5 flex-1 rounded-completo transition-colors duration-500',
              state(i) === 'done' && 'bg-verde',
              state(i) === 'current' && 'bg-ambar',
              state(i) === 'pending' && 'bg-borde',
            )}
          />
        ))}
      </div>
      <ol className="mt-4 grid grid-cols-4" aria-label={t.tracking.stepsLabel}>
        {ORDER.map((step, i) => {
          const s = state(i)
          const Icon = s === 'done' ? Check : ICONS[i]
          return (
            <li
              key={step}
              className="flex flex-col items-center gap-1.5"
              aria-current={s === 'current' ? 'step' : undefined}
            >
              <span
                aria-hidden
                className={cx(
                  'grid size-8 place-items-center rounded-completo transition-colors duration-500',
                  s === 'done' && 'bg-verde text-blanco',
                  s === 'current' && 'bg-ambar-suave text-texto',
                  s === 'pending' && 'bg-fondo text-texto-2',
                )}
              >
                <Icon size={s === 'done' ? 22 : 18} strokeWidth={2.25} />
              </span>
              <span className={cx('text-small', s === 'pending' ? 'text-texto-2' : 'text-texto')}>
                {labels[i]}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

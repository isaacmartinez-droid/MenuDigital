import type { ReactNode } from 'react'
import { cx } from '../lib/cx'

export type NoticeTone = 'positivo' | 'aviso'

interface NoticeBannerProps {
  tone: NoticeTone
  title: ReactNode
  body?: ReactNode
  /** Acción a la derecha del título (ej. "Deshacer"). */
  action?: { label: string; onClick: () => void }
  className?: string
  /** Rol ARIA: status para avisos que aparecen solos; ninguno para avisos fijos. */
  role?: 'status' | 'alert'
}

const tones: Record<NoticeTone, { box: string; dot: string; title: string; body: string }> = {
  // Verde: algo salió bien (agregado, mesero avisado, pasá a caja).
  positivo: { box: 'bg-verde-suave', dot: 'bg-verde', title: 'text-verde', body: 'text-texto' },
  // Ámbar suave: el local está cerrado o se fue la señal.
  aviso: {
    box: 'bg-ambar-suave',
    dot: 'bg-texto-sobre-ambar',
    title: 'text-texto-sobre-ambar',
    body: 'text-texto-sobre-ambar',
  },
}

/** Aviso en franja con punto de color, título y texto de apoyo. */
export function NoticeBanner({ tone, title, body, action, className, role }: NoticeBannerProps) {
  const style = tones[tone]
  return (
    <div
      role={role}
      className={cx('flex animate-pop-in gap-3 rounded-grande py-3 pr-3 pl-[13px]', style.box, className)}
    >
      <span aria-hidden className={cx('mt-[3px] size-[9px] shrink-0 rounded-completo', style.dot)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className={cx('text-dish', style.title)}>{title}</p>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="-my-3.5 -mr-1 min-h-12 shrink-0 px-1 text-dish text-verde"
            >
              {action.label}
            </button>
          )}
        </div>
        {body && <p className={cx('mt-1 text-small', style.body)}>{body}</p>}
      </div>
    </div>
  )
}

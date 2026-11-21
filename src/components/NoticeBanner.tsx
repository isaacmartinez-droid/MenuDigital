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

const tones: Record<NoticeTone, { box: string; dot: string; title: string }> = {
  // Verde: algo salió bien (agregado, mesero avisado, pasá a caja).
  positivo: { box: 'bg-verde-suave', dot: 'bg-verde', title: 'text-verde' },
  // Ámbar suave: el local está cerrado o se fue la señal.
  aviso: { box: 'bg-ambar-suave', dot: 'bg-texto', title: 'text-texto' },
}

/** Aviso en franja con punto de color, título y texto de apoyo. */
export function NoticeBanner({ tone, title, body, action, className, role }: NoticeBannerProps) {
  const style = tones[tone]
  return (
    <div
      role={role}
      className={cx('flex animate-pop-in gap-[17px] rounded-grande px-4 py-4', style.box, className)}
    >
      <span aria-hidden className={cx('mt-[6px] size-2.5 shrink-0 rounded-completo', style.dot)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className={cx('text-dish', style.title)}>{title}</p>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="-my-3.5 -mr-2 min-h-12 shrink-0 px-2 text-dish text-verde"
            >
              {action.label}
            </button>
          )}
        </div>
        {body && <p className="mt-1.5 text-small text-texto">{body}</p>}
      </div>
    </div>
  )
}

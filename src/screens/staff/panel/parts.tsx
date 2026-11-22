import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../../../components/Button'
import { cx } from '../../../lib/cx'
import { t } from '../../../lib/text'

/**
 * Título de la sección ("Menú") y, a la derecha, su botón principal ("Agregar plato").
 * Sin `onAction`, el botón queda deshabilitado con "Próximamente".
 */
export function PanelHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-title-lg text-texto">{title}</h2>
      {action && (
        <Button
          disabled={!onAction}
          title={onAction ? undefined : t.staff.soon}
          onClick={onAction}
          icon={<Plus aria-hidden size={20} />}
        >
          {action}
          {!onAction && <span className="sr-only"> ({t.staff.soon})</span>}
        </Button>
      )}
    </div>
  )
}

/** Tarjeta blanca con borde, como las del Figma. */
export function PanelCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-grande border border-borde bg-tarjeta', className)}>{children}</div>
}

/** Nota gris al pie de la sección. */
export function PanelNote({ children }: { children: ReactNode }) {
  return <p className="text-small text-texto-2">{children}</p>
}

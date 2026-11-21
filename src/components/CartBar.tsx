import type { ReactNode } from 'react'
import { cx } from '../lib/cx'

interface DockProps {
  children: ReactNode
  className?: string
}

/** Franja fija inferior (blanca, con borde arriba) alineada con la columna de la app. */
export function BottomDock({ children, className }: DockProps) {
  return (
    <div className={cx('bottom-dock z-30 border-t border-borde bg-tarjeta', className)}>
      <div className="px-4 pt-3 pb-3">{children}</div>
    </div>
  )
}

/** Espacio al final del contenido para que la barra fija no tape nada. */
export function DockSpacer({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return <div aria-hidden className={size === 'md' ? 'h-24' : 'h-32'} />
}

interface CartBarProps {
  label: string
  total: string
  onClick: () => void
}

/** Barra "Ver pedido · N platos   C$ total". */
export function CartBar({ label, total, onClick }: CartBarProps) {
  return (
    <BottomDock className="animate-fade-in">
      <button
        type="button"
        onClick={onClick}
        className="focus-on-dark flex h-[52px] w-full items-center justify-between rounded-grande bg-verde px-4 text-button text-blanco transition-transform duration-150 active:scale-[0.98]"
      >
        <span>{label}</span>
        <span>{total}</span>
      </button>
    </BottomDock>
  )
}

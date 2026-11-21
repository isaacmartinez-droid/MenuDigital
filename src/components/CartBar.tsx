import { useEffect, useRef, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { prefersReducedMotion } from '../lib/motion'

interface DockProps {
  children: ReactNode
  className?: string
}

/**
 * Franja fija inferior (blanca, con borde arriba) alineada con la columna de la app.
 * Publica su alto en --dock-h para que el botón flotante del mesero quede encima.
 */
export function BottomDock({ children, className }: DockProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const publish = () => root.style.setProperty('--dock-h', `${el.offsetHeight}px`)
    publish()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish)
    ro?.observe(el)
    return () => {
      ro?.disconnect()
      root.style.removeProperty('--dock-h')
    }
  }, [])

  return (
    <div ref={ref} className={cx('bottom-dock z-30 border-t border-borde bg-tarjeta', className)}>
      <div className="px-4 pt-3 pb-3">{children}</div>
    </div>
  )
}

/** Espacio al final del contenido para que la barra fija y el botón del mesero no tapen nada. */
export function DockSpacer({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return <div aria-hidden className={size === 'md' ? 'h-40' : 'h-48'} />
}

interface CartBarProps {
  label: string
  total: string
  /** Cantidad de platos: cuando sube, la barra da un pequeño salto. */
  count?: number
  onClick: () => void
}

/**
 * Barra "Ver pedido · N platos   C$ total". Al agregar un plato da un pequeño
 * salto, para que se note aunque el cliente esté abajo en la lista (no con
 * "reducir movimiento").
 */
export function CartBar({ label, total, count = 0, onClick }: CartBarProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const previous = useRef(count)

  useEffect(() => {
    if (count > previous.current && !prefersReducedMotion()) {
      ref.current?.animate(
        [
          { transform: 'translateY(0) scale(1)' },
          { transform: 'translateY(-4px) scale(1.03)' },
          { transform: 'translateY(0) scale(1)' },
        ],
        { duration: 360, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      )
    }
    previous.current = count
  }, [count])

  return (
    <BottomDock className="animate-fade-in">
      <button
        ref={ref}
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

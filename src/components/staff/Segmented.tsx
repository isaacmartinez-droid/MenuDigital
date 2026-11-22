import { useRef, type KeyboardEvent } from 'react'
import { cx } from '../../lib/cx'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  /** Todavía no hace nada: se ve, pero no se puede elegir. */
  disabled?: boolean
}

interface SegmentedProps<T extends string> {
  label: string
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/**
 * Pastillas para elegir una opción (pestañas de caja, cómo cobrar, método).
 * Es un grupo de radio: Tab entra a la elegida y las flechas cambian de opción.
 */
export function Segmented<T extends string>({ label, options, value, onChange, className }: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const enabled = options.filter((o) => !o.disabled)

  const onKeyDown = (e: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    const i = enabled.findIndex((o) => o.value === value)
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? enabled.length - 1
          : (i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + enabled.length) % enabled.length
    const option = enabled[next]
    onChange(option.value)
    refs.current[options.indexOf(option)]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cx('flex gap-1 rounded-completo border border-borde bg-fondo p-1', className)}
    >
      {options.map((o, i) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={o.disabled}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cx(
              'min-h-9 flex-1 rounded-completo px-3 py-2 text-dish',
              on ? 'border border-borde bg-tarjeta text-texto' : 'text-texto-2',
              o.disabled && 'opacity-60',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

import { Minus, Plus } from 'lucide-react'
import { cx } from '../lib/cx'
import { fmt, t } from '../lib/text'

interface QuantityStepperProps {
  value: number
  onIncrement: () => void
  onDecrement: () => void
  /** Nombre del plato, para las etiquetas accesibles. */
  itemName: string
  min?: number
  max?: number
  size?: 'sm' | 'md'
  className?: string
}

/** Contador − N + en pastilla. Con value = min, el − queda deshabilitado. */
export function QuantityStepper({
  value,
  onIncrement,
  onDecrement,
  itemName,
  min = 0,
  max = 99,
  size = 'sm',
  className,
}: QuantityStepperProps) {
  return (
    <div
      role="group"
      aria-label={fmt(t.common.quantity, { n: value, dish: itemName })}
      className={cx(
        'inline-flex shrink-0 items-center rounded-completo border border-borde bg-tarjeta',
        // Medidas de las capturas: 97 × 37 en listas, 112 × 46 en el detalle.
        size === 'sm' ? 'h-[37px] pr-1 pl-[3px]' : 'h-12 pr-[7px] pl-2',
        className,
      )}
    >
      <button
        type="button"
        onClick={onDecrement}
        disabled={value <= min}
        aria-label={fmt(t.common.decrease, { dish: itemName })}
        className="relative grid size-8 place-items-center rounded-completo text-verde disabled:text-borde before:absolute before:-inset-1.5 before:content-['']"
      >
        <Minus size={22} strokeWidth={2.5} aria-hidden />
      </button>
      <span
        aria-live="polite"
        className={cx('text-center text-button text-texto tabular-nums', size === 'sm' ? 'w-7' : 'w-8')}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={value >= max}
        aria-label={fmt(t.common.increase, { dish: itemName })}
        className={cx(
          "relative grid place-items-center rounded-completo bg-verde text-blanco disabled:bg-borde before:absolute before:-inset-2 before:content-['']",
          size === 'sm' ? 'size-7' : 'size-8',
        )}
      >
        <Plus size={size === 'sm' ? 20 : 22} strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  )
}

interface AddButtonProps {
  onClick: () => void
  label: string
  className?: string
}

/** El + verde redondo que agrega con un toque. Área táctil ampliada a 48 px. */
export function AddButton({ onClick, label, className }: AddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cx(
        "relative grid size-8 shrink-0 place-items-center rounded-completo bg-verde text-blanco transition-transform duration-150 active:scale-90 before:absolute before:-inset-2 before:content-['']",
        className,
      )}
    >
      <Plus size={22} strokeWidth={2.5} aria-hidden />
    </button>
  )
}

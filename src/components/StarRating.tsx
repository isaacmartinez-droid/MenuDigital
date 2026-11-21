import { useId } from 'react'
import { Star } from 'lucide-react'
import { cx } from '../lib/cx'

interface StarRatingProps {
  value: number
  /** Si se pasa, las estrellas se pueden tocar (calificación de un toque). */
  onChange?: (value: number) => void
  /** Etiqueta accesible, ej. "Calificación de Enchilada". */
  label: string
  size?: number
  className?: string
}

const STARS = [1, 2, 3, 4, 5]

/**
 * Cinco estrellas. Solo lectura, o grupo de radios cuando hay onChange:
 * un toque califica, se navega con flechas y el lector anuncia "4 de 5".
 */
export function StarRating({ value, onChange, label, size = 22, className }: StarRatingProps) {
  const name = useId()

  if (!onChange) {
    return (
      <span role="img" aria-label={`${label}: ${value} de 5`} className={cx('inline-flex gap-0.5', className)}>
        {STARS.map((n) => (
          <StarIcon key={n} filled={n <= Math.round(value)} size={size} />
        ))}
      </span>
    )
  }

  return (
    <fieldset className={cx('inline-flex', className)}>
      <legend className="sr-only">{label}</legend>
      {STARS.map((n) => (
        <label
          key={n}
          className="relative grid cursor-pointer place-items-center px-[1px] py-1 has-[:focus-visible]:rounded-chico has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-verde"
        >
          <input
            type="radio"
            name={name}
            value={n}
            checked={value === n}
            onChange={() => onChange(n)}
            className="sr-only"
            aria-label={`${n} de 5`}
          />
          <StarIcon filled={n <= value} size={size} />
        </label>
      ))}
    </fieldset>
  )
}

function StarIcon({ filled, size }: { filled: boolean; size: number }) {
  return (
    <Star
      aria-hidden
      size={size}
      strokeWidth={1.5}
      className={cx('transition-colors duration-150', filled ? 'fill-ambar text-ambar' : 'fill-transparent text-texto-2')}
    />
  )
}

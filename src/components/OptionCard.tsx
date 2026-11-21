import { cx } from '../lib/cx'

interface OptionCardProps {
  name: string
  value: string
  checked: boolean
  onChange: (value: string) => void
  title: string
  hint?: string
}

/**
 * Opción en tarjeta con radio (hojas "¿Qué necesitás?" y "Se acabó el maduro").
 * Es un <input type="radio"> real: se navega con flechas y lo anuncia el lector.
 */
export function OptionCard({ name, value, checked, onChange, title, hint }: OptionCardProps) {
  return (
    <label
      className={cx(
        'flex min-h-12 cursor-pointer items-center gap-[13px] rounded-grande px-4 transition-colors duration-150 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-verde',
        'py-3',
        checked ? 'border-2 border-verde bg-verde-suave px-[15px]' : 'border border-borde bg-tarjeta',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cx(
          'grid size-[22px] shrink-0 place-items-center rounded-completo border-2',
          checked ? 'border-verde bg-verde' : 'border-texto-2 bg-tarjeta',
        )}
      >
        {checked && <span className="size-2 rounded-completo bg-blanco" />}
      </span>
      <span className="min-w-0">
        <span className="block text-dish font-medium text-texto">{title}</span>
        {hint && <span className="mt-0.5 block text-small text-texto-2">{hint}</span>}
      </span>
    </label>
  )
}

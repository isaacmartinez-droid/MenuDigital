import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cx } from '../lib/cx'

interface ChoiceRowProps {
  type: 'radio' | 'checkbox'
  name: string
  value: string
  checked: boolean
  disabled?: boolean
  onChange: () => void
  label: string
  /** Texto a la derecha: "Viene así" o "+C$ 30". */
  aside?: ReactNode
}

/** Fila de opción del detalle (acompañante con radio, extras con casilla). */
export function ChoiceRow({ type, name, value, checked, disabled, onChange, label, aside }: ChoiceRowProps) {
  return (
    <label
      className={cx(
        'flex h-12 items-center gap-3 rounded-tarjeta px-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-verde',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      {type === 'radio' ? (
        <span
          aria-hidden
          className={cx(
            'grid size-[22px] shrink-0 place-items-center rounded-completo border-2',
            checked ? 'border-verde bg-verde' : 'border-texto-2 bg-tarjeta',
          )}
        >
          {checked && <span className="size-2 rounded-completo bg-blanco" />}
        </span>
      ) : (
        <span
          aria-hidden
          className={cx(
            'grid size-[22px] shrink-0 place-items-center rounded-chico border-2',
            checked ? 'border-verde bg-verde text-blanco' : 'border-texto-2 bg-tarjeta',
          )}
        >
          {checked && <Check size={16} strokeWidth={3} />}
        </span>
      )}
      <span className="flex-1 text-body text-texto">{label}</span>
      {aside && <span className="shrink-0 text-body text-texto-2">{aside}</span>}
    </label>
  )
}

interface GroupHeaderProps {
  id: string
  title: string
  rule: string
  /** Pastilla a la derecha (opcional). */
  badge?: ReactNode
}

/** Cabecera de grupo de opciones: "Acompañante · Elegí 1 · máx. 1" con su insignia. */
export function GroupHeader({ id, title, rule, badge }: GroupHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-tarjeta bg-fondo px-3 py-2">
      <div>
        <p id={id} className="text-dish text-texto">
          {title}
        </p>
        <p className="text-small text-texto-2">{rule}</p>
      </div>
      {badge}
    </div>
  )
}

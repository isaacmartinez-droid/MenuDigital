import { cx } from '../../lib/cx'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Nombre que lee el lector de pantalla ("Fritanga tradicional"). */
  label: string
  /** Texto del estado ("Hay" / "Agotado"), para el lector. */
  stateText: string
  id?: string
  disabled?: boolean
  /** Texto al pasar el mouse (por ejemplo, "Próximamente"). */
  title?: string
}

/** Interruptor de 48 × 28 (P1c): verde con la bolita a la derecha = encendido. */
export function Switch({ checked, onChange, label, stateText, id, disabled, title }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${label}: ${stateText}`}
      disabled={disabled}
      title={title}
      onClick={() => onChange(!checked)}
      className="-my-2.5 grid min-h-12 shrink-0 place-items-center disabled:opacity-50"
    >
      <span
        aria-hidden
        className={cx(
          'flex h-7 w-12 items-center rounded-completo px-[3px] transition-colors duration-150',
          checked ? 'justify-end bg-verde' : 'justify-start bg-borde',
        )}
      >
        <span className="size-[22px] rounded-completo bg-tarjeta shadow-sm" />
      </span>
    </button>
  )
}

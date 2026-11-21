import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/cx'

type Variant = 'primary' | 'secondary' | 'pill' | 'onDark'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  /** Ícono a la izquierda del texto. */
  icon?: ReactNode
  /** Texto a la derecha, ej. el total ("C$ 430"). Alinea el contenido a los extremos. */
  trailing?: ReactNode
  block?: boolean
}

const base =
  'inline-flex min-h-12 items-center gap-2.5 px-4 transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:active:scale-100'

const variants: Record<Variant, string> = {
  // Acción principal: verde, 52 px como en las capturas.
  primary:
    'h-[52px] rounded-grande bg-verde text-button text-blanco focus-on-dark disabled:bg-foto-vacia disabled:text-texto-2',
  // Acción secundaria a lo ancho ("Pedir algo más").
  secondary:
    'h-[52px] rounded-grande border border-borde bg-tarjeta text-button text-texto disabled:text-texto-2',
  // Acción principal sobre fondo verde (portada): blanco con texto verde.
  onDark: 'h-[52px] rounded-grande bg-blanco text-button text-verde focus-on-dark',
  // Pastilla blanca ("Llamar al mesero", "Ya vamos a pagar").
  pill: 'h-12 rounded-completo border border-borde bg-tarjeta text-small font-medium text-texto disabled:text-texto-2',
}

export function Button({
  variant = 'primary',
  icon,
  trailing,
  block = false,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        base,
        variants[variant],
        block && 'w-full',
        trailing ? 'justify-between px-4' : 'justify-center',
        className,
      )}
      {...rest}
    >
      <span className="inline-flex min-w-0 items-center gap-2.5">
        {icon}
        <span className="truncate">{children}</span>
      </span>
      {trailing && <span className="shrink-0">{trailing}</span>}
    </button>
  )
}

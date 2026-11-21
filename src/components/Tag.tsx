import type { ReactNode } from 'react'
import type { TagTone } from '../types/menu'
import { cx } from '../lib/cx'

export type TagVariant = TagTone | 'oscuro' | 'contorno'

const tones: Record<TagVariant, string> = {
  ambar: 'bg-ambar text-texto-sobre-ambar',
  promo: 'bg-promo text-blanco',
  combo: 'bg-combo-fondo text-azul-logo',
  agotado: 'bg-borde text-texto-2',
  oscuro: 'bg-texto text-blanco',
  contorno: 'border border-borde bg-tarjeta text-texto-2',
}

interface TagProps {
  tone: TagVariant
  children: ReactNode
  className?: string
}

/** Etiqueta en pastilla: Más vendido, Promo, Combo, Agotado, Obligatorio… */
export function Tag({ tone, children, className }: TagProps) {
  return (
    <span
      className={cx(
        'inline-flex h-6 shrink-0 items-center rounded-completo px-2.5 text-small font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

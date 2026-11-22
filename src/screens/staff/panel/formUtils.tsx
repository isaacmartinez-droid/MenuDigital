import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { cx } from '../../../lib/cx'

/** Caja de texto del panel (la misma de "Recibido" en caja); en rojo si tiene error. */
export const inputClass = (bad = false) =>
  cx(
    'h-12 w-full rounded-tarjeta border bg-tarjeta px-3 text-body text-texto outline-none focus:border-2 focus:border-verde',
    bad ? 'border-2 border-promo' : 'border-borde',
  )

/** aria-describedby de un campo según tenga ayuda o error. */
export const describedBy = (id: string, hint?: string, error?: string) =>
  [hint && `${id}-h`, error && `${id}-e`].filter(Boolean).join(' ') || undefined

/** Aviso verde que se anuncia ("Enchilada guardado…") y se va solo a los 5 s. */
export function useSavedNote(): [ReactNode, (text: string) => void] {
  const [text, setText] = useState('')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const show = (value: string) => {
    setText(value)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setText(''), 5000)
  }
  const node = (
    <p role="status" className={cx('flex items-center gap-2 text-small font-medium text-verde', !text && 'sr-only')}>
      {text && <CheckCircle2 aria-hidden size={18} />}
      {text}
    </p>
  )
  return [node, show]
}

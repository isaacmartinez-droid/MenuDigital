import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { cx } from '../../../lib/cx'
import { t } from '../../../lib/text'

/** Caja de texto del panel (la misma de "Recibido" en caja); en rojo si tiene error. */
export const inputClass = (bad = false) =>
  cx(
    'h-12 w-full rounded-tarjeta border bg-tarjeta px-3 text-body text-texto outline-none focus:border-2 focus:border-verde',
    bad ? 'border-2 border-promo' : 'border-borde',
  )

/** aria-describedby de un campo según tenga ayuda o error. */
export const describedBy = (id: string, hint?: string, error?: string) =>
  [hint && `${id}-h`, error && `${id}-e`].filter(Boolean).join(' ') || undefined

/** Lleva el foco al botón principal de la sección ("Agregar plato") cuando lo que tenía el foco desaparece. */
export const focusPanelAction = () =>
  window.setTimeout(() => document.querySelector<HTMLElement>('[data-panel-action]')?.focus(), 0)

/**
 * Aviso verde que se anuncia ("Enchilada guardado…") y se va solo a los 5 s. Si se le
 * pasa `undo` (al borrar algo), muestra "Deshacer" mientras está visible.
 */
export function useSavedNote(): [ReactNode, (text: string, undo?: () => void) => void] {
  const [text, setText] = useState('')
  const [undo, setUndo] = useState<(() => void) | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const show = (value: string, onUndo?: () => void) => {
    setText(value)
    setUndo(() => onUndo ?? null)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setText('')
      setUndo(null)
    }, 5000)
  }
  const node = (
    <div className={cx('flex flex-wrap items-center gap-3', !text && 'sr-only')}>
      <p role="status" className="flex items-center gap-2 text-small font-medium text-verde">
        {text && <CheckCircle2 aria-hidden size={18} />}
        {text}
      </p>
      {text && undo && (
        <button
          type="button"
          onClick={() => {
            undo()
            show(t.staff.panel.undone)
          }}
          className="min-h-11 rounded-completo border border-borde bg-tarjeta px-4 text-small font-medium text-texto"
        >
          {t.staff.panel.undo}
        </button>
      )}
    </div>
  )
  return [node, show]
}

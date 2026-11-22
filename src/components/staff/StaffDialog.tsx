import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { t } from '../../lib/text'
import { cx } from '../../lib/cx'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface StaffDialogProps {
  title: string
  description?: ReactNode
  onClose: () => void
  children: ReactNode
  /** Ancho de la ventana (P1c: 520, P2b: 560). */
  width: 520 | 560
  /** Elemento que recibe el foco al abrir (si no, la ventana). */
  initialFocus?: RefObject<HTMLElement | null>
}

/**
 * Ventana centrada sobre la pantalla oscurecida (agotados, cobrar). Se cierra
 * con la ✕, tocando afuera o con Esc; el foco queda adentro y vuelve a donde
 * estaba al cerrar.
 */
export function StaffDialog({ title, description, onClose, children, width, initialFocus }: StaffDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    close.current = onClose
  })

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    ;(initialFocus?.current ?? panel)?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close.current()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (document.activeElement === panel) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      previouslyFocused?.focus?.()
    }
    // Solo al abrir y cerrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-6">
      <div aria-hidden className="fixed inset-0 animate-fade-in bg-texto/50" onClick={() => close.current()} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cx(
          'relative flex max-h-[calc(100dvh-48px)] w-full animate-pop-in flex-col rounded-grande bg-tarjeta p-6 outline-none',
          width === 520 ? 'max-w-[520px]' : 'max-w-[560px]',
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-title text-texto">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => close.current()}
            aria-label={t.common.close}
            className="-m-1.5 grid size-12 shrink-0 place-items-center"
          >
            <span className="grid size-9 place-items-center rounded-completo bg-fondo text-texto">
              <X size={20} strokeWidth={2.2} aria-hidden />
            </span>
          </button>
        </div>
        {description && (
          <p id={descId} className="mt-3 text-small text-texto-2">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}

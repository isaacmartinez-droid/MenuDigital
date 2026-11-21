import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { t } from '../lib/text'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  /** Texto bajo el título. */
  description?: ReactNode
  children: ReactNode
  /** Botón de acción al pie. */
  footer?: ReactNode
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Hoja que sube desde abajo. role="dialog" + aria-modal, foco atrapado
 * adentro, Escape o tocar el fondo la cierran y el foco vuelve a donde estaba.
 */
export function BottomSheet({ open, onClose, title, description, children, footer }: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])

    // El foco entra al diálogo (el lector anuncia el título) y Tab recorre sus opciones.
    panel?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (!items.length) return
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (document.activeElement === panel) {
        e.preventDefault()
        ;(e.shiftKey ? lastItem : firstItem).focus()
      } else if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault()
        lastItem.focus()
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault()
        firstItem.focus()
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
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div aria-hidden className="absolute inset-0 animate-fade-in bg-texto/45" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className="bottom-dock z-10 max-h-[90dvh] animate-sheet-in overflow-y-auto rounded-t-hoja bg-tarjeta outline-none"
      >
        {/* Abajo queda aire para el pulgar, como en las capturas (≈ 76 px). */}
        <div className="px-6 pt-6 pb-[76px]">
          <div className="flex items-center justify-between gap-4">
            <h2 id={titleId} className="text-title text-texto">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.common.close}
              className="grid size-9 shrink-0 place-items-center rounded-completo bg-fondo text-texto"
            >
              <X size={22} strokeWidth={2} aria-hidden />
            </button>
          </div>
          {description && (
            <p id={descId} className="mt-4 text-body text-texto-2">
              {description}
            </p>
          )}
          <div className="mt-4">{children}</div>
          {footer && <div className="mt-4">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body,
  )
}

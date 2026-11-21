import { NoticeBanner, type NoticeTone } from './NoticeBanner'

interface ToastProps {
  title: string
  body?: string
  tone?: NoticeTone
  action?: { label: string; onClick: () => void }
  className?: string
}

/**
 * Aviso pasajero (ej. "Agregaste Fritanga tradicional" con "Deshacer").
 * role="status" para que el lector de pantalla lo anuncie sin interrumpir.
 * El tiempo en pantalla lo maneja quien lo muestra (config: timings.undoToastMs).
 */
export function Toast({ title, body, tone = 'positivo', action, className }: ToastProps) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <NoticeBanner tone={tone} title={title} body={body} action={action} />
    </div>
  )
}

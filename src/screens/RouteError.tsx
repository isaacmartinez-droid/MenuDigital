import { WifiOff } from 'lucide-react'
import { t } from '../lib/text'

/**
 * Si una pantalla no se pudo cargar (casi siempre por falta de señal),
 * mensaje amable y "Reintentar". El pedido sigue guardado en el teléfono.
 */
export function RouteError() {
  return (
    <main className="app-shell flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <span aria-hidden className="mb-4 grid size-14 place-items-center rounded-completo bg-ambar-suave text-texto-sobre-ambar">
        <WifiOff size={26} />
      </span>
      <h1 className="text-title text-texto">{t.offline.title}</h1>
      <p className="mt-2 max-w-72 text-body text-texto-2">{t.offline.body}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="focus-on-dark mt-6 h-[52px] rounded-grande bg-verde px-8 text-button text-blanco"
      >
        {t.offline.retry}
      </button>
    </main>
  )
}

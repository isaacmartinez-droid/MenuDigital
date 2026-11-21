import { Banknote } from 'lucide-react'
import { t } from '../lib/text'

/**
 * Aviso ámbar "Pagás en caja al terminar". Por decisión de diseño aparece
 * solo al momento de pagar (M6 y M6b), no en el menú ni en el seguimiento.
 */
export function PaymentNotice() {
  return (
    <aside className="flex items-center gap-3 rounded-grande border-[1.5px] border-ambar bg-ambar-suave px-4 py-4">
      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-completo bg-ambar text-texto-sobre-ambar">
        <Banknote size={22} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-section text-texto-sobre-ambar">{t.payment.title}</p>
        <p className="mt-1 text-small text-texto-sobre-ambar">{t.payment.body}</p>
      </div>
    </aside>
  )
}

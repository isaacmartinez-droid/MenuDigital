import { MessageCircle } from 'lucide-react'
import { whatsappHref } from '../lib/whatsapp'
import { t } from '../lib/text'

/**
 * "Escribinos" por WhatsApp, flotante abajo a la derecha, siempre por encima
 * de la barra fija de la pantalla (--dock-h). Solo en la web para llevar: en
 * el QR de mesa no se usa (el cliente ya está en el local).
 */
export function WhatsAppButton() {
  const href = whatsappHref()
  if (!href) return null
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 mx-auto flex w-full max-w-[var(--container-app)] justify-end px-6"
      style={{ bottom: 'calc(var(--dock-h, 0px) + 20px + env(safe-area-inset-bottom))' }}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto relative inline-flex h-[37px] items-center gap-2 rounded-completo border border-borde bg-tarjeta pr-4 pl-3 text-small font-medium text-verde shadow-[0_2px_8px_rgb(42_33_27/0.08)] before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-['']"
      >
        <MessageCircle size={20} strokeWidth={2} aria-hidden />
        {t.closed.whatsapp}
        <span className="sr-only"> {t.web.newTab}</span>
      </a>
    </div>
  )
}

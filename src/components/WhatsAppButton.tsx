import { MessageCircle } from 'lucide-react'
import { restaurant } from '../lib/catalog'
import { t } from '../lib/text'

/**
 * "Escribinos" por WhatsApp (solo en M8, con el local cerrado). Va dentro de
 * la barra inferior y flota por encima de ella, a la derecha.
 */
export function WhatsAppButton() {
  const { number, message } = restaurant.whatsapp
  if (!number) return null
  const href = `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="absolute right-6 bottom-full mb-5 inline-flex h-[37px] items-center gap-2 rounded-completo border border-borde bg-tarjeta pr-4 pl-3 text-small font-medium text-verde shadow-[0_2px_8px_rgb(42_33_27/0.08)] before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-['']"
    >
      <MessageCircle size={20} strokeWidth={2} aria-hidden />
      {t.closed.whatsapp}
    </a>
  )
}

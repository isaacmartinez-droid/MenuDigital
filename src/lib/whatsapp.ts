import { restaurant } from './catalog'

/** Link de "Escribinos" por WhatsApp (número y mensaje de la config); vacío si no hay número. */
export function whatsappHref(): string {
  const { number, message } = restaurant.whatsapp
  if (!number) return ''
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}

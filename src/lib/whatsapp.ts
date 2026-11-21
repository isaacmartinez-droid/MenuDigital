import { restaurant } from './catalog'

/** Link de "Escribinos" por WhatsApp (número y mensaje de la config); vacío si no hay número. */
export function whatsappHref(): string {
  const { number, message } = restaurant.whatsapp
  if (!number) return ''
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}

/** "50500000000" → "+505 0000 0000" (código de país y dos grupos de 4). */
export function whatsappDisplay(): string {
  const digits = restaurant.whatsapp.number.replace(/\D/g, '')
  if (digits.length < 11) return digits
  return `+${digits.slice(0, digits.length - 8)} ${digits.slice(-8, -4)} ${digits.slice(-4)}`
}

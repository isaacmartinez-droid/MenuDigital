import type { TipChoice } from '../types/order'
import { restaurant } from './catalog'

const { symbol, locale } = restaurant.currency
const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })

/** formatMoney(220) → "C$ 220" */
export function formatMoney(amount: number): string {
  return `${symbol} ${number.format(amount)}`
}

/** Propina en córdobas redondeada al entero: 10 % de 690 → 69. */
export function tipAmount(subtotal: number, tip: TipChoice): number {
  if (tip.kind === 'percent') return Math.round((subtotal * tip.percent) / 100)
  if (tip.kind === 'amount') return Math.max(0, Math.round(tip.amount))
  return 0
}

/** formatMoneyDelta(30) → "+C$ 30" (para extras). */
export function formatMoneyDelta(amount: number): string {
  return `+${symbol} ${number.format(amount)}`
}

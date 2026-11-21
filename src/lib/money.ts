import { restaurant } from './catalog'

const { symbol, locale } = restaurant.currency
const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })

/** formatMoney(220) → "C$ 220" */
export function formatMoney(amount: number): string {
  return `${symbol} ${number.format(amount)}`
}

/** formatMoneyDelta(30) → "+C$ 30" (para extras). */
export function formatMoneyDelta(amount: number): string {
  return `+${symbol} ${number.format(amount)}`
}

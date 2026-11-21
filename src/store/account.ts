import { useStore } from 'zustand'
import type { PayMethod, PayScope, TipChoice } from '../types/order'
import { restaurant } from '../lib/catalog'
import { tableStoreFactory } from './tableStore'

/**
 * Lo que este teléfono hizo con la cuenta de la mesa: llamar al mesero,
 * calificar, elegir cómo pagan y avisar a caja. Se guarda por mesa y se
 * borra al cerrar la cuenta. Los tiempos son marcas en milisegundos para
 * que los avisos sigan bien aunque se recargue la página.
 */
export interface WaiterCall {
  at: number
  reason: string
  /** Cuando un mesero tomó el aviso. */
  ackAt?: number
  waiter?: string
}

interface AccountState {
  waiterCall: WaiterCall | null
  ratings: Record<string, number>
  ratingsSkipped: boolean
  /** Qué paga este teléfono: solo lo suyo (por defecto) o toda la mesa. */
  payScope: PayScope
  /** Viene marcada la sugerida de la config; es voluntaria. */
  tip: TipChoice
  /** Cómo va a pagar (opcional) y, con efectivo, con cuánto. */
  payMethod: PayMethod | null
  cashGiven: number | null
  billRequestedAt: number | null
  cashier: string | null
  startWaiterCall: (reason: string) => void
  ackWaiterCall: (waiter: string) => void
  cancelWaiterCall: () => void
  rate: (dishId: string, stars: number) => void
  skipRatings: () => void
  setPayScope: (scope: PayScope) => void
  setTip: (tip: TipChoice) => void
  setPayMethod: (method: PayMethod | null) => void
  setCashGiven: (amount: number | null) => void
  markBillRequested: (cashier: string) => void
}

const store = tableStoreFactory<AccountState>('cuenta', () => (set, get) => ({
  waiterCall: null,
  ratings: {},
  ratingsSkipped: false,
  payScope: 'mine',
  tip: { kind: 'percent', percent: restaurant.tip.suggested },
  payMethod: null,
  cashGiven: null,
  billRequestedAt: null,
  cashier: null,
  startWaiterCall: (reason) => set({ waiterCall: { at: Date.now(), reason } }),
  ackWaiterCall: (waiter) => {
    const call = get().waiterCall
    if (call) set({ waiterCall: { ...call, ackAt: Date.now(), waiter } })
  },
  cancelWaiterCall: () => set({ waiterCall: null }),
  rate: (dishId, stars) => set({ ratings: { ...get().ratings, [dishId]: stars } }),
  skipRatings: () => set({ ratingsSkipped: true }),
  setPayScope: (payScope) => set({ payScope }),
  setTip: (tip) => set({ tip }),
  setPayMethod: (payMethod) => set(payMethod === 'efectivo' ? { payMethod } : { payMethod, cashGiven: null }),
  setCashGiven: (cashGiven) => set({ cashGiven }),
  markBillRequested: (cashier) => set({ billRequestedAt: Date.now(), cashier }),
}))

export const accountStore = store.get
export const resetAccountStore = store.reset

export function useAccount<T>(tableId: string, selector: (s: AccountState) => T): T {
  return useStore(store.get(tableId), selector)
}

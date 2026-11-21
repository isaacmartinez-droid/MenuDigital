import { useStore } from 'zustand'
import type { SplitMode } from '../types/order'
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
  split: SplitMode
  billRequestedAt: number | null
  cashier: string | null
  startWaiterCall: (reason: string) => void
  ackWaiterCall: (waiter: string) => void
  cancelWaiterCall: () => void
  rate: (dishId: string, stars: number) => void
  skipRatings: () => void
  setSplit: (split: SplitMode) => void
  markBillRequested: (cashier: string) => void
}

const store = tableStoreFactory<AccountState>('cuenta', () => (set, get) => ({
  waiterCall: null,
  ratings: {},
  ratingsSkipped: false,
  split: 'junto',
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
  setSplit: (split) => set({ split }),
  markBillRequested: (cashier) => set({ billRequestedAt: Date.now(), cashier }),
}))

export const accountStore = store.get
export const resetAccountStore = store.reset

export function useAccount<T>(tableId: string, selector: (s: AccountState) => T): T {
  return useStore(store.get(tableId), selector)
}

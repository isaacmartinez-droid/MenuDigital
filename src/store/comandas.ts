import { useStore } from 'zustand'
import type { Comanda, ComandaStatus, Substitution } from '../types/order'
import { tableStoreFactory } from './tableStore'

/**
 * Comandas de la cuenta de la mesa (las de este teléfono y las de los demás).
 * Una comanda enviada no se modifica: solo cambia su estado (lo manda cocina)
 * y se registran los reemplazos que pide cocina si se acaba algo.
 */
interface ComandasState {
  comandas: Comanda[]
  /** Reemplaza la cuenta con la que devuelve el servidor. */
  setAccount: (comandas: Comanda[]) => void
  /** Nuevo estado; con la cocina del personal, también la hora de cada paso. */
  setStatus: (id: string, status: ComandaStatus, statusTimes?: Comanda['statusTimes']) => void
  addSubstitution: (id: string, sub: Substitution) => void
}

const store = tableStoreFactory<ComandasState>('comandas', () => (set, get) => ({
  comandas: [],
  setAccount: (incoming) => {
    // Conserva el estado y los reemplazos locales más recientes.
    const local = new Map(get().comandas.map((c) => [c.id, c]))
    set({
      comandas: incoming.map((c) => {
        const mine = local.get(c.id)
        return mine
          ? {
              ...c,
              status: mine.status,
              statusAt: mine.statusAt,
              statusTimes: mine.statusTimes ?? c.statusTimes,
              substitutions: mine.substitutions.length ? mine.substitutions : c.substitutions,
            }
          : c
      }),
    })
  },
  setStatus: (id, status, statusTimes) =>
    set({
      comandas: get().comandas.map((c) => {
        if (c.id !== id) return c
        const times = statusTimes ? { statusTimes } : {}
        if (c.status === status) return statusTimes ? { ...c, ...times } : c
        return { ...c, status, statusAt: statusTimes?.[status] ?? new Date().toISOString(), ...times }
      }),
    }),
  addSubstitution: (id, sub) =>
    set({
      comandas: get().comandas.map((c) => (c.id === id ? { ...c, substitutions: [...c.substitutions, sub] } : c)),
    }),
}))

export const comandasStore = store.get
export const resetComandasStore = store.reset

export function useComandas<T>(tableId: string, selector: (s: ComandasState) => T): T {
  return useStore(store.get(tableId), selector)
}

import { createStore, type StateCreator, type StoreApi } from 'zustand/vanilla'
import { createJSONStorage, persist } from 'zustand/middleware'
import { readItem, removeItem, tableKey, writeItem } from '../lib/storage'

/**
 * Crea (una sola vez por mesa) un store de Zustand persistido en
 * localStorage bajo "<restaurante>:mesa:<id>:<nombre>". Así cada mesa
 * guarda lo suyo y cerrar la cuenta borra solo esa mesa.
 */
const safeLocalStorage = createJSONStorage(() => ({
  getItem: (k: string) => readItem('local', k),
  setItem: (k: string, v: string) => writeItem('local', k, v),
  removeItem: (k: string) => removeItem('local', k),
}))

export function tableStoreFactory<T extends object>(
  name: string,
  creator: (tableId: string) => StateCreator<T, [], []>,
  version = 1,
) {
  const stores = new Map<string, StoreApi<T>>()

  const get = (tableId: string): StoreApi<T> => {
    let store = stores.get(tableId)
    if (!store) {
      store = createStore<T>()(
        persist(creator(tableId), { name: tableKey(tableId, name), storage: safeLocalStorage, version }),
      )
      stores.set(tableId, store)
    }
    return store
  }

  /** Olvida el store en memoria (después de borrar el almacenamiento de la mesa). */
  const reset = (tableId: string) => {
    stores.delete(tableId)
  }

  return { get, reset }
}

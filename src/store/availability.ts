import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import { persist } from 'zustand/middleware'
import { menu, restaurant } from '../lib/catalog'
import { safeLocalStorage } from './tableStore'

/**
 * Agotados que marca la cocina ("¿Qué se acabó?", P1c). Se guardan en este
 * navegador y se comparten entre pestañas: la cocina marca en una y el menú del
 * cliente, en otra, cambia al instante.
 * - Platos: se aplican sobre `dish.available` del menú (los platos que el JSON
 *   ya trae agotados se pueden volver a activar).
 * - Acompañantes: un acompañante agotado deja de ofrecerse en el detalle, y a
 *   quien ya lo pidió le sale "Se acabó el maduro, ¿lo cambiamos?".
 * API real: GET/PUT /api/agotados, con aviso por WebSocket.
 */
interface AvailabilityState {
  /** id de plato → disponible (solo los que cambió la cocina). */
  dishes: Record<string, boolean>
  /** ids de acompañantes agotados. */
  soldOutSides: string[]
  setDish: (id: string, available: boolean) => void
  setSide: (id: string, available: boolean) => void
}

const KEY = `${restaurant.id}:agotados`
/** Disponibilidad del JSON, para volver a ella. */
const base = new Map(menu.dishes.map((d) => [d.id, d.available]))

export const availabilityStore = createStore<AvailabilityState>()(
  persist(
    (set, get) => ({
      dishes: {},
      soldOutSides: [],
      setDish: (id, available) => {
        const dishes = { ...get().dishes }
        if (available === base.get(id)) delete dishes[id]
        else dishes[id] = available
        set({ dishes })
      },
      setSide: (id, available) => {
        const rest = get().soldOutSides.filter((s) => s !== id)
        set({ soldOutSides: available ? rest : [...rest, id] })
      },
    }),
    { name: KEY, storage: safeLocalStorage, partialize: ({ dishes, soldOutSides }) => ({ dishes, soldOutSides }) },
  ),
)

/** Pasa los cambios de la cocina al menú (dish.available). */
function apply({ dishes }: AvailabilityState) {
  for (const dish of menu.dishes) dish.available = dishes[dish.id] ?? base.get(dish.id) ?? dish.available
}
apply(availabilityStore.getState())
availabilityStore.subscribe(apply)

// Otra pestaña (la cocina) cambió los agotados: se vuelven a leer.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY || e.key === null) void availabilityStore.persist.rehydrate()
  })
}

export const isSideAvailable = (id: string) => !availabilityStore.getState().soldOutSides.includes(id)

/**
 * Para que una pantalla se vuelva a dibujar cuando la cocina cambia un agotado
 * (el menú ya trae el dato al día). Devuelve los acompañantes agotados.
 */
export function useAvailability(): string[] {
  useStore(availabilityStore, (s) => s.dishes)
  return useStore(availabilityStore, (s) => s.soldOutSides)
}

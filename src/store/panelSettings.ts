import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import { persist } from 'zustand/middleware'
import { restaurant } from '../lib/catalog'
import { safeLocalStorage } from './tableStore'

/**
 * Lo que el dueño cambia desde el panel y la mesa y la web respetan al instante
 * (en este navegador, entre pestañas, como los agotados):
 * - promoOn: la promo del día se ve en la web (P4 Promos).
 * - onlyInHours: fuera de horario el menú se ve, pero no deja pedir (P4b).
 * - itemLimit: hasta ordering.maxItemsPerComanda platos por envío (P4b).
 * - closedOn: "Cerrar hoy" (P4 Horarios); guarda la fecha del local (AAAA-MM-DD)
 *   y al día siguiente deja de valer sola.
 * API real: GET/PUT /api/ajustes, con aviso por WebSocket.
 */
interface PanelSettingsState {
  promoOn: boolean
  onlyInHours: boolean
  itemLimit: boolean
  closedOn: string | null
  /** "El mesero acepta el primer pedido" (P4b). */
  waiterAccepts: boolean
  setWaiterAccepts: (on: boolean) => void
  setPromoOn: (on: boolean) => void
  setOnlyInHours: (on: boolean) => void
  setItemLimit: (on: boolean) => void
  setClosedToday: (closed: boolean) => void
}

const KEY = `${restaurant.id}:panel`

/** Fecha de hoy en la zona del local: "2026-11-21". */
export function localDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: restaurant.schedule.timezone }).format(date)
}

export const panelSettingsStore = createStore<PanelSettingsState>()(
  persist(
    (set) => ({
      promoOn: true,
      onlyInHours: true,
      itemLimit: true,
      closedOn: null,
      waiterAccepts: false,
      setWaiterAccepts: (waiterAccepts) => set({ waiterAccepts }),
      setPromoOn: (promoOn) => set({ promoOn }),
      setOnlyInHours: (onlyInHours) => set({ onlyInHours }),
      setItemLimit: (itemLimit) => set({ itemLimit }),
      setClosedToday: (closed) => set({ closedOn: closed ? localDateKey() : null }),
    }),
    {
      name: KEY,
      storage: safeLocalStorage,
      partialize: ({ promoOn, onlyInHours, itemLimit, closedOn, waiterAccepts }) => ({
        promoOn,
        onlyInHours,
        itemLimit,
        closedOn,
        waiterAccepts,
      }),
    },
  ),
)

// El panel, en otra pestaña, cambió algo: se vuelve a leer.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY || e.key === null) void panelSettingsStore.persist.rehydrate()
  })
}

export function usePanelSettings<T>(select: (s: PanelSettingsState) => T): T {
  return useStore(panelSettingsStore, select)
}

/** ¿El dueño cerró el local por hoy? */
export const isClosedToday = (closedOn: string | null, date: Date = new Date()) => closedOn === localDateKey(date)

/** Platos por envío: el de la config, o sin límite si el dueño lo apagó. */
export const itemLimit = (): number =>
  panelSettingsStore.getState().itemLimit ? restaurant.ordering.maxItemsPerComanda : Number.POSITIVE_INFINITY

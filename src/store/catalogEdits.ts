import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import { persist } from 'zustand/middleware'
import type { Dish } from '../types/menu'
import type { ScheduleRange } from '../types/restaurant'
import { menu, restaurant, syncDishIndex } from '../lib/catalog'
import { formatMoney } from '../lib/money'
import { fmt, t } from '../lib/text'
import { safeLocalStorage } from './tableStore'

/**
 * Lo que el dueño agrega o cambia desde el panel y la mesa y la web ven al instante
 * (en este navegador, entre pestañas, como los agotados):
 * - platos nuevos y cambios de los existentes (P4a "Agregar plato");
 * - promos nuevas (Promos "Nueva promo"), cada una con su plato de promo;
 * - mesas nuevas (P4b "Agregar mesa");
 * - el personal y sus PIN (P4c);
 * - el horario (Horarios "Cambiar horario").
 * Se aplica sobre `menu` y `restaurant` (los mismos objetos que leen las pantallas).
 * API real: PUT /api/menu, /api/promos, /api/mesas, /api/personal y /api/horario.
 */

export type DishEdit = Pick<Dish, 'name' | 'category' | 'price' | 'shortDescription' | 'tags'> & {
  description?: string
  image?: string
}

export interface PromoDef {
  id: string
  /** Plato que entra en la promo. */
  dishId: string
  quantity: number
  price: number
  /** "2 enchiladas": el nombre corto, sin el precio. */
  label: string
  /** Días de la semana (0 = domingo). */
  days: number[]
  from: string
  to: string
  /** Solo la web para llevar, o también la mesa. */
  where: 'web' | 'todos'
  on: boolean
}

export type StaffRole = 'cocina' | 'caja' | 'mesero' | 'dueno'

export interface StaffPerson {
  id: string
  name: string
  role: StaffRole
  pin: string
}

interface CatalogEditsState {
  /** Platos agregados desde el panel (completos). */
  addedDishes: Dish[]
  /** Cambios sobre los platos de menu.json. */
  dishEdits: Record<string, DishEdit>
  promos: PromoDef[]
  addedTables: string[]
  /** El personal; null = el de la config (demo.panel.people). */
  people: StaffPerson[] | null
  /** El horario; null = el de la config. */
  schedule: ScheduleRange[] | null
  saveDish: (id: string | null, edit: DishEdit) => string
  removeDish: (id: string) => void
  addPromo: (promo: Omit<PromoDef, 'id' | 'on'>) => void
  setPromoOn: (id: string, on: boolean) => void
  removePromo: (id: string) => void
  addTable: () => string
  removeTable: (mesa: string) => void
  addPerson: (person: Omit<StaffPerson, 'id'>) => void
  setPin: (id: string, pin: string) => void
  /** null = volver al de la config. */
  setSchedule: (ranges: ScheduleRange[] | null) => void
}

const KEY = `${restaurant.id}:catalogo`

/** Lo que venía en los JSON, para volver a armar el menú sobre eso. */
const baseDishes = [...menu.dishes]
const baseCopies = new Map(baseDishes.map((d) => [d.id, { ...d }]))
const baseTables = [...restaurant.tables]
const baseRanges = restaurant.schedule.ranges.map((r) => ({ ...r, days: [...r.days] }))

const newId = () => Math.random().toString(36).slice(2, 8)

export const defaultPeople = (): StaffPerson[] =>
  restaurant.demo.panel.people.map((p, i) => ({ id: `p${i + 1}`, name: p.name, role: p.role as StaffRole, pin: p.pin }))

export const catalogStore = createStore<CatalogEditsState>()(
  persist(
    (set, get) => ({
      addedDishes: [],
      dishEdits: {},
      promos: [],
      addedTables: [],
      people: null,
      schedule: null,
      saveDish: (id, edit) => {
        const added = get().addedDishes
        if (id && added.some((d) => d.id === id)) {
          set({ addedDishes: added.map((d) => (d.id === id ? { ...d, ...edit } : d)) })
          return id
        }
        if (id) {
          set({ dishEdits: { ...get().dishEdits, [id]: edit } })
          return id
        }
        const dish: Dish = { id: `plato-${newId()}`, available: true, ...edit }
        set({ addedDishes: [...added, dish] })
        return dish.id
      },
      removeDish: (id) => set({ addedDishes: get().addedDishes.filter((d) => d.id !== id) }),
      addPromo: (promo) => set({ promos: [...get().promos, { ...promo, id: newId(), on: true }] }),
      setPromoOn: (id, on) => set({ promos: get().promos.map((p) => (p.id === id ? { ...p, on } : p)) }),
      removePromo: (id) => set({ promos: get().promos.filter((p) => p.id !== id) }),
      addTable: () => {
        const all = [...baseTables, ...get().addedTables]
        const next = String(Math.max(0, ...all.map(Number).filter(Number.isFinite)) + 1)
        set({ addedTables: [...get().addedTables, next] })
        return next
      },
      removeTable: (mesa) => set({ addedTables: get().addedTables.filter((m) => m !== mesa) }),
      addPerson: (person) => set({ people: [...(get().people ?? defaultPeople()), { ...person, id: newId() }] }),
      setPin: (id, pin) => set({ people: (get().people ?? defaultPeople()).map((p) => (p.id === id ? { ...p, pin } : p)) }),
      setSchedule: (schedule) => set({ schedule }),
    }),
    {
      name: KEY,
      storage: safeLocalStorage,
      partialize: ({ addedDishes, dishEdits, promos, addedTables, people, schedule }) => ({
        addedDishes,
        dishEdits,
        promos,
        addedTables,
        people,
        schedule,
      }),
    },
  ),
)

/** El plato de una promo nueva (va en Combos, con la etiqueta Promo). */
export const promoDishId = (promo: PromoDef) => `promo-${promo.id}`

function promoDish(promo: PromoDef, base: Dish | undefined): Dish {
  const p = t.staff.panel.promos
  return {
    id: promoDishId(promo),
    name: fmt(p.dishName, { label: promo.label }),
    category: 'combos',
    price: promo.price,
    shortDescription: fmt(p.dishShort, { quantity: promo.quantity, dish: base?.name ?? '' }),
    description: fmt(p.dishDescription, { label: promo.label, price: formatMoney(promo.price) }),
    includes: `${promo.quantity} × ${base?.name ?? ''}`,
    image: base?.image,
    tags: ['promo'],
    extras: base?.extras,
    maxExtras: base?.maxExtras,
    days: promo.days.length === 7 ? undefined : promo.days,
    available: true,
  }
}

/** Objetos estables de los platos agregados (la cocina les cambia `available`). */
const liveDishes = new Map<string, Dish>()
function live(dish: Dish): Dish {
  const current = liveDishes.get(dish.id)
  if (!current) {
    const copy = { ...dish }
    liveDishes.set(dish.id, copy)
    return copy
  }
  const { available, ...rest } = dish
  void available
  return Object.assign(current, rest)
}

/** Listeners que vuelven a aplicar los agotados después de rearmar el menú. */
const afterApply = new Set<() => void>()
export const onCatalogApplied = (fn: () => void) => {
  afterApply.add(fn)
  return () => afterApply.delete(fn)
}

function apply({ addedDishes, dishEdits, promos, addedTables, schedule }: CatalogEditsState) {
  // Platos: los del JSON con sus cambios (sin tocar `available`, que es de la cocina).
  for (const dish of baseDishes) {
    const { available, ...original } = baseCopies.get(dish.id)!
    void available
    Object.assign(dish, original, dishEdits[dish.id] ?? {})
  }
  const extra = [
    ...addedDishes.map(live),
    ...promos.map((p) => live(promoDish(p, baseDishes.find((d) => d.id === p.dishId) ?? addedDishes.find((d) => d.id === p.dishId)))),
  ]
  menu.dishes.splice(0, menu.dishes.length, ...baseDishes, ...extra)
  syncDishIndex()
  restaurant.tables.splice(0, restaurant.tables.length, ...baseTables, ...addedTables)
  restaurant.schedule.ranges.splice(0, restaurant.schedule.ranges.length, ...(schedule ?? baseRanges))
  afterApply.forEach((fn) => fn())
}
apply(catalogStore.getState())
catalogStore.subscribe(apply)

// El panel, en otra pestaña, cambió algo: se vuelve a leer.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY || e.key === null) void catalogStore.persist.rehydrate()
  })
}

export function useCatalog<T>(select: (s: CatalogEditsState) => T): T {
  return useStore(catalogStore, select)
}

/** El personal al día (el de la config si nunca se cambió). */
export const peopleOf = (people: StaffPerson[] | null) => people ?? defaultPeople()

/** Para que una pantalla se vuelva a dibujar cuando el dueño cambia el menú, las mesas o el horario. */
export function useCatalogVersion(): void {
  useStore(catalogStore, (s) => s.addedDishes)
  useStore(catalogStore, (s) => s.dishEdits)
  useStore(catalogStore, (s) => s.promos)
  useStore(catalogStore, (s) => s.addedTables)
  useStore(catalogStore, (s) => s.schedule)
}

/** ¿El plato lo agregó el dueño (se puede borrar)? */
export const isAddedDish = (id: string) => catalogStore.getState().addedDishes.some((d) => d.id === id)
/** ¿Es el plato de una promo nueva (se maneja desde Promos)? */
export const isCreatedPromoDish = (id: string) => catalogStore.getState().promos.some((p) => promoDishId(p) === id)
/** ¿La mesa la agregó el dueño? */
export const isAddedTable = (mesa: string) => catalogStore.getState().addedTables.includes(mesa)

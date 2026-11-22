import { useId } from 'react'
import { useStore } from 'zustand'
import { menu } from '../../lib/catalog'
import { cx } from '../../lib/cx'
import { fmt, t } from '../../lib/text'
import { availabilityStore } from '../../store/availability'
import { useCatalogVersion } from '../../store/catalogEdits'
import { Button } from '../Button'
import { StaffDialog } from './StaffDialog'
import { Switch } from './Switch'

/** Platos en el orden de las categorías del menú (con los que agregó el dueño). */
const dishesInOrder = () => menu.categories.flatMap((c) => menu.dishes.filter((d) => d.category === c.id))

/**
 * P1c "¿Qué se acabó?": un interruptor por plato y por acompañante. Al apagarlo,
 * el menú del cliente lo marca agotado al instante (en las otras pestañas).
 */
export function SoldOutDialog({ onClose }: { onClose: () => void }) {
  const k = t.staff.kitchen
  // Se vuelve a dibujar con cada cambio (el menú ya trae el dato al día).
  const overrides = useStore(availabilityStore, (s) => s.dishes)
  const soldOutSides = useStore(availabilityStore, (s) => s.soldOutSides)
  const { setDish, setSide } = availabilityStore.getState()
  const listId = useId()
  useCatalogVersion()
  const dishes = dishesInOrder()

  const rows = [
    ...dishes.map((d) => ({
      key: `d-${d.id}`,
      name: d.name,
      on: overrides[d.id] ?? d.available,
      set: (v: boolean) => setDish(d.id, v),
    })),
    ...menu.sides.map((s) => ({
      key: `s-${s.id}`,
      name: fmt(k.sideSuffix, { name: s.name }),
      on: !soldOutSides.includes(s.id),
      set: (v: boolean) => setSide(s.id, v),
    })),
  ]

  return (
    <StaffDialog title={k.soldOutTitle} description={k.soldOutBody} onClose={onClose} width={520}>
      <ul id={listId} className="-mx-6 mt-3 min-h-0 flex-1 overflow-y-auto px-6">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-4 py-2">
            <span className={cx('text-dish', r.on ? 'text-texto' : 'text-texto-2')}>{r.name}</span>
            <Switch checked={r.on} onChange={r.set} label={r.name} />
          </li>
        ))}
      </ul>
      <Button block className="mt-3 shrink-0" onClick={onClose}>
        {k.done}
      </Button>
    </StaffDialog>
  )
}

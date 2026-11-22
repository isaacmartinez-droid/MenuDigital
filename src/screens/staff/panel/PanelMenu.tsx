import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Photo } from '../../../components/Photo'
import { Tag } from '../../../components/Tag'
import { Switch } from '../../../components/staff/Switch'
import { menu } from '../../../lib/catalog'
import { cx } from '../../../lib/cx'
import { formatMoney } from '../../../lib/money'
import { fmt, t } from '../../../lib/text'
import type { Dish } from '../../../types/menu'
import { availabilityStore, useAvailability } from '../../../store/availability'
import { isAddedDish, isCreatedPromoDish } from '../../../store/catalogEdits'
import { DishDialog } from './DishDialog'
import { useSavedNote } from './formUtils'
import { PanelCard, PanelHeader, PanelNote } from './parts'

/**
 * P4a Panel · Menú y agotados: cada plato con su foto, la etiqueta, el precio y el
 * interruptor de disponible. Usa los mismos agotados que la cocina: apagarlo acá lo
 * oculta al instante en el teléfono del cliente. "Agregar plato" y el lápiz de cada
 * fila abren la ventana del plato. Los platos de las promos nuevas se manejan en Promos.
 */
export function PanelMenu() {
  const m = t.staff.panel.menu
  // Se vuelve a dibujar con los agotados y con los platos que agrega o cambia el dueño.
  useAvailability()
  const [editing, setEditing] = useState<Dish | 'new' | null>(null)
  const [note, showNote] = useSavedNote()
  const tagOf = (id: string) => menu.tags.find((x) => x.id === id)
  const dishes = menu.dishes.filter((d) => !isCreatedPromoDish(d.id))

  return (
    <>
      <PanelHeader title={m.title} action={m.add} onAction={() => setEditing('new')} />
      {note}
      <PanelCard className="px-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-small font-medium text-texto-2">
              <th scope="col" className="py-3 font-medium">
                {m.columns[0]}
              </th>
              <th scope="col" className="w-[140px] py-3 font-medium">
                {m.columns[1]}
              </th>
              <th scope="col" className="w-[100px] py-3 font-medium">
                {m.columns[2]}
              </th>
              <th scope="col" className="w-[100px] py-3 font-medium">
                {m.columns[3]}
              </th>
              <th scope="col" className="w-12 py-3">
                <span className="sr-only">{m.edit}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {dishes.map((dish) => {
              const tag = dish.tags.map(tagOf).find(Boolean)
              const on = dish.available
              return (
                <tr key={dish.id} className="border-t border-borde">
                  <th scope="row" className="py-2 pr-4 text-left font-normal">
                    <span className="flex items-center gap-3">
                      <Photo src={dish.image} className="size-11 shrink-0 rounded-chico" dimmed={!on} />
                      <span className={cx('text-dish', on ? 'text-texto' : 'text-texto-2')}>{dish.name}</span>
                      {isAddedDish(dish.id) && <Tag tone="contorno">{m.newTag}</Tag>}
                    </span>
                  </th>
                  <td className="py-2 pr-4">
                    {tag ? <Tag tone={tag.tone}>{tag.label}</Tag> : !on && <Tag tone="agotado">{m.soldOut}</Tag>}
                  </td>
                  <td className="py-2 pr-4 text-body text-texto">{formatMoney(dish.price)}</td>
                  <td className="py-2">
                    <Switch
                      checked={on}
                      onChange={(v) => availabilityStore.getState().setDish(dish.id, v)}
                      label={dish.name}
                      stateText={on ? m.available : m.soldOut}
                    />
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => setEditing(dish)}
                      aria-label={fmt(m.editLabel, { name: dish.name })}
                      className="-my-2 grid size-12 place-items-center text-texto-2 hover:text-texto"
                    >
                      <Pencil aria-hidden size={18} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </PanelCard>
      <PanelNote>{m.footnote}</PanelNote>
      {editing && (
        <DishDialog dish={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={showNote} />
      )}
    </>
  )
}

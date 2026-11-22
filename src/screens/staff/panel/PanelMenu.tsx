import { useId, useState } from 'react'
import { Pencil, Search } from 'lucide-react'
import { Photo } from '../../../components/Photo'
import { Tag } from '../../../components/Tag'
import { Switch } from '../../../components/staff/Switch'
import { menu } from '../../../lib/catalog'
import { cx } from '../../../lib/cx'
import { formatMoney } from '../../../lib/money'
import { isPromoDish } from '../../../lib/promo'
import { fmt, t } from '../../../lib/text'
import type { Dish } from '../../../types/menu'
import { availabilityStore, useAvailability } from '../../../store/availability'
import { isAddedDish, useCatalog } from '../../../store/catalogEdits'
import { DishDialog } from './DishDialog'
import { focusPanelAction, inputClass, useSavedNote } from './formUtils'
import { PanelCard, PanelHeader, PanelNote } from './parts'

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/**
 * P4a Panel · Menú y agotados: cada plato con su foto, la etiqueta, el precio y el
 * interruptor de disponible. Usa los mismos agotados que la cocina: apagarlo acá lo
 * oculta al instante en el teléfono del cliente. Se puede buscar y filtrar por
 * categoría. "Agregar plato" y el lápiz de cada fila abren la ventana del plato.
 * Los platos de promo (la del día y las nuevas) se manejan en Promos.
 */
export function PanelMenu() {
  const m = t.staff.panel.menu
  const id = useId()
  // Se vuelve a dibujar con los agotados y con los platos que agrega o cambia el dueño.
  useAvailability()
  useCatalog((s) => s.promos)
  const [editing, setEditing] = useState<Dish | 'new' | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [note, showNote] = useSavedNote()
  const tagOf = (tagId: string) => menu.tags.find((x) => x.id === tagId)
  const q = normalize(query.trim())
  const dishes = menu.dishes.filter(
    (d) =>
      !isPromoDish(d) &&
      (!category || d.category === category) &&
      (!q || normalize(`${d.name} ${d.shortDescription}`).includes(q)),
  )

  return (
    <>
      <PanelHeader title={m.title} action={m.add} onAction={() => setEditing('new')} />
      {note}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={20} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-texto-2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={m.search}
            aria-label={m.search}
            className={cx(inputClass(), 'pl-10')}
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor={`${id}-cat`} className="text-dish text-texto">
            {m.categoryFilter}
          </label>
          <select id={`${id}-cat`} value={category} onChange={(e) => setCategory(e.target.value)} className={cx(inputClass(), 'w-48')}>
            <option value="">{m.allCategories}</option>
            {menu.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="sr-only" role="status">
        {q || category ? fmt(m.count, { n: dishes.length }) : ''}
      </p>
      <PanelCard className="px-4">
        {dishes.length === 0 ? (
          <p className="py-6 text-body text-texto-2">{m.emptyFilter}</p>
        ) : (
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
        )}
      </PanelCard>
      <PanelNote>{m.footnote}</PanelNote>
      {editing && (
        <DishDialog
          dish={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={showNote}
          onDeleted={focusPanelAction}
        />
      )}
    </>
  )
}

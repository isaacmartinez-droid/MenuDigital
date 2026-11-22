import { useId, useState } from 'react'
import { PromoCard } from '../../../components/PromoCard'
import { menu } from '../../../lib/catalog'
import { cx } from '../../../lib/cx'
import { formatMoney } from '../../../lib/money'
import { isPromoDish, promoLabel, shortRange } from '../../../lib/promo'
import { fmt, t } from '../../../lib/text'
import { catalogStore } from '../../../store/catalogEdits'
import { Field, FormDialog } from './form'
import { describedBy, inputClass } from './formUtils'

const WEEK = [1, 2, 3, 4, 5, 6, 0]

/**
 * "Nueva promo" (sin diseño en el Figma; boceto aprobado): plato, cantidad, precio,
 * cómo se llama, días, horario y dónde se ve, con la tarjeta tal como la verá el
 * cliente. Al crearla, aparece en el inicio y el menú (y en la mesa si es "Web y mesa").
 */
export function PromoDialog({ onClose, onSaved }: { onClose: () => void; onSaved: (text: string) => void }) {
  const m = t.staff.panel.promos
  const id = useId()
  const dishes = menu.dishes.filter((d) => !isPromoDish(d) && !d.tags.includes('promo'))
  const [dishId, setDishId] = useState(dishes[0]?.id ?? '')
  const [quantity, setQuantity] = useState(2)
  const [price, setPrice] = useState('')
  const [label, setLabel] = useState<string | null>(null)
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [from, setFrom] = useState('16:00')
  const [to, setTo] = useState('19:00')
  const [where, setWhere] = useState<'web' | 'todos'>('web')
  const [tried, setTried] = useState(false)

  const dish = dishes.find((d) => d.id === dishId)
  const autoLabel = dish ? promoLabel(dish.name, quantity) : ''
  const finalLabel = (label ?? autoLabel).trim()
  const amount = Number(price)
  const normal = (dish?.price ?? 0) * quantity
  const errors = {
    label: !finalLabel ? m.errorLabel : '',
    price: !(amount > 0) ? m.errorPrice : '',
    days: !days.length ? m.errorDays : '',
    hours: !from || !to || to <= from ? m.errorHours : '',
  }
  const show = (key: keyof typeof errors) => (tried ? errors[key] : '')
  const title = fmt(m.cardTitle, { label: finalLabel || '…', price: amount > 0 ? formatMoney(amount) : 'C$ …' })

  const save = () => {
    setTried(true)
    const first = (Object.keys(errors) as (keyof typeof errors)[]).find((k) => errors[k])
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus()
      return false
    }
    catalogStore.getState().addPromo({ dishId, quantity, price: amount, label: finalLabel, days, from, to, where })
    onSaved(fmt(m.created, { title }))
    return true
  }

  const toggleDay = (d: number) => setDays((list) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d]))

  return (
    <FormDialog title={m.newTitle} submitLabel={m.create} onClose={onClose} onSubmit={save}>
      <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-4">
        <Field id={`${id}-dish`} label={m.dish}>
          <select id={`${id}-dish`} value={dishId} onChange={(e) => setDishId(e.target.value)} className={inputClass()}>
            {dishes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {formatMoney(d.price)}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${id}-qty`} label={m.quantity}>
          <select
            id={`${id}-qty`}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className={inputClass()}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field
          id={`${id}-price`}
          label={m.price}
          hint={normal ? fmt(m.normalPrice, { normal: formatMoney(normal), saving: formatMoney(Math.max(0, normal - (amount || normal))) }) : undefined}
          error={show('price')}
        >
          <input
            id={`${id}-price`}
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, '').slice(0, 5))}
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={Boolean(show('price'))}
            aria-describedby={describedBy(`${id}-price`, normal ? 'h' : undefined, show('price'))}
            className={inputClass(Boolean(show('price')))}
          />
        </Field>
        <Field id={`${id}-label`} label={m.label} error={show('label')}>
          <input
            id={`${id}-label`}
            value={label ?? autoLabel}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={30}
            autoComplete="off"
            aria-invalid={Boolean(show('label'))}
            aria-describedby={describedBy(`${id}-label`, undefined, show('label'))}
            className={inputClass(Boolean(show('label')))}
          />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-dish text-texto">{m.days}</legend>
        <div id={`${id}-days`} tabIndex={-1} className="flex flex-wrap gap-2 outline-none">
          {WEEK.map((d) => {
            const on = days.includes(d)
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                aria-label={t.staff.panel.hours.days[d]}
                onClick={() => toggleDay(d)}
                className={cx(
                  'grid size-12 place-items-center rounded-completo border text-dish',
                  on ? 'border-verde bg-verde text-blanco' : 'border-borde bg-tarjeta text-texto',
                )}
              >
                {m.daysShort[d]}
              </button>
            )
          })}
        </div>
        {show('days') && <p className="text-small text-promo">{show('days')}</p>}
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <Field id={`${id}-hours`} label={m.from} error={show('hours')}>
          <input
            id={`${id}-hours`}
            type="time"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-invalid={Boolean(show('hours'))}
            aria-describedby={describedBy(`${id}-hours`, undefined, show('hours'))}
            className={inputClass(Boolean(show('hours')))}
          />
        </Field>
        <Field id={`${id}-to`} label={m.to}>
          <input id={`${id}-to`} type="time" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass()} />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2 text-dish text-texto">{m.where}</legend>
        <div className="flex flex-wrap gap-x-6">
          {(
            [
              ['web', m.whereWeb],
              ['todos', m.whereAll],
            ] as const
          ).map(([value, text]) => (
            <label key={value} className="flex min-h-12 items-center gap-3 text-body text-texto">
              <input
                type="radio"
                name={`${id}-where`}
                value={value}
                checked={where === value}
                onChange={() => setWhere(value)}
                className="size-5 accent-verde"
              />
              {text}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <span className="text-dish text-texto">{m.preview}</span>
        <div aria-hidden className="pointer-events-none">
          <PromoCard
            promo={{
              label: menu.tags.find((x) => x.id === 'promo')?.label ?? '',
              title,
              subtitle: fmt(m.todayRange, { range: from && to ? shortRange(from, to) : '' }),
              hours: { from, to },
              image: dish?.image ?? '',
              dishId,
            }}
            subtitle={fmt(m.todayRange, { range: from && to ? shortRange(from, to) : '' })}
            onClick={() => {}}
          />
        </div>
      </div>
    </FormDialog>
  )
}

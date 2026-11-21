import type { Dish } from '../types/menu'
import { cx } from '../lib/cx'
import { dishTags } from '../lib/catalog'
import { dayBadge, isOnDay } from '../lib/combos'
import { formatMoney } from '../lib/money'
import { fmt, t } from '../lib/text'
import { Photo } from './Photo'
import { Tag } from './Tag'
import { AddButton, QuantityStepper } from './QuantityStepper'

interface DishCardProps {
  dish: Dish
  variant: 'row' | 'carousel'
  /** Cuántos hay de este plato en el pedido actual. */
  quantity: number
  /** false cuando el local está cerrado: no se muestra ni + ni contador. */
  canOrder: boolean
  onAdd: () => void
  onDecrement: () => void
  onOpen: () => void
  /**
   * Día de la semana de hoy (0 = domingo). Con platos atados a días (combos
   * del día) muestra "Combo de hoy" o "Solo los martes" y, fuera de su día, sin +.
   */
  today?: number
}

/** Etiqueta del día y si se puede pedir hoy. */
function dayInfo(dish: Dish, today: number | undefined) {
  if (today === undefined) return { badge: undefined, onDay: true }
  return { badge: dayBadge(dish, today), onDay: isOnDay(dish, today) }
}

/**
 * Plato del menú. Fila para la lista y tarjeta para el carrusel "Los más vendidos".
 * El + agrega con un toque; la foto (y el nombre) abren el detalle.
 */
export function DishCard(props: DishCardProps) {
  return props.variant === 'row' ? <DishRow {...props} /> : <DishTile {...props} />
}

function DishRow({ dish, quantity, canOrder, onAdd, onDecrement, onOpen, today }: DishCardProps) {
  const soldOut = !dish.available
  const { badge, onDay } = dayInfo(dish, today)
  // Con día ("Combo de hoy" / "Solo los martes") esa etiqueta reemplaza a las de la lista.
  const listTags = badge
    ? [{ id: 'dia', ...badge }]
    : dishTags(dish).filter((tag) => tag.showInList)
  const openLabel = fmt(t.menu.openDetail, { dish: dish.name })

  return (
    <article className="flex gap-3 py-3.5" aria-label={dish.name}>
      {soldOut ? (
        <Photo src={dish.image} className="size-24 shrink-0 rounded-tarjeta" dimmed />
      ) : (
        <button type="button" onClick={onOpen} aria-label={openLabel} className="shrink-0 rounded-tarjeta">
          <Photo src={dish.image} className="size-24 rounded-tarjeta" />
        </button>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {listTags.length > 0 && (
          <div className="mb-1 flex flex-wrap gap-1.5">
            {listTags.map((tag) => (
              <Tag key={tag.id} tone={tag.tone}>
                {tag.label}
              </Tag>
            ))}
          </div>
        )}
        <h3 className={cx('text-dish', soldOut ? 'text-texto-2' : 'text-texto')}>
          {soldOut ? (
            dish.name
          ) : (
            <button type="button" onClick={onOpen} className="text-left">
              {dish.name}
            </button>
          )}
        </h3>
        <p className="mt-1 line-clamp-2 text-small text-texto-2">{dish.shortDescription}</p>

        <div className="mt-auto flex min-h-10 items-end justify-between gap-2 pt-1">
          <span className={cx('pb-2 text-price', soldOut ? 'text-texto-2' : 'text-texto')}>
            {formatMoney(dish.price)}
          </span>
          {soldOut ? (
            <Tag tone="agotado" className="mb-2">
              {t.menu.soldOut}
            </Tag>
          ) : canOrder && onDay ? (
            quantity > 0 ? (
              <QuantityStepper
                value={quantity}
                onIncrement={onAdd}
                onDecrement={onDecrement}
                itemName={dish.name}
              />
            ) : (
              <AddButton onClick={onAdd} label={fmt(t.menu.add, { dish: dish.name })} className="mb-1" />
            )
          ) : null}
        </div>
      </div>
    </article>
  )
}

function DishTile({ dish, quantity, canOrder, onAdd, onOpen, today }: DishCardProps) {
  const soldOut = !dish.available
  const { badge, onDay } = dayInfo(dish, today)
  const photoTag = badge ?? dishTags(dish)[0]

  return (
    <article
      className="flex w-[224px] shrink-0 snap-start flex-col rounded-grande border border-borde bg-tarjeta p-2"
      aria-label={dish.name}
    >
      <button
        type="button"
        onClick={onOpen}
        disabled={soldOut}
        aria-label={fmt(t.menu.openDetail, { dish: dish.name })}
        className="relative rounded-tarjeta"
      >
        <Photo src={dish.image} className="h-[152px] w-full rounded-tarjeta" dimmed={soldOut} />
        {photoTag && (
          <Tag tone={photoTag.tone} className="absolute top-2 left-2">
            {photoTag.label}
          </Tag>
        )}
        {quantity > 0 && (
          <span
            className="absolute top-2 right-2 grid h-6 min-w-6 animate-pop-in place-items-center rounded-completo bg-verde px-1.5 text-small font-bold text-blanco"
            aria-label={fmt(t.menu.inOrder, { n: quantity })}
          >
            {quantity}
          </span>
        )}
      </button>
      {/* Nombre y descripción cortada a 2 líneas: tocarlos abre el detalle para leer todo
          (para teclado y lector de pantalla, el botón es la foto). */}
      <div onClick={soldOut ? undefined : onOpen} className={cx('mt-3 px-1', !soldOut && 'cursor-pointer')}>
        <h3 className={cx('truncate text-dish', soldOut ? 'text-texto-2' : 'text-texto')}>{dish.name}</h3>
        <p className="mt-1 line-clamp-2 min-h-[2lh] text-small text-texto-2">{dish.includes ?? dish.shortDescription}</p>
      </div>
      <div className="mt-auto flex min-h-10 items-center justify-between px-1 pt-2 pb-1">
        <span className={cx('text-price', soldOut ? 'text-texto-2' : 'text-texto')}>
          {formatMoney(dish.price)}
        </span>
        {soldOut ? (
          <Tag tone="agotado">{t.menu.soldOut}</Tag>
        ) : (
          canOrder && onDay && <AddButton onClick={onAdd} label={fmt(t.menu.add, { dish: dish.name })} />
        )}
      </div>
    </article>
  )
}

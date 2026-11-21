import type { Dish } from '../types/menu'
import { cx } from '../lib/cx'
import { dishTags } from '../lib/catalog'
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
}

/**
 * Plato del menú. Fila para la lista y tarjeta para el carrusel "Los más vendidos".
 * El + agrega con un toque; la foto (y el nombre) abren el detalle.
 */
export function DishCard(props: DishCardProps) {
  return props.variant === 'row' ? <DishRow {...props} /> : <DishTile {...props} />
}

function DishRow({ dish, quantity, canOrder, onAdd, onDecrement, onOpen }: DishCardProps) {
  const soldOut = !dish.available
  const listTags = dishTags(dish).filter((tag) => tag.showInList)
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
          ) : canOrder ? (
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

function DishTile({ dish, quantity, canOrder, onAdd, onOpen }: DishCardProps) {
  const soldOut = !dish.available
  const photoTag = dishTags(dish)[0]

  return (
    <article
      className="flex w-[167px] shrink-0 snap-start flex-col rounded-grande border border-borde bg-tarjeta p-2"
      aria-label={dish.name}
    >
      <button
        type="button"
        onClick={onOpen}
        disabled={soldOut}
        aria-label={fmt(t.menu.openDetail, { dish: dish.name })}
        className="relative rounded-tarjeta"
      >
        <Photo src={dish.image} className="h-[116px] w-full rounded-tarjeta" dimmed={soldOut} />
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
      <h3 className={cx('mt-3 truncate px-1 text-dish', soldOut ? 'text-texto-2' : 'text-texto')}>
        {dish.name}
      </h3>
      <div className="mt-1 flex min-h-10 items-center justify-between px-1 pb-1">
        <span className={cx('text-price', soldOut ? 'text-texto-2' : 'text-texto')}>
          {formatMoney(dish.price)}
        </span>
        {soldOut ? (
          <Tag tone="agotado">{t.menu.soldOut}</Tag>
        ) : (
          canOrder && <AddButton onClick={onAdd} label={fmt(t.menu.add, { dish: dish.name })} />
        )}
      </div>
    </article>
  )
}

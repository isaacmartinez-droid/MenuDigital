import type { MouseEvent } from 'react'
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
  /** Tarjeta (variant carousel) a todo el ancho de su celda, para grillas (tablet). */
  fluid?: boolean
  /** Alto de la foto de la tarjeta; por defecto 152 px. */
  photoClassName?: string
  /** Foto visible al abrir (primeras del carrusel): se pide ya y con prioridad, no en diferido. */
  eager?: boolean
}

/** Para botones dentro de una tarjeta que ya abre el detalle: evita abrirlo dos veces. */
const only = (fn: () => void) => (e: MouseEvent) => {
  e.stopPropagation()
  fn()
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
  return (
    // Toda la fila abre el detalle (también si está agotado: ahí se ofrecen alternativas).
    // El nombre es el botón para teclado y lector de pantalla; el + no abre el detalle.
    <article
      onClick={onOpen}
      className="flex cursor-pointer gap-3 py-3.5 transition-opacity duration-150 active:opacity-70"
      aria-label={dish.name}
    >
      <Photo src={dish.image} className="size-24 shrink-0 rounded-tarjeta" dimmed={soldOut} />

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
          <button type="button" onClick={only(onOpen)} className="text-left">
            {dish.name}
          </button>
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
            <span onClick={(e) => e.stopPropagation()}>
              {quantity > 0 ? (
                <QuantityStepper value={quantity} onIncrement={onAdd} onDecrement={onDecrement} itemName={dish.name} />
              ) : (
                <AddButton onClick={onAdd} label={fmt(t.menu.add, { dish: dish.name })} className="mb-1" />
              )}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function DishTile({ dish, quantity, canOrder, onAdd, onOpen, today, fluid, photoClassName, eager }: DishCardProps) {
  const soldOut = !dish.available
  const { badge, onDay } = dayInfo(dish, today)
  const photoTag = badge ?? dishTags(dish)[0]

  return (
    // Toda la tarjeta abre el detalle; la foto es el botón para teclado y lector de pantalla.
    <article
      onClick={onOpen}
      className={cx(
        'flex cursor-pointer flex-col rounded-grande border border-borde bg-tarjeta p-2 transition-opacity duration-150 active:opacity-80',
        fluid ? 'w-full' : 'w-[224px] shrink-0 snap-start',
      )}
      aria-label={dish.name}
    >
      <button
        type="button"
        onClick={only(onOpen)}
        aria-label={fmt(t.menu.openDetail, { dish: dish.name })}
        className="relative rounded-tarjeta"
      >
        <Photo
          src={dish.image}
          className={cx('w-full rounded-tarjeta', photoClassName ?? 'h-[152px]')}
          dimmed={soldOut}
          eager={eager}
        />
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
      {/* Nombre y "qué trae" cortado a 2 líneas: tocar la tarjeta abre el detalle para leer todo. */}
      <div className="mt-3 px-1">
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
          canOrder &&
          onDay && (
            <span onClick={(e) => e.stopPropagation()}>
              <AddButton onClick={onAdd} label={fmt(t.menu.add, { dish: dish.name })} />
            </span>
          )
        )}
      </div>
    </article>
  )
}

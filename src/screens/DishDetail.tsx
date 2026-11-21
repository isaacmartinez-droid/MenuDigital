import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { ChevronLeft, Star, X } from 'lucide-react'
import type { Dish } from '../types/menu'
import { Photo } from '../components/Photo'
import { Tag } from '../components/Tag'
import { ChoiceRow, GroupHeader } from '../components/ChoiceRow'
import { AddButton, QuantityStepper } from '../components/QuantityStepper'
import { BottomDock } from '../components/CartBar'
import { Button } from '../components/Button'
import { StarRating } from '../components/StarRating'
import { Toast } from '../components/Toast'
import {
  dishesByCategory,
  dishExtras,
  dishSides,
  dishTags,
  getDish,
  getSide,
  menu,
  restaurant,
  unitPrice,
} from '../lib/catalog'
import { formatMoney, formatMoneyDelta } from '../lib/money'
import { fmt, t } from '../lib/text'
import { useOpenState } from '../lib/useOpenState'
import { combosFor, dayBadge, daysLabel, isOnDay, useToday } from '../lib/combos'
import { reviewsFor } from '../lib/reviews'
import { useGoBack } from '../lib/useGoBack'
import { paths, useMesa } from '../lib/useMesa'
import { isTakeout } from '../lib/channel'
import { cx } from '../lib/cx'
import { cartStore } from '../store/cart'
import { useUi } from '../store/ui'

/**
 * Dos alternativas para un plato que hoy no se puede pedir: para un combo de
 * otro día, los combos de hoy; para un agotado, platos de su misma categoría.
 * Si no alcanza, se completa con los más vendidos.
 */
function alternativesFor(dish: Dish, today: number): Dish[] {
  const orderable = (d: Dish) => d.id !== dish.id && d.available && isOnDay(d, today)
  const pool = isOnDay(dish, today) ? dishesByCategory(dish.category) : combosFor(today)
  const picks = pool.filter(orderable)
  const fill = menu.bestSellers
    .map(getDish)
    .filter((d): d is Dish => Boolean(d) && orderable(d as Dish) && !picks.some((p) => p.id === d?.id))
  return [...picks, ...fill].slice(0, 2)
}

/**
 * Web: el detalle se abre encima del menú. En celular ocupa toda la pantalla
 * (se ve igual que en la mesa); en tablet (T3) es una ventana centrada sobre el
 * menú oscurecido, que se cierra con la ✕, tocando afuera o con Esc.
 */
function WebDetailFrame({ onClose, labelledBy, children }: { onClose: () => void; labelledBy: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })
  useEffect(() => {
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  }, [])
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) close.current()
      }}
      className="fixed inset-0 z-50 animate-fade-in overflow-y-auto bg-fondo outline-none tablet:bg-texto/50 tablet:px-6 tablet:py-[120px] desktop:flex desktop:items-center desktop:justify-center desktop:py-10"
    >
      {children}
    </div>
  )
}

/**
 * M2 Detalle del plato (pantalla con scroll y barra fija abajo).
 * Con ?linea=<id> edita una línea del pedido (desde "Con gallo pinto · cambiar").
 */
export function DishDetail() {
  const mesa = useMesa()
  const takeout = isTakeout(mesa)
  const navigate = useNavigate()
  const { dishId = '' } = useParams()
  const [search] = useSearchParams()
  const dish = getDish(dishId)
  const editingId = search.get('linea')
  const editing = editingId ? cartStore(mesa).getState().items.find((i) => i.lineId === editingId) : undefined
  const goBack = useGoBack(editing ? paths.order(mesa) : paths.menu(mesa))
  const openState = useOpenState()
  const today = useToday()
  const sideGroup = useId()
  const extrasGroup = useId()
  const noteId = useId()
  const titleId = useId()

  const [sideId, setSideId] = useState<string | undefined>(() => editing?.sideId ?? dish?.defaultSide)
  const [extraIds, setExtraIds] = useState<string[]>(() => editing?.extraIds ?? [])
  const [note, setNote] = useState(() => editing?.note ?? '')
  const [quantity, setQuantity] = useState(() => editing?.quantity ?? 1)
  const [limitHit, setLimitHit] = useState(false)

  useEffect(() => {
    if (!limitHit) return
    const id = window.setTimeout(() => setLimitHit(false), restaurant.timings.undoToastMs)
    return () => window.clearTimeout(id)
  }, [limitHit])

  if (!dish) {
    return (
      <main className="app-shell px-4 pt-6">
        <button type="button" onClick={goBack} className="text-body font-semibold text-verde">
          {t.common.back}
        </button>
        <p className="mt-4 text-body text-texto-2">{t.detail.notFound}</p>
      </main>
    )
  }

  const sides = dishSides(dish)
  const extras = dishExtras(dish)
  const maxExtras = dish.maxExtras ?? extras.length
  const extrasFull = extraIds.length >= maxExtras
  const tag = dayBadge(dish, today) ?? dishTags(dish)[0]
  const total = unitPrice(dish, extraIds) * quantity
  const onDay = isOnDay(dish, today)
  const canAdd = dish.available && openState.open && onDay
  // Reseñas de menu.json más las que dejan los clientes al pagar (promedio recalculado).
  const { written: reviews, rating } = reviewsFor(dish)
  // Agotado o combo de otro día: en vez del formulario, el motivo y dos alternativas.
  const unavailable = !dish.available || !onDay
  const alternatives = unavailable ? alternativesFor(dish, today) : []
  const notePlaceholder =
    menu.categories.find((c) => c.id === dish.category)?.notePlaceholder ?? t.detail.notePlaceholder

  const quickAddAlternative = (alt: Dish) => {
    const result = cartStore(mesa).getState().quickAdd(alt.id)
    if (!result.ok) {
      setLimitHit(true)
      return
    }
    const side = getSide(alt.defaultSide)
    useUi.getState().setFlash({
      lineId: result.lineId,
      title: fmt(t.menu.added, { dish: alt.name }),
      body: side ? fmt(t.menu.addedWithSide, { side: side.name.toLowerCase() }) : t.menu.addedPlain,
    })
    navigate(paths.menu(mesa))
  }

  const toggleExtra = (id: string) =>
    setExtraIds((current) => (current.includes(id) ? current.filter((e) => e !== id) : [...current, id]))

  const submit = () => {
    const line = { dishId: dish.id, quantity, sideId, extraIds, note }
    const cart = cartStore(mesa).getState()
    const result = editing ? cart.replaceLine(editing.lineId, line) : cart.add(line)
    if (!result.ok) {
      setLimitHit(true)
      return
    }
    if (!editing) {
      const side = getSide(sideId)
      useUi.getState().setFlash({
        lineId: result.lineId,
        title: fmt(t.menu.added, { dish: dish.name }),
        body: side ? fmt(t.menu.addedWithSide, { side: side.name.toLowerCase() }) : t.menu.addedPlain,
      })
    }
    goBack()
  }

  const page = (
    <div
      className={cx(
        'app-shell',
        takeout && 'tablet:max-w-[640px] tablet:overflow-hidden tablet:rounded-grande tablet:bg-tarjeta',
        // D3 (computadora): ventana horizontal, la foto a la izquierda y las opciones a la derecha.
        takeout && 'desktop:flex desktop:h-[660px] desktop:max-w-[900px]',
      )}
    >
      <div className="relative desktop:w-[380px] desktop:shrink-0">
        <Photo
          src={dish.image}
          alt={fmt(t.detail.photoAlt, { dish: dish.name })}
          size="full"
          eager
          dimmed={unavailable}
          className="h-[280px] w-full tablet:h-[260px] desktop:h-full"
        />
        <button
          type="button"
          onClick={goBack}
          aria-label={takeout ? t.common.close : t.common.back}
          className="absolute top-3 left-4 grid size-10 place-items-center rounded-completo bg-tarjeta text-texto shadow-sm"
        >
          {takeout ? (
            <>
              <ChevronLeft size={24} strokeWidth={2} aria-hidden className="tablet:hidden" />
              <X size={20} strokeWidth={2} aria-hidden className="hidden tablet:block" />
            </>
          ) : (
            <ChevronLeft size={24} strokeWidth={2} aria-hidden />
          )}
        </button>
      </div>

      <div className="desktop:flex desktop:min-w-0 desktop:flex-1 desktop:flex-col">
        <main className="rounded-t-grande bg-tarjeta px-4 pt-4 pb-32 tablet:rounded-none tablet:px-6 tablet:pt-6 tablet:pb-6 desktop:min-h-0 desktop:flex-1 desktop:overflow-y-auto">
          <div className="flex min-h-6 items-center justify-between gap-3">
            <div>
              {!dish.available ? (
                <Tag tone="agotado">{t.menu.soldOut}</Tag>
              ) : (
                tag && <Tag tone={tag.tone}>{tag.label}</Tag>
              )}
            </div>
            <p className="text-section text-texto">{formatMoney(dish.price)}</p>
          </div>
          <h1 id={titleId} className="mt-1 text-title text-texto">
            {dish.name}
          </h1>
          {rating && (
            <p
              className="mt-1 inline-flex items-center gap-1 text-small text-texto-2"
              aria-label={fmt(t.detail.ratingLabel, {
                avg: rating.average.toFixed(1),
                n: rating.count,
                word: rating.count === 1 ? t.detail.reviewOne : t.detail.reviewMany,
              })}
            >
              <Star size={14} strokeWidth={0} aria-hidden className="fill-ambar" />
              <span aria-hidden>{fmt(t.detail.ratingShort, { avg: rating.average.toFixed(1), n: rating.count })}</span>
            </p>
          )}
          {dish.description && <p className="mt-2 text-body text-texto-2">{dish.description}</p>}

          {unavailable && (
            <section className="mt-4 rounded-grande bg-fondo px-3.5 pt-3 pb-3" aria-labelledby={`${noteId}-u`}>
              <p id={`${noteId}-u`} className="text-dish text-texto">
                {!dish.available ? t.detail.unavailableSoldOut : fmt(t.detail.unavailableDay, { days: daysLabel(dish.days ?? []) })}
                {alternatives.length > 0 && (
                  <span className="font-normal text-texto-2">
                    {' '}
                    {!dish.available ? t.detail.alternativesSoldOut : t.detail.alternativesDay}
                  </span>
                )}
              </p>
              {alternatives.length > 0 && (
                <ul className="mt-2.5 space-y-2">
                  {alternatives.map((alt) => (
                    <li key={alt.id} className="flex items-center gap-3 rounded-tarjeta border border-borde bg-tarjeta p-2">
                      <button
                        type="button"
                        onClick={() => navigate(paths.dish(mesa, alt.id), { replace: true })}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <Photo src={alt.image} className="size-12 shrink-0 rounded-chico" />
                        <span className="min-w-0">
                          <span className="block truncate text-dish text-texto">{alt.name}</span>
                          <span className="block text-small text-texto-2">{formatMoney(alt.price)}</span>
                        </span>
                      </button>
                      {openState.open && (
                        <AddButton onClick={() => quickAddAlternative(alt)} label={fmt(t.menu.add, { dish: alt.name })} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {dish.includes && (
            <section className="mt-4">
              <h2 className="text-dish text-texto">{t.detail.whatComes}</h2>
              <p className="mt-1 text-body text-texto">{dish.includes}</p>
            </section>
          )}

          {!unavailable && sides.length > 0 && (
            <fieldset className="mt-4" aria-labelledby={`${sideGroup}-t`}>
              <GroupHeader id={`${sideGroup}-t`} title={t.detail.side} rule={t.detail.sideRule} />
              <div className="mt-1">
                {sides.map((side) => (
                  <ChoiceRow
                    key={side.id}
                    type="radio"
                    name={sideGroup}
                    value={side.id}
                    checked={sideId === side.id}
                    onChange={() => setSideId(side.id)}
                    label={side.name}
                    aside={side.id === dish.defaultSide ? t.detail.defaultSide : undefined}
                  />
                ))}
              </div>
            </fieldset>
          )}

          {!unavailable && extras.length > 0 && (
            <fieldset className="mt-3" aria-labelledby={`${extrasGroup}-t`} aria-describedby={`${extrasGroup}-d`}>
              <GroupHeader
                id={`${extrasGroup}-t`}
                title={t.detail.extras}
                rule={fmt(t.detail.extrasRule, { max: maxExtras })}
              />
              <div className="mt-1">
                {extras.map((extra) => {
                  const checked = extraIds.includes(extra.id)
                  return (
                    <ChoiceRow
                      key={extra.id}
                      type="checkbox"
                      name={extrasGroup}
                      value={extra.id}
                      checked={checked}
                      disabled={!checked && extrasFull}
                      onChange={() => toggleExtra(extra.id)}
                      label={extra.name}
                      aside={formatMoneyDelta(extra.price)}
                    />
                  )
                })}
              </div>
              <p id={`${extrasGroup}-d`} role="status" className="px-3 text-small text-texto-2">
                {extrasFull && extras.length > maxExtras ? fmt(t.detail.extrasFull, { max: maxExtras }) : ''}
              </p>
            </fieldset>
          )}

          {!unavailable && (
            <div className="mt-3.5">
              <label htmlFor={noteId} className="block text-dish text-texto">
                {t.detail.note}
              </label>
              <input
                id={noteId}
                type="text"
                value={note}
                maxLength={120}
                enterKeyHint="done"
                onChange={(e) => setNote(e.target.value)}
                placeholder={notePlaceholder}
                aria-describedby={`${noteId}-h`}
                className="mt-2 h-12 w-full rounded-tarjeta border border-borde bg-tarjeta px-3.5 text-body text-texto placeholder:text-texto-2"
              />
              <p id={`${noteId}-h`} className="mt-2.5 text-small text-texto-2">
                {t.detail.noteHelp}
              </p>
            </div>
          )}

          {/* Reseñas con comentario: solo si hay (las de solo estrellas suman al promedio de arriba). */}
          {reviews.length > 0 && (
            <section className="mt-4 border-t border-borde pt-4" aria-labelledby={`${noteId}-r`}>
              <div className="flex items-center justify-between gap-3">
                <h2 id={`${noteId}-r`} className="text-dish text-texto">
                  {t.detail.reviews}
                </h2>
                {rating && (
                  <span className="flex items-center gap-2">
                    <span className="text-small text-texto-2">
                      {fmt(t.detail.reviewsCount, {
                        avg: rating.average.toFixed(1),
                        n: rating.count,
                        word: rating.count === 1 ? t.detail.reviewOne : t.detail.reviewMany,
                      })}
                    </span>
                    <StarRating value={rating.average} label={t.detail.reviews} size={18} />
                  </span>
                )}
              </div>
              <ul className="mt-3 space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-tarjeta bg-fondo px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-small font-semibold text-texto">{r.author}</span>
                      <StarRating value={r.rating} label={r.author} size={14} />
                    </div>
                    <p className="mt-1 text-small text-texto">{r.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>

        {limitHit && (
          <div className="fixed inset-x-0 bottom-24 z-40 app-shell px-4">
            <Toast
              tone="aviso"
              title={t.order.limitTitle}
              body={fmt(t.order.limitBody, { max: restaurant.ordering.maxItemsPerComanda })}
            />
          </div>
        )}

        {/* En la ventana de tablet la barra va al pie de la ventana, no fija abajo de la pantalla. */}
        <BottomDock className={takeout ? 'tablet:static tablet:max-w-none' : undefined}>
          <div className="flex items-center gap-3 py-1">
            {canAdd ? (
              <>
                <QuantityStepper
                  value={quantity}
                  min={1}
                  max={restaurant.ordering.maxItemsPerComanda}
                  onIncrement={() => setQuantity((q) => q + 1)}
                  onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
                  itemName={dish.name}
                  size="md"
                />
                <button
                  type="button"
                  onClick={submit}
                  className="focus-on-dark h-[52px] flex-1 rounded-grande bg-verde px-4 text-button text-blanco transition-transform duration-150 active:scale-[0.98]"
                >
                  {fmt(editing ? t.detail.save : t.detail.add, { total: formatMoney(total) })}
                </button>
              </>
            ) : unavailable ? (
              <Button block variant="secondary" onClick={() => navigate(paths.menu(mesa))}>
                {t.detail.seeMenu}
              </Button>
            ) : (
              <button
                type="button"
                disabled
                className="h-[52px] flex-1 rounded-grande bg-foto-vacia text-button text-texto-2"
              >
                {fmt(t.closed.button, { open: openState.opensAt ?? '' })}
              </button>
            )}
          </div>
        </BottomDock>
      </div>
    </div>
  )

  return takeout ? (
    <WebDetailFrame onClose={goBack} labelledBy={titleId}>
      {page}
    </WebDetailFrame>
  ) : (
    page
  )
}

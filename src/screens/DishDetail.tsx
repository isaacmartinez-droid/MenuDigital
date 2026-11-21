import { useEffect, useId, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { Photo } from '../components/Photo'
import { Tag } from '../components/Tag'
import { ChoiceRow, GroupHeader } from '../components/ChoiceRow'
import { QuantityStepper } from '../components/QuantityStepper'
import { BottomDock } from '../components/CartBar'
import { StarRating } from '../components/StarRating'
import { Toast } from '../components/Toast'
import { dishExtras, dishSides, dishTags, getDish, getSide, restaurant, unitPrice } from '../lib/catalog'
import { formatMoney, formatMoneyDelta } from '../lib/money'
import { fmt, t } from '../lib/text'
import { useOpenState } from '../lib/useOpenState'
import { useGoBack } from '../lib/useGoBack'
import { paths, useMesa } from '../lib/useMesa'
import { cartStore } from '../store/cart'
import { useUi } from '../store/ui'

/**
 * M2 Detalle del plato (pantalla con scroll y barra fija abajo).
 * Con ?linea=<id> edita una línea del pedido (desde "Con gallo pinto · cambiar").
 */
export function DishDetail() {
  const mesa = useMesa()
  const { dishId = '' } = useParams()
  const [search] = useSearchParams()
  const dish = getDish(dishId)
  const editingId = search.get('linea')
  const editing = editingId ? cartStore(mesa).getState().items.find((i) => i.lineId === editingId) : undefined
  const goBack = useGoBack(editing ? paths.order(mesa) : paths.menu(mesa))
  const openState = useOpenState()
  const sideGroup = useId()
  const extrasGroup = useId()
  const noteId = useId()

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
  const tag = dishTags(dish)[0]
  const total = unitPrice(dish, extraIds) * quantity
  const canAdd = dish.available && openState.open
  const reviews = dish.reviews ?? []

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

  return (
    <div className="app-shell">
      <div className="relative">
        <Photo
          src={dish.image}
          alt={fmt(t.detail.photoAlt, { dish: dish.name })}
          eager
          dimmed={!dish.available}
          className="h-[280px] w-full"
        />
        <button
          type="button"
          onClick={goBack}
          aria-label={t.common.back}
          className="absolute top-3 left-4 grid size-10 place-items-center rounded-completo bg-tarjeta text-texto shadow-sm"
        >
          <ChevronLeft size={24} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <main className="rounded-t-grande bg-tarjeta px-4 pt-4 pb-32">
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
        <h1 className="mt-1 text-title text-texto">{dish.name}</h1>
        {dish.description && <p className="mt-4 text-body text-texto-2">{dish.description}</p>}

        {dish.includes && (
          <section className="mt-4">
            <h2 className="text-dish text-texto">{t.detail.whatComes}</h2>
            <p className="mt-4 text-body text-texto">{dish.includes}</p>
          </section>
        )}

        {sides.length > 0 && (
          <fieldset className="mt-4" aria-labelledby={`${sideGroup}-t`}>
            <GroupHeader
              id={`${sideGroup}-t`}
              title={t.detail.side}
              rule={t.detail.sideRule}
              badge={<Tag tone="oscuro">{t.detail.required}</Tag>}
            />
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

        {extras.length > 0 && (
          <fieldset className="mt-3" aria-labelledby={`${extrasGroup}-t`} aria-describedby={`${extrasGroup}-d`}>
            <GroupHeader
              id={`${extrasGroup}-t`}
              title={t.detail.extras}
              rule={fmt(t.detail.extrasRule, { max: maxExtras })}
              badge={<Tag tone="contorno">{t.detail.optional}</Tag>}
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
            placeholder={t.detail.notePlaceholder}
            aria-describedby={`${noteId}-h`}
            className="mt-2 h-12 w-full rounded-tarjeta border border-borde bg-tarjeta px-3.5 text-body text-texto placeholder:text-texto-2"
          />
          <p id={`${noteId}-h`} className="mt-2.5 text-small text-texto-2">
            {t.detail.noteHelp}
          </p>
        </div>

        <section className="mt-4 border-t border-borde pt-4" aria-labelledby={`${noteId}-r`}>
          <div className="flex items-center justify-between gap-3">
            <h2 id={`${noteId}-r`} className="text-dish text-texto">
              {t.detail.reviews}
            </h2>
            <span className="flex items-center gap-2">
              {dish.rating && (
                <span className="text-small text-texto-2">
                  {fmt(t.detail.reviewsCount, { avg: dish.rating.average.toFixed(1), n: dish.rating.count })}
                </span>
              )}
              <StarRating value={dish.rating?.average ?? 0} label={t.detail.reviews} size={18} />
            </span>
          </div>
          {reviews.length === 0 ? (
            <p className="mt-4 text-small text-texto-2">{t.detail.noReviews}</p>
          ) : (
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
          )}
        </section>
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

      <BottomDock>
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
          ) : (
            <button
              type="button"
              disabled
              className="h-[52px] flex-1 rounded-grande bg-foto-vacia text-button text-texto-2"
            >
              {!dish.available ? t.menu.soldOut : fmt(t.closed.button, { open: openState.opensAt ?? '' })}
            </button>
          )}
        </div>
      </BottomDock>
    </div>
  )
}

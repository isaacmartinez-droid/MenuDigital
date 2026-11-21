import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router'
import type { CartItem } from '../types/order'
import type { Dish } from '../types/menu'
import { PageHeader } from '../components/Header'
import { Photo } from '../components/Photo'
import { AddButton, QuantityStepper } from '../components/QuantityStepper'
import { BottomDock, DockSpacer } from '../components/CartBar'
import { Button } from '../components/Button'
import { Toast } from '../components/Toast'
import { NoticeBanner } from '../components/NoticeBanner'
import { BottomSheet } from '../components/BottomSheet'
import { ChevronRight, Clock, CupSoda, Pencil, Plus, ReceiptText, X } from 'lucide-react'
import { useComandas } from '../store/comandas'
import { getDish, getExtra, getSide, menu, restaurant } from '../lib/catalog'
import { formatMoney } from '../lib/money'
import { fmt, platos, t, tableLabel } from '../lib/text'
import { customerLabel, submitCart } from '../lib/orderFlow'
import { newId } from '../lib/storage'
import { useOnline } from '../lib/useOnline'
import { useGoBack } from '../lib/useGoBack'
import { useOpenState } from '../lib/useOpenState'
import { paths, useMesa } from '../lib/useMesa'
import { isTakeout } from '../lib/channel'
import { cartStore, cartTotal, countItems, lineTotal, useCart } from '../store/cart'

type Notice = { kind: 'limit' | 'error'; key: string }

/**
 * M3 Tu pedido: platos, nombre opcional, bebidas sugeridas y "Enviar a la cocina".
 * W4 (para llevar): sin nombre ni cuenta de mesa (los datos van en W5) y con
 * "Continuar" en lugar de enviar.
 */
export function Order() {
  const mesa = useMesa()
  const takeout = isTakeout(mesa)
  const navigate = useNavigate()
  const goBack = useGoBack(paths.menu(mesa))
  const items = useCart(mesa, (s) => s.items)
  const customerName = useCart(mesa, (s) => s.customerName)
  const kitchenNote = useCart(mesa, (s) => s.kitchenNote)
  // Lo que la mesa ya pidió antes (misma cuenta, todavía sin pagar).
  const accountSoFar = useComandas(mesa, (s) => s.comandas.reduce((sum, c) => sum + c.total, 0))
  const pendingSend = useCart(mesa, (s) => s.pendingSend)
  const openState = useOpenState()
  const online = useOnline()
  const nameId = useId()
  const [skipName, setSkipName] = useState(false)
  const [sending, setSending] = useState(false)
  const [confirming, setConfirming] = useState(false)
  // Platos con nota: los que la tenían al entrar siguen visibles aunque se borre el texto
  // escribiendo (para no perder el campo a mitad de la edición); la ✕ los quita.
  const [shownNoteIds, setShownNoteIds] = useState<string[]>(() =>
    cartStore(mesa).getState().items.filter((i) => i.note).map((i) => i.lineId),
  )
  const notedLines = items.filter((i) => i.note || shownNoteIds.includes(i.lineId))
  /** true mientras el campo de la nota tiene el foco; al salir, una nota escrita se ve guardada. */
  const [editingNote, setEditingNote] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), restaurant.timings.undoToastMs)
    return () => window.clearTimeout(id)
  }, [notice])

  const cart = () => cartStore(mesa).getState()
  const total = cartTotal(items)
  const drinks = menu.suggestedDrinks.map(getDish).filter((d): d is Dish => Boolean(d?.available))
  // Si ya hay una bebida en el pedido, no se insiste con la sugerencia.
  const drinkCategories = new Set(drinks.map((d) => d.category))
  const showDrinks = drinks.length > 0 && !items.some((i) => drinkCategories.has(getDish(i.dishId)?.category ?? ''))

  const changeQuantity = (line: CartItem, quantity: number) => {
    const result = cart().setLineQuantity(line.lineId, quantity)
    if (!result.ok) setNotice({ kind: 'limit', key: newId() })
  }
  const addDrink = (dish: Dish) => {
    const result = cart().quickAdd(dish.id)
    if (!result.ok && result.reason === 'limit') setNotice({ kind: 'limit', key: newId() })
  }

  const send = async () => {
    if (sending) return
    setSending(true)
    const result = await submitCart(mesa)
    setSending(false)
    if (result.ok) {
      navigate(paths.tracking(mesa, result.comanda.id), { replace: true })
      return
    }
    setConfirming(false)
    if (result.reason === 'limit') setNotice({ kind: 'limit', key: newId() })
    else if (result.reason === 'server') setNotice({ kind: 'error', key: newId() })
    // 'offline': el carrito queda marcado y se muestra el aviso de señal.
  }

  return (
    <div className="app-shell">
      <PageHeader title={t.order.title} subtitle={takeout ? t.web.place : tableLabel(mesa)} onBack={goBack} />

      <main className="px-4">
        {(pendingSend || !online) && (
          <NoticeBanner tone="aviso" role="status" title={t.offline.title} body={t.offline.body} className="mb-3" />
        )}
        {notice && (
          <Toast
            key={notice.key}
            tone="aviso"
            className="mb-3"
            title={notice.kind === 'limit' ? t.order.limitTitle : t.order.errorTitle}
            body={
              notice.kind === 'limit'
                ? fmt(t.order.limitBody, { max: restaurant.ordering.maxItemsPerComanda })
                : t.order.errorBody
            }
          />
        )}

        {items.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-body text-texto-2">{t.order.empty}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(paths.menu(mesa))}>
              {t.order.emptyCta}
            </Button>
          </div>
        ) : (
          <>
            {/* Lo que la mesa ya pidió antes y cómo queda la cuenta con este pedido; abre la cuenta. */}
            {accountSoFar > 0 && !takeout && (
              <button
                type="button"
                onClick={() => navigate(paths.bill(mesa))}
                className="mb-3 flex w-full items-center gap-2.5 rounded-tarjeta bg-verde-suave px-3 py-2.5 text-left text-small text-verde"
              >
                <ReceiptText size={18} strokeWidth={2} aria-hidden className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {fmt(t.order.accountOpen, { total: formatMoney(accountSoFar) })}
                  </span>
                  <span className="block text-texto">
                    {fmt(t.order.accountWithThis, { total: formatMoney(accountSoFar + total) })}
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold">
                  {t.order.accountSee}
                  <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
                </span>
              </button>
            )}

            <section aria-labelledby="tus-platos">
              <h2 id="tus-platos" className="text-dish text-texto">
                {fmt(t.order.dishesTitle, { n: countItems(items) })}
              </h2>
              <ul className="mt-2 divide-y divide-borde rounded-grande border border-borde bg-tarjeta px-3">
                {items.map((line) => (
                  <OrderLine
                    key={line.lineId}
                    line={line}
                    onQuantity={(q) => changeQuantity(line, q)}
                    onChangeSide={() => navigate(paths.editLine(mesa, line.dishId, line.lineId))}
                  />
                ))}
              </ul>

              {/* Volver al menú con este mismo pedido abierto (lo agregado se suma acá). */}
              {openState.open && (
                <button
                  type="button"
                  onClick={goBack}
                  className="mt-1 -mb-2 inline-flex min-h-12 items-center gap-2 text-dish text-verde"
                >
                  <Plus size={20} strokeWidth={2.25} aria-hidden />
                  {t.order.addMore}
                </button>
              )}
            </section>

            {showDrinks && (
              <section className="mt-5" aria-labelledby="bebidas">
                <h2 id="bebidas" className="text-dish text-texto">
                  {t.order.drinks}
                </h2>
                <div className="mt-2 grid grid-cols-2 items-start gap-[9px]">
                  {drinks.map((drink) => (
                    <div
                      key={drink.id}
                      className="flex items-center gap-2 rounded-grande border border-borde bg-tarjeta p-2"
                    >
                      {drink.image ? (
                        <Photo src={drink.image} className="size-10 shrink-0 rounded-chico" />
                      ) : (
                        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-chico bg-verde-suave text-verde">
                          <CupSoda size={20} strokeWidth={2} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1 text-small">
                        <p className="text-texto">{drink.name}</p>
                        <p className="text-texto-2">{formatMoney(drink.price)}</p>
                      </div>
                      {openState.open && (
                        <AddButton onClick={() => addDrink(drink)} label={fmt(t.menu.add, { dish: drink.name })} />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!takeout && (
              <section className="mt-5" aria-labelledby={`${nameId}-t`}>
                <h2 id={`${nameId}-t`} className="text-dish text-texto">
                  {t.order.nameTitle}
                </h2>
                {skipName && !customerName ? (
                  <p className="mt-2 text-small text-texto-2">
                    {fmt(t.order.anonymous, { device: customerLabel('') })}{' '}
                    <button type="button" onClick={() => setSkipName(false)} className="font-semibold text-verde underline">
                      {t.order.addName}
                    </button>
                  </p>
                ) : (
                  <>
                    <div className="mt-2 flex h-12 items-center rounded-tarjeta border border-borde bg-tarjeta has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-verde">
                      <input
                        id={nameId}
                        type="text"
                        value={customerName}
                        onChange={(e) => cart().setCustomerName(e.target.value)}
                        placeholder={t.order.namePlaceholder}
                        aria-label={t.order.nameLabel}
                        aria-describedby={`${nameId}-h`}
                        autoComplete="given-name"
                        autoCapitalize="words"
                        maxLength={30}
                        enterKeyHint="done"
                        className="h-full min-w-0 flex-1 bg-transparent pl-3 text-body text-texto outline-none placeholder:text-texto-2"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          cart().setCustomerName('')
                          setSkipName(true)
                        }}
                        className="h-full shrink-0 px-3 text-small font-medium text-verde"
                      >
                        {t.common.skip}
                      </button>
                    </div>
                    <p id={`${nameId}-h`} className="mt-2 text-small text-texto-2">
                      {t.order.nameHelp}
                    </p>
                  </>
                )}
              </section>
            )}

            {/* Todas las notas en un solo lugar: las de cada plato (editables acá, con ✕ para
                quitarlas) y la de todo el pedido (sin nota, campo; con nota, guardada con
                "Editar" y "Quitar"). */}
            <section className="mt-5" aria-labelledby={`${nameId}-nota-t`}>
              <h2 id={`${nameId}-nota-t`} className="text-dish text-texto">
                {t.order.noteTitle} <span className="font-normal text-texto-2">{t.order.noteOptional}</span>
              </h2>
              {notedLines.length > 0 && (
                <ul className="mt-2 space-y-2.5">
                  {notedLines.map((line) => {
                    const dishName = getDish(line.dishId)?.name ?? ''
                    const inputId = `${nameId}-nota-${line.lineId}`
                    return (
                      <li key={line.lineId}>
                        <label htmlFor={inputId} className="text-small font-semibold text-texto">
                          {dishName}
                        </label>
                        <div className="mt-1 flex h-11 items-center rounded-tarjeta border border-borde bg-tarjeta has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-verde">
                          <input
                            id={inputId}
                            type="text"
                            value={line.note ?? ''}
                            onChange={(e) => cart().setLineNote(line.lineId, e.target.value)}
                            aria-label={fmt(t.order.noteFor, { dish: dishName })}
                            placeholder={t.detail.notePlaceholder}
                            maxLength={120}
                            enterKeyHint="done"
                            className="h-full min-w-0 flex-1 bg-transparent pl-3 text-body text-texto outline-none placeholder:text-texto-2"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              cart().setLineNote(line.lineId, '')
                              setShownNoteIds((ids) => ids.filter((id) => id !== line.lineId))
                            }}
                            aria-label={fmt(t.order.noteClear, { dish: dishName })}
                            className="grid size-11 shrink-0 place-items-center text-texto-2"
                          >
                            <X size={18} strokeWidth={2} aria-hidden />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              {editingNote || !kitchenNote.trim() ? (
                <>
                  <label
                    htmlFor={`${nameId}-nota`}
                    className={notedLines.length > 0 ? 'mt-3 block text-small font-semibold text-texto' : 'sr-only'}
                  >
                    {notedLines.length > 0 ? t.order.noteGeneral : t.order.noteTitle}
                  </label>
                  <textarea
                    id={`${nameId}-nota`}
                    value={kitchenNote}
                    onChange={(e) => cart().setKitchenNote(e.target.value)}
                    onFocus={(e) => {
                      setEditingNote(true)
                      // Al entrar con "Editar", el cursor queda al final para seguir escribiendo.
                      const end = e.currentTarget.value.length
                      e.currentTarget.setSelectionRange(end, end)
                    }}
                    onBlur={() => setEditingNote(false)}
                    autoFocus={editingNote}
                    placeholder={t.order.notePlaceholder}
                    maxLength={140}
                    rows={2}
                    className="mt-2 block w-full resize-none rounded-tarjeta border border-borde bg-tarjeta px-3 py-2.5 text-body text-texto outline-none placeholder:text-texto-2 focus-visible:outline-3 focus-visible:outline-verde"
                  />
                </>
              ) : (
                <>
                  {notedLines.length > 0 && (
                    <p className="mt-3 text-small font-semibold text-texto">{t.order.noteGeneral}</p>
                  )}
                  <div className="mt-2 rounded-tarjeta border border-borde bg-tarjeta px-3 pt-2.5 pb-1">
                    <p className="text-body break-words text-texto">{kitchenNote.trim()}</p>
                    <div className="-mr-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => cart().setKitchenNote('')}
                        className="min-h-11 px-2 text-small font-medium text-texto-2"
                      >
                        {t.order.noteRemove}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingNote(true)}
                        className="inline-flex min-h-11 items-center gap-1.5 px-2 text-small font-semibold text-verde"
                      >
                        <Pencil size={14} strokeWidth={2.25} aria-hidden />
                        {t.order.noteEdit}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </>
        )}
        <DockSpacer size="lg" />
      </main>

      {items.length > 0 && (
        <BottomDock>
          {openState.open && takeout ? (
            <Button block onClick={() => navigate(paths.data)} trailing={formatMoney(total)}>
              {t.web.continue}
            </Button>
          ) : openState.open ? (
            <div className="pt-1">
              <Button block onClick={() => setConfirming(true)} disabled={sending} trailing={formatMoney(total)}>
                {sending ? t.order.sending : t.order.send}
              </Button>
              <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-small text-texto-2">
                <Clock size={14} strokeWidth={2} aria-hidden />
                {fmt(t.order.eta, { min: restaurant.timings.readyEstimateMin, mesa })}
              </p>
            </div>
          ) : (
            <Button block disabled>
              {fmt(t.closed.button, { open: openState.opensAt ?? '' })}
            </Button>
          )}
        </BottomDock>
      )}

      {/* Confirmación antes de mandar a cocina. "Pedir algo más" vuelve al menú con este
          mismo pedido abierto: lo que se agregue sale todo junto en una sola comanda. */}
      <BottomSheet
        open={confirming && items.length > 0}
        onClose={() => !sending && setConfirming(false)}
        title={t.order.confirmTitle}
        description={fmt(t.order.confirmSummary, {
          n: countItems(items),
          platos: platos(countItems(items)),
          total: formatMoney(total),
          name: customerLabel(customerName),
        })}
        footer={
          <div className="space-y-2">
            <Button block onClick={send} disabled={sending} trailing={formatMoney(total)}>
              {sending ? t.order.sending : t.order.confirmSend}
            </Button>
            <Button
              block
              variant="secondary"
              disabled={sending}
              icon={<Plus size={22} strokeWidth={2} aria-hidden />}
              onClick={() => {
                setConfirming(false)
                goBack()
              }}
            >
              {t.order.confirmMore}
            </Button>
          </div>
        }
      >
        <ul className="space-y-1.5">
          {items.map((line) => {
            const dish = getDish(line.dishId)
            if (!dish) return null
            return (
              <li key={line.lineId} className="flex items-baseline gap-2 text-body">
                <span className="w-6 shrink-0 text-texto-2">{line.quantity}×</span>
                <span className="min-w-0 flex-1 text-texto">
                  {dish.name}
                  {line.note?.trim() && <span className="block text-small text-texto-2">{line.note.trim()}</span>}
                </span>
                <span className="shrink-0 text-texto">{formatMoney(lineTotal(line))}</span>
              </li>
            )
          })}
        </ul>
        {kitchenNote.trim() && (
          <p className="mt-3 rounded-chico bg-fondo px-2.5 py-1.5 text-small text-texto-2">
            {fmt(t.order.noteLine, { note: kitchenNote.trim() })}
          </p>
        )}
        <p className="mt-3 text-small text-texto-2">{t.order.confirmHelp}</p>
      </BottomSheet>
    </div>
  )
}

interface OrderLineProps {
  line: CartItem
  onQuantity: (quantity: number) => void
  onChangeSide: () => void
}

function OrderLine({ line, onQuantity, onChangeSide }: OrderLineProps) {
  const dish = getDish(line.dishId)
  if (!dish) return null
  const side = getSide(line.sideId)
  const details = [
    ...line.extraIds.map((id) => {
      const e = getExtra(id)
      return e?.shortName ?? e?.name ?? ''
    }),
  ].filter(Boolean)
  // La nota del plato no va acá: se ve y se edita en "Nota para la cocina".

  return (
    <li className="flex gap-3 py-3 first:pt-[13px]">
      <Photo src={dish.image} className="size-14 shrink-0 rounded-tarjeta" />
      <div className="min-w-0 flex-1">
        <p className="text-dish text-texto">{dish.name}</p>
        {details.length > 0 && <p className="mt-0.5 text-small text-texto-2">{details.join(' · ')}</p>}
        {side && (dish.sides?.length ?? 0) > 1 && (
          <button
            type="button"
            onClick={onChangeSide}
            aria-label={fmt(t.order.changeSide, { dish: dish.name })}
            className="relative mt-1.5 inline-flex h-6 items-center rounded-completo bg-verde-suave px-2 text-small whitespace-nowrap text-verde before:absolute before:-inset-y-3 before:inset-x-0 before:content-['']"
          >
            {fmt(t.order.withSide, { side: side.name.toLowerCase() })}
          </button>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <p className="text-price text-texto">{formatMoney(lineTotal(line))}</p>
        <QuantityStepper
          value={line.quantity}
          onIncrement={() => onQuantity(line.quantity + 1)}
          onDecrement={() => onQuantity(line.quantity - 1)}
          itemName={dish.name}
          className="mt-2"
        />
      </div>
    </li>
  )
}

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
import { getDish, getExtra, getSide, menu, restaurant } from '../lib/catalog'
import { formatMoney } from '../lib/money'
import { fmt, t, tableLabel } from '../lib/text'
import { customerLabel, submitCart } from '../lib/orderFlow'
import { newId } from '../lib/storage'
import { useOnline } from '../lib/useOnline'
import { useGoBack } from '../lib/useGoBack'
import { useOpenState } from '../lib/useOpenState'
import { paths, useMesa } from '../lib/useMesa'
import { cartStore, cartTotal, lineTotal, useCart } from '../store/cart'

type Notice = { kind: 'limit' | 'error'; key: string }

/** M3 Tu pedido: platos, nombre opcional, bebidas sugeridas y "Enviar a la cocina". */
export function Order() {
  const mesa = useMesa()
  const navigate = useNavigate()
  const goBack = useGoBack(paths.menu(mesa))
  const items = useCart(mesa, (s) => s.items)
  const customerName = useCart(mesa, (s) => s.customerName)
  const pendingSend = useCart(mesa, (s) => s.pendingSend)
  const openState = useOpenState()
  const online = useOnline()
  const nameId = useId()
  const [skipName, setSkipName] = useState(false)
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), restaurant.timings.undoToastMs)
    return () => window.clearTimeout(id)
  }, [notice])

  const cart = () => cartStore(mesa).getState()
  const total = cartTotal(items)
  const drinks = menu.suggestedDrinks.map(getDish).filter((d): d is Dish => Boolean(d?.available))

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
    if (result.ok) navigate(paths.tracking(mesa, result.comanda.id), { replace: true })
    else if (result.reason === 'limit') setNotice({ kind: 'limit', key: newId() })
    else if (result.reason === 'server') setNotice({ kind: 'error', key: newId() })
    // 'offline': el carrito queda marcado y se muestra el aviso de señal.
  }

  return (
    <div className="app-shell">
      <PageHeader title={t.order.title} subtitle={tableLabel(mesa)} onBack={goBack} />

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
            <ul className="divide-y divide-borde rounded-grande border border-borde bg-tarjeta px-3">
              {items.map((line) => (
                <OrderLine
                  key={line.lineId}
                  line={line}
                  onQuantity={(q) => changeQuantity(line, q)}
                  onChangeSide={() => navigate(paths.editLine(mesa, line.dishId, line.lineId))}
                />
              ))}
            </ul>

            {skipName && !customerName ? (
              <p className="mt-3 text-small text-texto-2">
                {fmt(t.order.anonymous, { device: customerLabel('') })}{' '}
                <button type="button" onClick={() => setSkipName(false)} className="font-semibold text-verde underline">
                  {t.order.addName}
                </button>
              </p>
            ) : (
              <>
                <div className="mt-3 flex h-12 items-center rounded-tarjeta border border-borde bg-tarjeta has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-verde">
                  <input
                    id={nameId}
                    type="text"
                    value={customerName}
                    onChange={(e) => cart().setCustomerName(e.target.value)}
                    placeholder={t.order.nameLabel}
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
                <p id={`${nameId}-h`} className="mt-3 text-small text-texto-2">
                  {t.order.nameHelp}
                </p>
              </>
            )}

            {drinks.length > 0 && (
              <section className="mt-3" aria-labelledby="bebidas">
                <h2 id="bebidas" className="text-dish text-texto">
                  {t.order.drinks}
                </h2>
                <div className="mt-3 grid grid-cols-2 items-start gap-[9px]">
                  {drinks.map((drink) => (
                    <div
                      key={drink.id}
                      className="flex items-center gap-2 rounded-grande border border-borde bg-tarjeta p-2"
                    >
                      <Photo src={drink.image} className="size-10 shrink-0 rounded-chico" />
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

            <div className="mt-3 flex items-center justify-between">
              <span className="text-section text-texto">{t.order.total}</span>
              <span className="text-section text-texto">{formatMoney(total)}</span>
            </div>
          </>
        )}
        <DockSpacer />
      </main>

      {items.length > 0 && (
        <BottomDock>
          {openState.open ? (
            <Button block onClick={send} disabled={sending} trailing={formatMoney(total)}>
              {sending ? t.order.sending : t.order.send}
            </Button>
          ) : (
            <Button block disabled>
              {fmt(t.closed.button, { open: openState.opensAt ?? '' })}
            </Button>
          )}
        </BottomDock>
      )}
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
    line.note ?? '',
  ].filter(Boolean)

  return (
    <li className="flex gap-3 py-3 first:pt-[13px]">
      <Photo src={dish.image} className="size-14 shrink-0 rounded-tarjeta" />
      <div className="min-w-0 flex-1">
        <p className="text-dish text-texto">{dish.name}</p>
        <p className="mt-0.5 text-small text-texto-2">{details.length ? details.join(' · ') : t.order.noChanges}</p>
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

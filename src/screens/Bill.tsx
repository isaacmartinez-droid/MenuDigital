import { useEffect, useId, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ChevronDown, Flame } from 'lucide-react'
import type { Comanda, PayMethod, PayScope, TipChoice } from '../types/order'
import { restaurant } from '../lib/catalog'
import { PageHeader } from '../components/Header'
import { NoticeBanner } from '../components/NoticeBanner'
import { StarRating } from '../components/StarRating'
import { BottomDock, DockSpacer } from '../components/CartBar'
import { Button } from '../components/Button'
import { Toast } from '../components/Toast'
import { cx } from '../lib/cx'
import { formatMoney, tipAmount } from '../lib/money'
import { fmt, t, tableLabel } from '../lib/text'
import { fetchAccount, rateDishes, requestBill } from '../lib/api'
import { itemDetails } from '../lib/comandaStatus'
import { customerLabel } from '../lib/orderFlow'
import { newId } from '../lib/storage'
import { useGoBack } from '../lib/useGoBack'
import { useOpenState } from '../lib/useOpenState'
import { paths, useMesa } from '../lib/useMesa'
import { comandasStore, useComandas } from '../store/comandas'
import { useCart } from '../store/cart'
import { accountStore, useAccount } from '../store/account'

const sumTotals = (list: Comanda[]) => list.reduce((sum, c) => sum + c.total, 0)

/**
 * M6 "Tu cuenta" y, después de avisar, M6b "Pasá a caja".
 * Cada persona pide desde su teléfono, así que la pantalla gira en torno a
 * "lo tuyo"; "toda la mesa" es para cuando uno paga por todos. Siempre se paga en caja.
 */
export function Bill() {
  const mesa = useMesa()
  const navigate = useNavigate()
  const goBack = useGoBack(paths.menu(mesa))
  const comandas = useComandas(mesa, (s) => s.comandas)
  const customerName = useCart(mesa, (s) => s.customerName)
  const ratings = useAccount(mesa, (s) => s.ratings)
  const ratingsSkipped = useAccount(mesa, (s) => s.ratingsSkipped)
  const payScope = useAccount(mesa, (s) => s.payScope)
  const tip = useAccount(mesa, (s) => s.tip)
  const payMethod = useAccount(mesa, (s) => s.payMethod)
  const cashGiven = useAccount(mesa, (s) => s.cashGiven)
  const billRequestedAt = useAccount(mesa, (s) => s.billRequestedAt)
  const cashier = useAccount(mesa, (s) => s.cashier)
  const canOrder = useOpenState().open
  const [notifying, setNotifying] = useState(false)
  const [offlineKey, setOfflineKey] = useState<string | null>(null)

  // Trae la cuenta al día (pedidos de los otros teléfonos de la mesa).
  useEffect(() => {
    fetchAccount(mesa)
      .then((account) => {
        if (account.length) comandasStore(mesa).getState().setAccount(account)
      })
      .catch(() => {
        /* sin señal: se muestra lo que ya se tenía */
      })
  }, [mesa])

  useEffect(() => {
    if (!offlineKey) return
    const id = window.setTimeout(() => setOfflineKey(null), 4000)
    return () => window.clearTimeout(id)
  }, [offlineKey])

  const sorted = [...comandas].sort((a, b) => a.number - b.number)
  const mine = sorted.filter((c) => c.mine)
  const others = sorted.filter((c) => !c.mine)
  const mineTotal = sumTotals(mine)
  const tableTotal = sumTotals(sorted)
  // Si este teléfono no pidió nada, solo tiene sentido pagar la mesa.
  const scope: PayScope = mineTotal === 0 ? 'table' : payScope
  const subtotal = scope === 'mine' ? mineTotal : tableTotal
  const tipValue = tipAmount(subtotal, tip)
  const total = subtotal + tipValue
  const change = payMethod === 'efectivo' && cashGiven && cashGiven >= total ? cashGiven - total : null
  const inKitchen = mine.filter((c) => c.status !== 'entregada')
  const requested = Boolean(billRequestedAt)
  const showDock = sorted.length > 0 && (!requested || canOrder)
  const name = customerLabel(customerName)

  // Para calificar: lo que pidió este teléfono (o la mesa, si no pidió nada), sin repetir.
  const ratedFrom = mine.length ? mine : sorted
  const dishes = [...new Map(ratedFrom.flatMap((c) => c.items).map((i) => [i.dishId, i.name])).entries()]

  const notifyCashier = async () => {
    if (notifying) return
    setNotifying(true)
    try {
      const { cashier: who } = await requestBill(mesa, { scope, tip, method: payMethod, cashGiven })
      if (!ratingsSkipped && Object.keys(ratings).length) void rateDishes(mesa, ratings).catch(() => undefined)
      accountStore(mesa).getState().markBillRequested(who)
    } catch {
      setOfflineKey(newId())
    } finally {
      setNotifying(false)
    }
  }

  const tipLabel =
    tip.kind === 'none' ? null : tip.kind === 'percent' ? fmt(t.bill.tipPercent, { pct: tip.percent }) : t.bill.tip
  const choices = [
    scope === 'mine' ? t.bill.scopeMine : t.bill.scopeTable,
    payMethod === 'tarjeta'
      ? t.bill.card
      : payMethod === 'efectivo'
        ? cashGiven
          ? fmt(t.bill.cashWith, { amount: formatMoney(cashGiven) })
          : t.bill.cash
        : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="app-shell">
      <PageHeader title={t.bill.title} subtitle={tableLabel(mesa)} onBack={goBack} />

      <main className="px-4 pt-2">
        {offlineKey && (
          <Toast key={offlineKey} tone="aviso" title={t.offline.title} body={t.waiter.offlineBody} className="mb-3" />
        )}

        {sorted.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-body text-texto-2">{t.bill.empty}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(paths.menu(mesa))}>
              {t.order.emptyCta}
            </Button>
          </div>
        ) : (
          <>
            {requested && (
              <NoticeBanner
                role="status"
                tone="positivo"
                title={fmt(t.bill.goTitle, { mesa })}
                body={fmt(t.bill.goBody, { cashier: cashier ?? '' })}
                className="mb-3"
              />
            )}

            {inKitchen.length > 0 && !requested && (
              <div role="status" className="mb-3 flex gap-2.5 rounded-tarjeta bg-ambar-suave px-3 py-2.5 text-texto-sobre-ambar">
                <Flame size={18} strokeWidth={2} aria-hidden className="mt-0.5 shrink-0" />
                <p className="text-small">
                  <span className="font-semibold">
                    {fmt(inKitchen.length === 1 ? t.bill.kitchenOne : t.bill.kitchenMany, {
                      ids: inKitchen.map((c) => c.id).join(', '),
                    })}
                  </span>
                  {'. '}
                  {t.bill.kitchenBody}
                </p>
              </div>
            )}

            {/* Lo tuyo: todas las órdenes de este teléfono juntas, con el detalle de cada plato. */}
            <section aria-labelledby="lo-tuyo" className="rounded-grande border border-borde bg-tarjeta px-4 pt-4 pb-4">
              <h2 id="lo-tuyo" className="text-dish text-texto">
                {fmt(t.bill.mineTitle, { name })}
              </h2>
              {mine.length === 0 ? (
                <p className="mt-2 text-small text-texto-2">{t.bill.mineEmpty}</p>
              ) : (
                <>
                  <ItemList comandas={mine} showKitchen />
                  <div className="mt-3 flex items-center justify-between border-t border-borde pt-3">
                    <span className="text-dish text-texto">{t.bill.mineTotal}</span>
                    <span className="text-price text-texto">{formatMoney(mineTotal)}</span>
                  </div>
                </>
              )}
            </section>

            {!requested && others.length > 0 && mineTotal > 0 && (
              <section aria-labelledby="que-pagas" className="mt-5">
                <h2 id="que-pagas" className="text-dish text-texto">
                  {t.bill.scopeTitle}
                </h2>
                <div role="group" aria-labelledby="que-pagas" className="mt-2 grid grid-cols-2 gap-2">
                  {(['mine', 'table'] as PayScope[]).map((s) => (
                    <ChoiceButton
                      key={s}
                      selected={scope === s}
                      onClick={() => accountStore(mesa).getState().setPayScope(s)}
                      label={s === 'mine' ? t.bill.scopeMine : t.bill.scopeTable}
                      detail={formatMoney(s === 'mine' ? mineTotal : tableTotal)}
                    />
                  ))}
                </div>
              </section>
            )}

            {scope === 'table' && others.length > 0 && <OthersSummary comandas={others} />}

            {!requested && (
              <>
                <TipPicker mesa={mesa} subtotal={subtotal} tip={tip} />
                <MethodPicker mesa={mesa} method={payMethod} cashGiven={cashGiven} total={total} />
              </>
            )}

            {/* Resumen de lo que se paga (y, después de avisar, lo que se le dijo a caja). */}
            <section aria-labelledby="vas-a-pagar" className="mt-5 rounded-grande border border-borde bg-tarjeta px-4 pt-4 pb-4">
              <h2 id="vas-a-pagar" className="text-dish text-texto">
                {requested ? t.bill.summaryRequested : t.bill.summaryTitle}
              </h2>
              {requested && choices && <p className="mt-0.5 text-small text-texto-2">{choices}</p>}
              <dl className="mt-3 space-y-1 text-body">
                <Line label={scope === 'mine' ? t.bill.consumoMine : t.bill.consumoTable} value={formatMoney(subtotal)} />
                {tipLabel && <Line label={tipLabel} value={formatMoney(tipValue)} />}
              </dl>
              <div className="mt-3 flex items-center justify-between border-t border-borde pt-3">
                <span className="text-section text-texto">{t.bill.totalToPay}</span>
                <span className="text-section text-texto">{formatMoney(total)}</span>
              </div>
              {change !== null && (
                <dl className="mt-1 text-small">
                  <Line label={t.bill.change} value={formatMoney(change)} />
                </dl>
              )}
            </section>

            {!requested && !ratingsSkipped && dishes.length > 0 && (
              <section aria-labelledby="calificar" className="mt-5 rounded-grande border border-borde bg-tarjeta px-4 pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <h2 id="calificar" className="text-dish text-texto">
                    {t.bill.rateTitle}
                  </h2>
                  <button
                    type="button"
                    onClick={() => accountStore(mesa).getState().skipRatings()}
                    className="-my-3 -mr-2 min-h-12 px-2 text-dish text-verde"
                  >
                    {t.common.skip}
                  </button>
                </div>
                <ul className="mt-1.5">
                  {dishes.map(([dishId, dishName]) => (
                    <li key={dishId} className="flex h-8 items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-body text-texto">{dishName}</span>
                      <StarRating
                        value={ratings[dishId] ?? 0}
                        onChange={(stars) => accountStore(mesa).getState().rate(dishId, stars)}
                        label={fmt(t.bill.rateDish, { dish: dishName })}
                      />
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-small text-texto-2">{t.bill.rateHelp}</p>
              </section>
            )}
          </>
        )}
        {showDock && <DockSpacer size="lg" />}
      </main>

      {showDock && (
        <BottomDock>
          {requested ? (
            <div className="py-1">
              <Button block variant="secondary" onClick={() => navigate(paths.menu(mesa))}>
                {t.bill.orderMore}
              </Button>
            </div>
          ) : (
            <div className="pt-1">
              <Button block onClick={notifyCashier} disabled={notifying} trailing={formatMoney(total)}>
                {notifying ? t.bill.notifying : t.bill.notify}
              </Button>
              <p className="mt-2.5 text-center text-small text-texto-2">{t.bill.payAtCashier}</p>
            </div>
          )}
        </BottomDock>
      )}
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-texto-2">{label}</dt>
      <dd className="text-texto">{value}</dd>
    </div>
  )
}

/** Platos de varias órdenes juntos, con detalle y precio; opcionalmente marca lo que sigue en cocina. */
function ItemList({ comandas, showKitchen = false }: { comandas: Comanda[]; showKitchen?: boolean }) {
  return (
    <ul className="mt-2 space-y-2">
      {comandas.flatMap((c) =>
        c.items.map((item, i) => {
          const details = itemDetails(item)
          return (
            <li key={`${c.id}-${i}`} className="flex gap-2 text-body text-texto">
              <span className="w-6 shrink-0 text-texto-2">{item.quantity}×</span>
              <span className="min-w-0 flex-1">
                {item.name}
                {showKitchen && c.status !== 'entregada' && (
                  <span className="ml-1.5 inline-flex h-5 items-center rounded-completo bg-ambar-suave px-2 align-middle text-small text-texto-sobre-ambar">
                    {t.bill.inKitchen}
                  </span>
                )}
                {details && <span className="block text-small text-texto-2">{details}</span>}
              </span>
              <span className="shrink-0">{formatMoney(item.lineTotal)}</span>
            </li>
          )
        }),
      )}
    </ul>
  )
}

/** Con "toda la mesa": lo de los demás, por persona, con el detalle plegado. */
function OthersSummary({ comandas }: { comandas: Comanda[] }) {
  const [open, setOpen] = useState(false)
  const detailId = useId()
  const people = [...new Map(comandas.map((c) => [c.customerName, [] as Comanda[]])).keys()].map((person) => {
    const theirs = comandas.filter((c) => c.customerName === person)
    return { person, theirs, total: sumTotals(theirs) }
  })

  return (
    <section className="mt-3 rounded-grande border border-borde bg-tarjeta px-4 pt-3 pb-1">
      <ul className="space-y-1 text-body">
        {people.map(({ person, total }) => (
          <li key={person} className="flex justify-between gap-3">
            <span className="text-texto">{person}</span>
            <span className="text-texto">{formatMoney(total)}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailId}
        onClick={() => setOpen((o) => !o)}
        className="-ml-1 inline-flex min-h-11 items-center gap-1 px-1 text-small font-semibold text-verde"
      >
        {open ? t.bill.othersHide : t.bill.othersShow}
        <ChevronDown size={16} strokeWidth={2.25} aria-hidden className={cx('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div id={detailId} className="space-y-3 pb-3">
          {people.map(({ person, theirs }) => (
            <div key={person}>
              <p className="text-small font-semibold text-texto-2">{person}</p>
              <ItemList comandas={theirs} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/** Botón de opción en pastilla (seleccionado: verde). `detail` va a la derecha, ej. el monto. */
function ChoiceButton({
  selected,
  onClick,
  label,
  detail,
}: {
  selected: boolean
  onClick: () => void
  label: string
  detail?: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        'flex min-h-11 flex-col items-center justify-center rounded-completo px-3 py-1.5 text-dish leading-tight transition-colors duration-150',
        selected ? 'focus-on-dark bg-verde text-blanco' : 'border border-borde bg-tarjeta text-texto',
      )}
    >
      {label}
      {detail && <span className={cx('text-small font-normal', selected ? 'text-blanco/85' : 'text-texto-2')}>{detail}</span>}
    </button>
  )
}

interface TipPickerProps {
  mesa: string
  subtotal: number
  tip: TipChoice
}

/** Propina voluntaria sobre lo que se paga: porcentajes de la config (la sugerida viene marcada), otro monto o sin propina. */
function TipPicker({ mesa, subtotal, tip }: TipPickerProps) {
  const amountId = useId()
  const setTip = (next: TipChoice) => accountStore(mesa).getState().setTip(next)

  return (
    <section aria-labelledby="propina" className="mt-5">
      <h2 id="propina" className="text-dish text-texto">
        {t.bill.tipTitle}
      </h2>
      <p className="mt-0.5 text-small text-texto-2">{fmt(t.bill.tipHelp, { pct: restaurant.tip.suggested })}</p>
      <div role="group" aria-labelledby="propina" className="mt-2 grid grid-cols-2 gap-2">
        {restaurant.tip.percents.map((pct) => (
          <ChoiceButton
            key={pct}
            selected={tip.kind === 'percent' && tip.percent === pct}
            onClick={() => setTip({ kind: 'percent', percent: pct })}
            label={`${pct} % · ${formatMoney(tipAmount(subtotal, { kind: 'percent', percent: pct }))}`}
          />
        ))}
        <ChoiceButton selected={tip.kind === 'amount'} onClick={() => setTip({ kind: 'amount', amount: 0 })} label={t.bill.tipOther} />
        <ChoiceButton selected={tip.kind === 'none'} onClick={() => setTip({ kind: 'none' })} label={t.bill.tipNone} />
      </div>
      {tip.kind === 'amount' && (
        <MoneyInput
          id={amountId}
          label={t.bill.tipAmountLabel}
          placeholder={t.bill.tipAmountPlaceholder}
          value={tip.amount}
          onChange={(amount) => setTip({ kind: 'amount', amount: amount ?? 0 })}
        />
      )}
    </section>
  )
}

/** "¿Cómo pagás?" (opcional): efectivo o tarjeta; con efectivo, con cuánto, para que caja tenga el vuelto. */
function MethodPicker({
  mesa,
  method,
  cashGiven,
  total,
}: {
  mesa: string
  method: PayMethod | null
  cashGiven: number | null
  total: number
}) {
  const cashId = useId()
  const account = () => accountStore(mesa).getState()
  // Tocar la opción elegida la desmarca (es opcional).
  const choose = (m: PayMethod) => account().setPayMethod(method === m ? null : m)

  return (
    <section aria-labelledby="como-pagas" className="mt-5">
      <h2 id="como-pagas" className="text-dish text-texto">
        {t.bill.methodTitle} <span className="font-normal text-texto-2">{t.bill.methodOptional}</span>
      </h2>
      <div role="group" aria-labelledby="como-pagas" className="mt-2 grid grid-cols-2 gap-2">
        <ChoiceButton selected={method === 'efectivo'} onClick={() => choose('efectivo')} label={t.bill.cash} />
        <ChoiceButton selected={method === 'tarjeta'} onClick={() => choose('tarjeta')} label={t.bill.card} />
      </div>
      {method === 'efectivo' && (
        <>
          <MoneyInput
            id={cashId}
            label={t.bill.cashLabel}
            placeholder={t.bill.cashPlaceholder}
            value={cashGiven}
            onChange={(amount) => account().setCashGiven(amount)}
            showLabel
          />
          <p className={cx('mt-1.5 text-small', cashGiven && cashGiven < total ? 'text-promo' : 'text-texto-2')}>
            {cashGiven && cashGiven < total ? t.bill.cashShort : t.bill.cashHelp}
          </p>
        </>
      )}
    </section>
  )
}

/** Campo de monto en córdobas (solo números). */
function MoneyInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  showLabel = false,
}: {
  id: string
  label: string
  placeholder: string
  value: number | null
  onChange: (amount: number | null) => void
  showLabel?: boolean
}) {
  return (
    <div className="mt-3">
      {showLabel && (
        <label htmlFor={id} className="mb-1.5 block text-small text-texto-2">
          {label}
        </label>
      )}
      <div className="flex h-12 items-center rounded-tarjeta border border-borde bg-tarjeta has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-verde">
        <span aria-hidden className="pl-3 text-body text-texto-2">
          {restaurant.currency.symbol}
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={showLabel ? undefined : label}
          placeholder={placeholder}
          value={value ? String(value) : ''}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 5)
            onChange(digits ? Number(digits) : null)
          }}
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-body text-texto outline-none placeholder:text-texto-2"
        />
      </div>
    </div>
  )
}

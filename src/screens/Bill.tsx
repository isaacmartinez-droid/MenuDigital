import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router'
import type { Comanda, SplitMode, TipChoice } from '../types/order'
import { restaurant } from '../lib/catalog'
import { PageHeader } from '../components/Header'
import { PaymentNotice } from '../components/PaymentNotice'
import { NoticeBanner } from '../components/NoticeBanner'
import { StarRating } from '../components/StarRating'
import { BottomDock, DockSpacer } from '../components/CartBar'
import { Button } from '../components/Button'
import { Toast } from '../components/Toast'
import { cx } from '../lib/cx'
import { formatMoney, tipAmount } from '../lib/money'
import { fmt, t, tableLabel } from '../lib/text'
import { fetchAccount, rateDishes, requestBill } from '../lib/api'
import { newId } from '../lib/storage'
import { useGoBack } from '../lib/useGoBack'
import { useOpenState } from '../lib/useOpenState'
import { paths, useMesa } from '../lib/useMesa'
import { comandasStore, useComandas } from '../store/comandas'
import { accountStore, useAccount } from '../store/account'

/**
 * M6 "Ya vamos a pagar" (Tu cuenta) y, después de avisar, M6b "Pasá a caja".
 * La cuenta es de toda la mesa, por persona y comanda. Siempre se paga en caja.
 */
export function Bill() {
  const mesa = useMesa()
  const navigate = useNavigate()
  const goBack = useGoBack(paths.menu(mesa))
  const comandas = useComandas(mesa, (s) => s.comandas)
  const ratings = useAccount(mesa, (s) => s.ratings)
  const ratingsSkipped = useAccount(mesa, (s) => s.ratingsSkipped)
  const split = useAccount(mesa, (s) => s.split)
  const tip = useAccount(mesa, (s) => s.tip)
  const billRequestedAt = useAccount(mesa, (s) => s.billRequestedAt)
  const cashier = useAccount(mesa, (s) => s.cashier)
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
  const subtotal = sorted.reduce((sum, c) => sum + c.total, 0)
  const tipValue = tipAmount(subtotal, tip)
  const total = subtotal + tipValue
  const phones = new Set(sorted.map((c) => c.customerName)).size
  const requested = Boolean(billRequestedAt)
  // Ya avisaron a caja: "Pedir algo más" solo si el local sigue abierto.
  const canOrder = useOpenState().open
  const showDock = sorted.length > 0 && (!requested || canOrder)

  // Platos para calificar: los de toda la mesa, sin repetir.
  const dishes = [...new Map(sorted.flatMap((c) => c.items).map((i) => [i.dishId, i.name])).entries()]

  const notifyCashier = async () => {
    if (notifying) return
    setNotifying(true)
    try {
      const { cashier: name } = await requestBill(mesa, split, tip)
      if (!ratingsSkipped && Object.keys(ratings).length) void rateDishes(mesa, ratings).catch(() => undefined)
      accountStore(mesa).getState().markBillRequested(name)
    } catch {
      setOfflineKey(newId())
    } finally {
      setNotifying(false)
    }
  }

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

            <BillSummary
              mesa={mesa}
              comandas={sorted}
              phones={phones}
              subtotal={subtotal}
              tipLabel={tip.kind === 'none' ? null : tip.kind === 'percent' ? fmt(t.bill.tipPercent, { pct: tip.percent }) : t.bill.tip}
              tipValue={tipValue}
              total={total}
            />

            <div className="mt-3">
              <PaymentNotice />
            </div>

            {!requested && !ratingsSkipped && dishes.length > 0 && (
              <section
                aria-labelledby="calificar"
                className="mt-3 rounded-grande border border-borde bg-tarjeta px-4 pt-4 pb-4"
              >
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
                  {dishes.map(([dishId, name]) => (
                    <li key={dishId} className="flex h-8 items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-body text-texto">{name}</span>
                      <StarRating
                        value={ratings[dishId] ?? 0}
                        onChange={(stars) => accountStore(mesa).getState().rate(dishId, stars)}
                        label={fmt(t.bill.rateDish, { dish: name })}
                      />
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-small text-texto-2">{t.bill.rateHelp}</p>
              </section>
            )}

            {!requested && (
              <section aria-labelledby="pagan" className="mt-3">
                <h2 id="pagan" className="text-dish text-texto">
                  {t.bill.splitTitle}
                </h2>
                <div role="group" aria-labelledby="pagan" className="mt-3 grid grid-cols-2 gap-2">
                  {(['junto', 'separado'] as SplitMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={split === mode}
                      onClick={() => accountStore(mesa).getState().setSplit(mode)}
                      className={cx(
                        'h-11 rounded-completo text-dish transition-colors duration-150',
                        split === mode ? 'focus-on-dark bg-verde text-blanco' : 'border border-borde bg-tarjeta text-texto',
                      )}
                    >
                      {mode === 'junto' ? t.bill.together : t.bill.separate}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {!requested && <TipPicker mesa={mesa} subtotal={subtotal} tip={tip} />}
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
              <p className="mt-2.5 text-center text-small text-texto-2">{t.bill.notifyHelp}</p>
            </div>
          )}
        </BottomDock>
      )}
    </div>
  )
}

interface TipPickerProps {
  mesa: string
  subtotal: number
  tip: TipChoice
}

/** Propina voluntaria: porcentajes de la config (la sugerida viene marcada), otro monto o sin propina. */
function TipPicker({ mesa, subtotal, tip }: TipPickerProps) {
  const amountId = useId()
  const setTip = (next: TipChoice) => accountStore(mesa).getState().setTip(next)
  const option = (selected: boolean, label: string, onClick: () => void) => (
    <button
      key={label}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        'h-11 rounded-completo px-3 text-dish transition-colors duration-150',
        selected ? 'focus-on-dark bg-verde text-blanco' : 'border border-borde bg-tarjeta text-texto',
      )}
    >
      {label}
    </button>
  )

  return (
    <section aria-labelledby="propina" className="mt-3">
      <h2 id="propina" className="text-dish text-texto">
        {t.bill.tipTitle}
      </h2>
      <p className="mt-1 text-small text-texto-2">{fmt(t.bill.tipHelp, { pct: restaurant.tip.suggested })}</p>
      <div role="group" aria-labelledby="propina" className="mt-3 grid grid-cols-2 gap-2">
        {restaurant.tip.percents.map((pct) =>
          option(
            tip.kind === 'percent' && tip.percent === pct,
            `${pct} % · ${formatMoney(tipAmount(subtotal, { kind: 'percent', percent: pct }))}`,
            () => setTip({ kind: 'percent', percent: pct }),
          ),
        )}
        {option(tip.kind === 'amount', t.bill.tipOther, () => setTip({ kind: 'amount', amount: 0 }))}
        {option(tip.kind === 'none', t.bill.tipNone, () => setTip({ kind: 'none' }))}
      </div>
      {tip.kind === 'amount' && (
        <div className="mt-3 flex h-12 items-center rounded-tarjeta border border-borde bg-tarjeta has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-verde">
          <span aria-hidden className="pl-3 text-body text-texto-2">
            {restaurant.currency.symbol}
          </span>
          <input
            id={amountId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label={t.bill.tipAmountLabel}
            placeholder={t.bill.tipAmountPlaceholder}
            value={tip.amount ? String(tip.amount) : ''}
            onChange={(e) => setTip({ kind: 'amount', amount: Number(e.target.value.replace(/\D/g, '').slice(0, 5)) })}
            className="h-full min-w-0 flex-1 bg-transparent px-2 text-body text-texto outline-none placeholder:text-texto-2"
          />
        </div>
      )}
    </section>
  )
}

interface BillSummaryProps {
  mesa: string
  comandas: Comanda[]
  phones: number
  subtotal: number
  /** "Propina (10 %)", "Propina" o null si no dejan. */
  tipLabel: string | null
  tipValue: number
  total: number
}

/** Cuenta de la mesa por persona y comanda ("Ana (vos) · FN-0142"), con propina si la dejan. */
function BillSummary({ mesa, comandas, phones, subtotal, tipLabel, tipValue, total }: BillSummaryProps) {
  return (
    <section aria-labelledby="cuenta-mesa" className="rounded-grande border border-borde bg-tarjeta px-4 pt-4 pb-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="cuenta-mesa" className="text-dish text-texto">
          {phones === 1 ? fmt(t.bill.summaryOne, { mesa }) : fmt(t.bill.summary, { mesa, n: phones })}
        </h2>
        <span className="text-small text-texto-2">{t.bill.perPerson}</span>
      </div>
      <ul className="mt-3 space-y-3">
        {comandas.map((c) => (
          <li key={c.id}>
            <p className="text-small text-texto-2">
              {c.mine ? fmt(t.bill.you, { name: c.customerName }) : c.customerName} · {c.id}
            </p>
            <ul className="mt-1 space-y-1">
              {c.items.map((item, i) => (
                <li key={`${item.dishId}-${i}`} className="flex items-baseline gap-2 text-body">
                  <span className="w-5 shrink-0 text-texto-2">{item.quantity}×</span>
                  <span className="min-w-0 flex-1 text-texto">{item.name}</span>
                  <span className="shrink-0 text-texto">{formatMoney(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {tipLabel && (
        <dl className="mt-3 space-y-1 border-t border-borde pt-3 text-body">
          <div className="flex justify-between gap-3">
            <dt className="text-texto-2">{t.bill.subtotal}</dt>
            <dd className="text-texto">{formatMoney(subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-texto-2">{tipLabel}</dt>
            <dd className="text-texto">{formatMoney(tipValue)}</dd>
          </div>
        </dl>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-borde pt-3">
        <span className="text-section text-texto">{tipLabel ? t.bill.totalToPay : t.bill.tableTotal}</span>
        <span className="text-section text-texto">{formatMoney(total)}</span>
      </div>
    </section>
  )
}

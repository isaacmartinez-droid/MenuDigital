import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { PageHeader } from '../components/Header'
import { BottomDock, DockSpacer } from '../components/CartBar'
import { Button } from '../components/Button'
import { Tag } from '../components/Tag'
import { Toast } from '../components/Toast'
import { TAKEOUT } from '../lib/channel'
import { getDish, restaurant } from '../lib/catalog'
import { cx } from '../lib/cx'
import { formatMoney } from '../lib/money'
import { submitCart } from '../lib/orderFlow'
import { readSource } from '../lib/source'
import { newId } from '../lib/storage'
import { fmt, t } from '../lib/text'
import { useGoBack } from '../lib/useGoBack'
import { useOpenState } from '../lib/useOpenState'
import { paths } from '../lib/useMesa'
import { cartTotal, lineTotal, useCart } from '../store/cart'
import { isValidName, isValidPhone, useCustomer } from '../store/customer'

type Notice = { kind: 'limit' | 'error'; key: string }

/** Forma de pago: por ahora solo al recoger; tarjeta y transferencia, "Próximamente". */
const payOptions = [
  { id: 'recoger', title: t.web.payPickup, hint: t.web.payPickupHint, soon: false },
  { id: 'tarjeta', title: t.web.payCard, soon: true },
  { id: 'transferencia', title: t.web.payTransfer, soon: true },
] as const

/**
 * W6 Resumen y pago (para llevar): lo que pidió, total y cómo paga (solo
 * vista: se paga al recoger). "Confirmar pedido" lo envía.
 */
export function Summary() {
  const navigate = useNavigate()
  const goBack = useGoBack(paths.data)
  const items = useCart(TAKEOUT, (s) => s.items)
  const name = useCustomer((s) => s.name)
  const phone = useCustomer((s) => s.phone)
  const openState = useOpenState()
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), restaurant.timings.undoToastMs)
    return () => window.clearTimeout(id)
  }, [notice])

  // Sin pedido no hay resumen; sin datos, primero "Tus datos" (salvo mientras se envía).
  if (!sending && items.length === 0) return <Navigate to={paths.menu(TAKEOUT)} replace />
  if (!sending && (!isValidName(name) || !isValidPhone(phone))) return <Navigate to={paths.data} replace />

  const total = cartTotal(items)

  const confirm = async () => {
    if (sending) return
    setSending(true)
    const result = await submitCart(TAKEOUT, { name, phone, source: readSource() })
    if (result.ok) {
      navigate(paths.tracking(TAKEOUT, result.comanda.id), { replace: true })
      return
    }
    setSending(false)
    setNotice({ kind: result.reason === 'limit' ? 'limit' : 'error', key: newId() })
  }

  return (
    <>
      <div className="app-shell">
        <PageHeader
          title={t.web.summaryTitle}
          subtitle={fmt(t.web.summarySubtitle, { name: name.trim() })}
          onBack={goBack}
        />
        <main className="flex flex-col gap-4 px-4 pt-2">
          {notice && (
            <Toast
              key={notice.key}
              tone="aviso"
              title={notice.kind === 'limit' ? t.order.limitTitle : t.order.errorTitle}
              body={
                notice.kind === 'limit'
                  ? fmt(t.order.limitBody, { max: restaurant.ordering.maxItemsPerComanda })
                  : t.order.errorBody
              }
            />
          )}

          <section
            aria-label={t.web.summaryItems}
            className="flex flex-col gap-2 rounded-grande border border-borde bg-tarjeta p-4"
          >
            <ul className="flex flex-col gap-2">
              {items.map((line) => (
                <li key={line.lineId} className="flex gap-2 text-body">
                  <span className="shrink-0 text-texto-2">{line.quantity}×</span>
                  <span className="min-w-0 flex-1 text-texto">{getDish(line.dishId)?.name}</span>
                  <span className="shrink-0 text-texto">{formatMoney(lineTotal(line))}</span>
                </li>
              ))}
            </ul>
            <hr className="border-borde" />
            <p className="flex justify-between text-section text-texto">
              <span>{t.web.total}</span>
              <span>{formatMoney(total)}</span>
            </p>
          </section>

          <fieldset>
            <legend className="text-section text-texto">{t.web.payTitle}</legend>
            <div className="mt-3 rounded-grande border border-borde bg-tarjeta px-3">
              {payOptions.map((option) => (
                <label
                  key={option.id}
                  className={cx(
                    'flex items-center gap-3 py-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-verde',
                    option.soon ? 'cursor-not-allowed' : 'cursor-pointer',
                  )}
                >
                  <input
                    type="radio"
                    name="pago"
                    value={option.id}
                    checked={!option.soon}
                    disabled={option.soon}
                    readOnly
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={cx(
                      'size-[22px] shrink-0 rounded-completo bg-tarjeta',
                      option.soon ? 'border-[1.5px] border-borde' : 'border-[6px] border-verde',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={cx('block text-dish', option.soon ? 'text-texto-2' : 'text-texto')}>
                      {option.title}
                    </span>
                    {'hint' in option && <span className="block text-small text-texto-2">{option.hint}</span>}
                  </span>
                  {option.soon && <Tag tone="combo">{t.web.soon}</Tag>}
                </label>
              ))}
            </div>
          </fieldset>

          <DockSpacer />
        </main>
      </div>

      <BottomDock>
        {openState.open ? (
          <Button block onClick={confirm} disabled={sending} trailing={formatMoney(total)}>
            {sending ? t.web.confirming : t.web.confirm}
          </Button>
        ) : (
          <Button block disabled>
            {fmt(t.closed.button, { open: openState.opensAt ?? '' })}
          </Button>
        )}
      </BottomDock>
    </>
  )
}

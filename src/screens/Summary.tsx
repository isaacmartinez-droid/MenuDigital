import { Navigate } from 'react-router'
import { PageHeader } from '../components/Header'
import { BottomDock, DockSpacer } from '../components/CartBar'
import { Button } from '../components/Button'
import { PayOptions } from '../components/PayOptions'
import { Toast } from '../components/Toast'
import { TAKEOUT } from '../lib/channel'
import { getDish, restaurant } from '../lib/catalog'
import { formatMoney } from '../lib/money'
import { useConfirmTakeout } from '../lib/useConfirmTakeout'
import { fmt, t } from '../lib/text'
import { useGoBack } from '../lib/useGoBack'
import { useOpenState } from '../lib/useOpenState'
import { paths } from '../lib/useMesa'
import { cartTotal, lineTotal, useCart } from '../store/cart'
import { isValidName, isValidPhone, useCustomer } from '../store/customer'
import { useIsDesktop } from '../lib/useMediaQuery'
import { SummaryDesktop } from './SummaryDesktop'

/**
 * W6 Resumen y pago (para llevar): lo que pidió, total y cómo paga (solo
 * vista: se paga al recoger). "Confirmar pedido" lo envía.
 */
export function Summary() {
  const goBack = useGoBack(paths.data)
  const items = useCart(TAKEOUT, (s) => s.items)
  const name = useCustomer((s) => s.name)
  const phone = useCustomer((s) => s.phone)
  const openState = useOpenState()
  const { sending, notice, confirm } = useConfirmTakeout()
  const desktop = useIsDesktop()

  // Sin pedido no hay resumen; sin datos, primero "Tus datos" (salvo mientras se envía).
  // D4 (computadora): datos y pago en esta misma pantalla, con el resumen al lado.
  if (desktop) return <SummaryDesktop />
  if (!sending && items.length === 0) return <Navigate to={paths.menu(TAKEOUT)} replace />
  if (!sending && (!isValidName(name) || !isValidPhone(phone))) return <Navigate to={paths.data} replace />

  const total = cartTotal(items)

  return (
    <>
      <div className="app-shell">
        <PageHeader
          title={t.web.summaryTitle}
          subtitle={fmt(t.web.summarySubtitle, { name: name.trim() })}
          onBack={goBack}
        />
        <main className="flex flex-col gap-4 px-4 pt-2 tablet:px-8">
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


          <PayOptions />

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

import { useRef, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../components/Button'
import { CustomerFields } from '../components/CustomerFields'
import { DesktopNav } from '../components/DesktopNav'
import { PayOptions } from '../components/PayOptions'
import { Toast } from '../components/Toast'
import { TAKEOUT } from '../lib/channel'
import { getDish, getExtra, getSide, restaurant } from '../lib/catalog'
import { formatMoney } from '../lib/money'
import { fmt, t } from '../lib/text'
import { useConfirmTakeout } from '../lib/useConfirmTakeout'
import { useOpenState } from '../lib/useOpenState'
import { paths } from '../lib/useMesa'
import { cartTotal, lineTotal, useCart } from '../store/cart'
import { checkCustomer } from '../store/customer'

/**
 * D4 Datos y pago (computadora): a la izquierda, tus datos y cómo pagás; a la
 * derecha, el resumen con "Confirmar pedido" (valida los datos y envía).
 */
export function SummaryDesktop() {
  const items = useCart(TAKEOUT, (s) => s.items)
  const openState = useOpenState()
  const { sending, notice, confirm } = useConfirmTakeout()
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const [tried, setTried] = useState(false)
  const total = cartTotal(items)

  // Sin pedido vuelve al menú (salvo mientras se envía: al enviar, el carrito se vacía).
  if (!sending && items.length === 0) return <Navigate to={paths.menu(TAKEOUT)} replace />

  const confirmHere = () => {
    setTried(true)
    if (checkCustomer(nameRef, phoneRef)) void confirm()
  }

  return (
    <>
      <DesktopNav action="none" />
      <main className="mx-auto flex max-w-[1040px] items-start gap-12 px-6 py-8">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Link to={paths.menu(TAKEOUT)} className="inline-flex min-h-11 items-center gap-2 self-start text-dish text-verde hover:underline">
            <ArrowLeft size={18} strokeWidth={2} aria-hidden />
            {t.web.backToMenu}
          </Link>
          <h1 className="text-title-lg text-texto">{t.web.dataTitle}</h1>
          <CustomerFields tried={tried} nameRef={nameRef} phoneRef={phoneRef} columns />
          <p className="text-small text-texto-2">{t.web.rememberDesktop}</p>
          <div className="mt-4">
            <PayOptions />
          </div>
        </div>

        <aside className="sticky top-[96px] w-[400px] shrink-0">
          <section aria-labelledby="resumen-d" className="flex flex-col gap-3 rounded-grande border border-borde bg-tarjeta p-6">
            <h2 id="resumen-d" className="text-section text-texto">
              {t.web.summaryTitle}
            </h2>
            <ul className="flex flex-col gap-2">
              {items.map((line) => {
                const dish = getDish(line.dishId)
                const details = [
                  getSide(line.sideId)?.name,
                  ...line.extraIds.map((id) => getExtra(id)?.shortName ?? getExtra(id)?.name),
                  line.note,
                ].filter(Boolean)
                return (
                  <li key={line.lineId} className="flex gap-2 text-body">
                    <span className="shrink-0 text-texto-2">{line.quantity}×</span>
                    <span className="min-w-0 flex-1 text-texto">
                      {dish?.name}
                      {details.length > 0 && <span className="text-texto-2"> · {details.join(' · ')}</span>}
                    </span>
                    <span className="shrink-0 text-texto">{formatMoney(lineTotal(line))}</span>
                  </li>
                )
              })}
            </ul>
            <hr className="border-borde" />
            <p className="flex justify-between text-section text-texto">
              <span>{t.web.total}</span>
              <span>{formatMoney(total)}</span>
            </p>
            <p className="text-small text-texto-2">{t.web.orderSubtitleTablet}</p>
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
            {openState.open ? (
              <Button block onClick={confirmHere} disabled={sending} trailing={formatMoney(total)}>
                {sending ? t.web.confirming : t.web.confirm}
              </Button>
            ) : (
              <Button block disabled>
                {fmt(t.closed.button, { open: openState.opensAt ?? '' })}
              </Button>
            )}
            <p className="text-center text-small text-texto-2">{t.web.summaryWhatsNote}</p>
          </section>
        </aside>
      </main>
    </>
  )
}

import { useId } from 'react'
import { MapPin } from 'lucide-react'
import { PageHeader } from '../components/Header'
import { BottomDock, DockSpacer } from '../components/CartBar'
import { NoticeBanner } from '../components/NoticeBanner'
import { restaurant } from '../lib/catalog'
import { formatMoney } from '../lib/money'
import { t } from '../lib/text'
import { useGoBack } from '../lib/useGoBack'
import { paths } from '../lib/useMesa'

/** W9 Domicilio: diseñado pero no activo. Se ve cómo será, con todo deshabilitado. */
export function Delivery() {
  const goBack = useGoBack(paths.home)
  const addressId = useId()
  const referenceId = useId()
  const field = 'w-full rounded-tarjeta border border-borde bg-fondo px-3 text-body text-texto-2 placeholder:text-texto-2'

  return (
    <>
      <div className="app-shell">
        <PageHeader title={t.web.deliveryPageTitle} subtitle={t.web.deliverySubtitle} onBack={goBack} />
        <main className="flex flex-col gap-4 px-4 pt-2 tablet:px-8">
          <NoticeBanner tone="pronto" title={t.web.deliveryNoticeTitle} body={t.web.deliveryNoticeBody} />

          <div className="flex flex-col gap-2">
            <label htmlFor={addressId} className="text-dish text-texto-2">
              {t.web.deliveryAddress}
            </label>
            <textarea
              id={addressId}
              disabled
              rows={2}
              placeholder={t.web.deliveryAddressExample}
              className={`${field} h-[72px] resize-none pt-3`}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={referenceId} className="text-dish text-texto-2">
              {t.web.deliveryReference}
            </label>
            <input
              id={referenceId}
              type="text"
              disabled
              placeholder={t.web.deliveryReferenceExample}
              className={`${field} h-12`}
            />
          </div>

          <div
            role="img"
            aria-label={t.web.deliveryMap}
            className="grid h-[140px] place-items-center rounded-grande bg-foto-vacia"
          >
            <MapPin size={24} strokeWidth={1.8} aria-hidden className="text-texto-2" />
          </div>

          <p className="flex justify-between text-body text-texto-2">
            <span>{t.web.deliveryFee}</span>
            <span>{formatMoney(restaurant.web.deliveryFee)}</span>
          </p>

          <DockSpacer />
        </main>
      </div>

      <BottomDock>
        <button type="button" disabled className="h-[52px] w-full rounded-grande bg-foto-vacia text-button text-texto-2">
          {t.web.deliveryCta}
        </button>
      </BottomDock>
    </>
  )
}

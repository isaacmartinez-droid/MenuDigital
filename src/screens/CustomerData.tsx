import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { PageHeader } from '../components/Header'
import { BottomDock, DockSpacer } from '../components/CartBar'
import { Button } from '../components/Button'
import { CustomerFields } from '../components/CustomerFields'
import { checkCustomer } from '../store/customer'
import { TAKEOUT } from '../lib/channel'
import { t } from '../lib/text'
import { useGoBack } from '../lib/useGoBack'
import { paths } from '../lib/useMesa'
import { useCart } from '../store/cart'

const FORM_ID = 'tus-datos'

/**
 * W5 Tus datos (para llevar): nombre y WhatsApp para confirmar antes de
 * cocinar. No hay cuenta: se recuerdan en este teléfono.
 */
export function CustomerData() {
  const navigate = useNavigate()
  const goBack = useGoBack(paths.order(TAKEOUT))
  const hasItems = useCart(TAKEOUT, (s) => s.items.length > 0)
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  /** Los errores se muestran recién después de tocar "Continuar". */
  const [tried, setTried] = useState(false)

  if (!hasItems) return <Navigate to={paths.menu(TAKEOUT)} replace />

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (checkCustomer(nameRef, phoneRef)) navigate(paths.summary)
  }

  return (
    <>
      <div className="app-shell">
        <PageHeader title={t.web.dataTitle} subtitle={t.web.dataSubtitle} onBack={goBack} />
        <main className="px-4 pt-2 tablet:px-8">
          <form id={FORM_ID} noValidate onSubmit={submit} className="flex flex-col gap-4">
            <CustomerFields tried={tried} nameRef={nameRef} phoneRef={phoneRef} phoneHelp={t.web.phoneHelp} />
            <p className="text-small text-texto-2">{t.web.remember}</p>
          </form>
          <DockSpacer />
        </main>
      </div>

      <BottomDock>
        <Button block type="submit" form={FORM_ID}>
          {t.web.continue}
        </Button>
      </BottomDock>
    </>
  )
}

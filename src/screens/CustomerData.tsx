import { useId, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { PageHeader } from '../components/Header'
import { BottomDock, DockSpacer } from '../components/CartBar'
import { Button } from '../components/Button'
import { TAKEOUT } from '../lib/channel'
import { restaurant } from '../lib/catalog'
import { cx } from '../lib/cx'
import { fmt, t } from '../lib/text'
import { useGoBack } from '../lib/useGoBack'
import { paths } from '../lib/useMesa'
import { useCart } from '../store/cart'
import { formatPhone, isValidName, isValidPhone, useCustomer } from '../store/customer'

/**
 * W5 Tus datos (para llevar): nombre y WhatsApp para confirmar antes de
 * cocinar. No hay cuenta: se recuerdan en este teléfono.
 */
export function CustomerData() {
  const navigate = useNavigate()
  const goBack = useGoBack(paths.order(TAKEOUT))
  const hasItems = useCart(TAKEOUT, (s) => s.items.length > 0)
  const name = useCustomer((s) => s.name)
  const phone = useCustomer((s) => s.phone)
  const id = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  /** Los errores se muestran recién después de tocar "Continuar". */
  const [tried, setTried] = useState(false)

  if (!hasItems) return <Navigate to={paths.menu(TAKEOUT)} replace />

  const nameOk = isValidName(name)
  const phoneOk = isValidPhone(phone)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (!nameOk) return nameRef.current?.focus()
    if (!phoneOk) return phoneRef.current?.focus()
    useCustomer.getState().setName(name.trim())
    navigate(paths.summary)
  }

  const box = (invalid: boolean) =>
    cx(
      'mt-2 h-12 w-full rounded-tarjeta bg-tarjeta px-3 text-body text-texto outline-none placeholder:text-texto-2',
      // Con error queda en rojo aunque tenga el foco; si no, el foco lo marca en verde.
      invalid ? 'border-2 border-promo' : 'border border-borde focus:border-2 focus:border-verde',
    )

  return (
    <>
      <div className="app-shell">
        <PageHeader title={t.web.dataTitle} subtitle={t.web.dataSubtitle} onBack={goBack} />
        <main className="px-4 pt-2">
          <form id={`${id}-form`} noValidate onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label htmlFor={`${id}-nombre`} className="text-dish text-texto">
                {t.web.nameLabel}
              </label>
              <input
                ref={nameRef}
                id={`${id}-nombre`}
                type="text"
                value={name}
                onChange={(e) => useCustomer.getState().setName(e.target.value)}
                placeholder={t.web.namePlaceholder}
                autoComplete="name"
                autoCapitalize="words"
                maxLength={30}
                enterKeyHint="next"
                aria-invalid={tried && !nameOk}
                aria-describedby={tried && !nameOk ? `${id}-nombre-e` : undefined}
                className={box(tried && !nameOk)}
              />
              {tried && !nameOk && (
                <p id={`${id}-nombre-e`} className="mt-2 text-small text-promo">
                  {t.web.nameError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={`${id}-whatsapp`} className="text-dish text-texto">
                {t.web.phoneLabel}
              </label>
              <input
                ref={phoneRef}
                id={`${id}-whatsapp`}
                type="tel"
                inputMode="numeric"
                value={formatPhone(phone)}
                onChange={(e) => useCustomer.getState().setPhone(e.target.value)}
                placeholder={t.web.phonePlaceholder}
                autoComplete="tel-national"
                enterKeyHint="done"
                aria-invalid={tried && !phoneOk}
                aria-describedby={`${id}-whatsapp-h${tried && !phoneOk ? ` ${id}-whatsapp-e` : ''}`}
                className={box(tried && !phoneOk)}
              />
              <p id={`${id}-whatsapp-h`} className="mt-2 text-small text-texto-2">
                {t.web.phoneHelp}
              </p>
              {tried && !phoneOk && (
                <p id={`${id}-whatsapp-e`} className="mt-1 text-small text-promo">
                  {fmt(t.web.phoneError, { digits: restaurant.web.phoneDigits })}
                </p>
              )}
            </div>

            <p className="text-small text-texto-2">{t.web.remember}</p>
          </form>
          <DockSpacer />
        </main>
      </div>

      <BottomDock>
        <Button block type="submit" form={`${id}-form`}>
          {t.web.continue}
        </Button>
      </BottomDock>
    </>
  )
}

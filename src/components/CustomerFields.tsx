import { useId, type RefObject } from 'react'
import { restaurant } from '../lib/catalog'
import { cx } from '../lib/cx'
import { fmt, t } from '../lib/text'
import { formatPhone, isValidName, isValidPhone, useCustomer } from '../store/customer'

interface CustomerFieldsProps {
  /** Los errores se muestran recién después de intentar seguir. */
  tried: boolean
  nameRef: RefObject<HTMLInputElement | null>
  phoneRef: RefObject<HTMLInputElement | null>
  /** Tablet (T4): nombre y WhatsApp lado a lado. */
  columns?: boolean
  /** Ayuda del WhatsApp (en T4 va una sola nota debajo, sin esta ayuda). */
  phoneHelp?: string
}

/** Nombre y WhatsApp del cliente para llevar (W5 y T4). Se guardan en el teléfono. */
export function CustomerFields({ tried, nameRef, phoneRef, columns = false, phoneHelp }: CustomerFieldsProps) {
  const id = useId()
  const name = useCustomer((s) => s.name)
  const phone = useCustomer((s) => s.phone)
  const nameBad = tried && !isValidName(name)
  const phoneBad = tried && !isValidPhone(phone)

  const box = (invalid: boolean) =>
    cx(
      'mt-2 h-12 w-full rounded-tarjeta bg-tarjeta px-3 text-body text-texto outline-none placeholder:text-texto-2',
      // Con error queda en rojo aunque tenga el foco; si no, el foco lo marca en verde.
      invalid ? 'border-2 border-promo' : 'border border-borde focus:border-2 focus:border-verde',
    )
  const describedBy = [phoneHelp ? `${id}-whatsapp-h` : '', phoneBad ? `${id}-whatsapp-e` : ''].filter(Boolean).join(' ')

  return (
    <div className={cx('grid gap-4', columns && 'grid-cols-2')}>
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
          aria-invalid={nameBad}
          aria-describedby={nameBad ? `${id}-nombre-e` : undefined}
          className={box(nameBad)}
        />
        {nameBad && (
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
          aria-invalid={phoneBad}
          aria-describedby={describedBy || undefined}
          className={box(phoneBad)}
        />
        {phoneHelp && (
          <p id={`${id}-whatsapp-h`} className="mt-2 text-small text-texto-2">
            {phoneHelp}
          </p>
        )}
        {phoneBad && (
          <p id={`${id}-whatsapp-e`} className="mt-1 text-small text-promo">
            {fmt(t.web.phoneError, { digits: restaurant.web.phoneDigits })}
          </p>
        )}
      </div>
    </div>
  )
}

import { useEffect, useId, useRef } from 'react'
import { Button } from '../components/Button'
import { restaurant } from '../lib/catalog'
import { fmt, t } from '../lib/text'
import { cartStore, useCart } from '../store/cart'

interface WelcomeProps {
  mesa: string
  onDone: () => void
}

/**
 * M0 Bienvenida: aparece solo la primera vez de la sesión en esa mesa.
 * No se quita sola: muestra la mesa, pide el nombre (opcional) y se entra
 * con "Entrar al menú". El nombre queda en el carrito de la mesa y es el
 * que lleva la comanda; en "Tu pedido" se puede cambiar.
 */
export function Welcome({ mesa, onDone }: WelcomeProps) {
  const customerName = useCart(mesa, (s) => s.customerName)
  const nameId = useId()
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Foco en la portada (sin abrir el teclado) para que se anuncie al entrar.
    dialogRef.current?.focus()
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="focus-on-dark fixed inset-0 z-50 animate-fade-in overflow-y-auto bg-verde text-blanco outline-none"
    >
      <form
        className="app-shell flex min-h-full flex-col px-6 text-center"
        onSubmit={(e) => {
          e.preventDefault()
          onDone()
        }}
      >
        <div className="flex flex-1 flex-col items-center justify-center pt-8 pb-6 short:pt-5">
          <picture className="block h-[164px] w-[212px] rounded-grande bg-tarjeta p-4 short:h-[118px] short:w-[152px] short:p-3">
            <source srcSet={restaurant.logo.webp} type="image/webp" />
            <img
              src={restaurant.logo.png}
              alt={restaurant.logo.alt}
              width={382}
              height={279}
              className="h-full w-full object-contain"
            />
          </picture>
          <p className="mt-[42px] text-section font-normal short:mt-6">{t.welcome.greeting}</p>
          <h1 id={titleId} className="mt-[18px] text-display short:mt-2">
            {restaurant.name}
          </h1>
          <p className="mt-4 inline-flex h-9 items-center rounded-completo bg-tarjeta px-4 text-dish text-verde">
            {fmt(t.welcome.table, { mesa })}
          </p>
          <p className="mt-4 text-body">{t.welcome.lead}</p>

          <div className="mt-8 w-full text-left short:mt-6">
            <label htmlFor={nameId} className="text-dish">
              {t.welcome.nameLabel} <span className="font-normal text-blanco/80">{t.welcome.nameOptional}</span>
            </label>
            <input
              id={nameId}
              type="text"
              value={customerName}
              onChange={(e) => cartStore(mesa).getState().setCustomerName(e.target.value)}
              placeholder={t.welcome.namePlaceholder}
              aria-describedby={`${nameId}-h`}
              autoComplete="given-name"
              autoCapitalize="words"
              maxLength={30}
              enterKeyHint="go"
              className="mt-2 h-12 w-full rounded-tarjeta bg-tarjeta px-3 text-body text-texto outline-none placeholder:text-texto-2 focus-visible:outline-3 focus-visible:outline-ambar"
            />
            <p id={`${nameId}-h`} className="mt-2 text-small text-blanco/80">
              {t.welcome.nameHelp}
            </p>
          </div>
        </div>

        <div className="pb-6">
          <Button type="submit" variant="onDark" block>
            {t.welcome.enter}
          </Button>
        </div>
      </form>
    </div>
  )
}

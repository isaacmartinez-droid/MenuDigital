import { useEffect, useId, useRef } from 'react'
import { restaurant } from '../lib/catalog'
import { t } from '../lib/text'

interface WebWelcomeProps {
  onDone: () => void
}

/**
 * W0 Bienvenida de la web: solo la primera vez en este teléfono. Se quita sola
 * a los timings.webWelcomeMs (2 s) o al tocar en cualquier parte.
 */
export function WebWelcome({ onDone }: WebWelcomeProps) {
  const titleId = useId()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.focus()
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const id = window.setTimeout(onDone, restaurant.timings.webWelcomeMs)
    return () => {
      window.clearTimeout(id)
      document.body.style.overflow = overflow
    }
  }, [onDone])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      onClick={onDone}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') onDone()
      }}
      className="focus-on-dark fixed inset-0 z-50 animate-fade-in cursor-pointer overflow-y-auto bg-verde text-blanco outline-none"
    >
      <div className="app-shell flex min-h-full flex-col px-8 text-center">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 pt-8">
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
          <p className="mt-2 text-section font-normal">{t.welcome.greeting}</p>
          <h1 id={titleId} className="text-display">
            {restaurant.name}
          </h1>
          <p className="text-body">{t.web.welcomeLead}</p>
        </div>

        <div className="flex flex-col items-center gap-2 py-8">
          <span aria-hidden className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-2 rounded-completo bg-blanco/50 first:bg-ambar" />
            ))}
          </span>
          <button type="button" onClick={onDone} className="min-h-10 px-2 text-small">
            {t.web.welcomeHint}
          </button>
        </div>
      </div>
    </div>
  )
}

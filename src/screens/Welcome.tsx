import { useEffect, useRef } from 'react'
import { restaurant } from '../lib/catalog'
import { fmt, t } from '../lib/text'

interface WelcomeProps {
  mesa: string
  onDone: () => void
}

/**
 * M0 Bienvenida: aparece solo la primera vez de la sesión en esa mesa
 * y se quita sola a los 1.5 s (config: timings.welcomeMs) o al tocar.
 */
export function Welcome({ mesa, onDone }: WelcomeProps) {
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  })

  useEffect(() => {
    const id = window.setTimeout(() => doneRef.current(), restaurant.timings.welcomeMs)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(id)
      document.body.style.overflow = overflow
    }
  }, [])

  return (
    <div
      className="focus-on-dark fixed inset-0 z-50 flex animate-fade-in flex-col bg-verde text-blanco"
      onClick={onDone}
    >
      <div className="app-shell flex flex-1 flex-col px-6 text-center">
        <div className="flex flex-1 flex-col items-center justify-center pb-8">
          <picture className="block h-[164px] w-[212px] rounded-grande bg-tarjeta p-4">
            <source srcSet={restaurant.logo.webp} type="image/webp" />
            <img
              src={restaurant.logo.png}
              alt={restaurant.logo.alt}
              width={382}
              height={279}
              className="h-full w-full object-contain"
            />
          </picture>
          <p className="mt-[42px] text-section font-normal">{t.welcome.greeting}</p>
          <h1 className="mt-[18px] text-display">{restaurant.name}</h1>
          <p className="mt-4 inline-flex h-9 items-center rounded-completo bg-tarjeta px-4 text-dish text-verde">
            {fmt(t.welcome.table, { mesa })}
          </p>
          <p className="mt-4 text-body">{t.welcome.lead}</p>
        </div>

        <div className="flex flex-col items-center pb-4">
          <div aria-hidden className="flex gap-2">
            <span className="size-2 rounded-completo bg-ambar" />
            <span className="size-2 rounded-completo bg-blanco/40" />
            <span className="size-2 rounded-completo bg-blanco/40" />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDone()
            }}
            className="-mt-2 min-h-12 px-4 text-small text-blanco/90"
          >
            {t.welcome.hint}
          </button>
        </div>
      </div>
    </div>
  )
}

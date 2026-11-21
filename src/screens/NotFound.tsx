import { Link } from 'react-router'
import { SearchX } from 'lucide-react'
import { restaurant } from '../lib/catalog'
import { t } from '../lib/text'
import { paths } from '../lib/useMesa'

/** Web: una dirección que no existe. "Página no encontrada" con botón al inicio. */
export function NotFound() {
  return (
    <main className="app-shell flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <picture className="mb-8 block w-40 overflow-hidden rounded-grande bg-tarjeta p-3">
        <source srcSet={restaurant.logo.webp} type="image/webp" />
        <img src={restaurant.logo.png} alt={restaurant.logo.alt} width={382} height={279} className="h-auto w-full" />
      </picture>
      <span aria-hidden className="mb-4 grid size-14 place-items-center rounded-completo bg-foto-vacia text-texto-2">
        <SearchX size={28} />
      </span>
      <h1 className="text-title text-texto">{t.notFound.title}</h1>
      <p className="mt-2 max-w-72 text-body text-texto-2">{t.notFound.body}</p>
      <Link
        to={paths.home}
        className="focus-on-dark mt-6 inline-flex h-[52px] items-center rounded-grande bg-verde px-6 text-button text-blanco"
      >
        {t.notFound.cta}
      </Link>
    </main>
  )
}

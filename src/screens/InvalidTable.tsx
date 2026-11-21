import { QrCode } from 'lucide-react'
import { restaurant } from '../lib/catalog'
import { t } from '../lib/text'

/** Se muestra si la mesa del QR no existe en la config. */
export function InvalidTable() {
  return (
    <main className="app-shell flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <picture className="mb-8 block w-40 overflow-hidden rounded-grande bg-tarjeta p-3">
        <source srcSet={restaurant.logo.webp} type="image/webp" />
        <img src={restaurant.logo.png} alt={restaurant.logo.alt} width={382} height={279} className="h-auto w-full" />
      </picture>
      <span aria-hidden className="mb-4 grid size-14 place-items-center rounded-completo bg-foto-vacia text-texto-2">
        <QrCode size={28} />
      </span>
      <h1 className="text-title text-texto">{t.invalidTable.title}</h1>
      <p className="mt-2 max-w-72 text-body text-texto-2">{t.invalidTable.body}</p>
    </main>
  )
}

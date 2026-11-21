import { ChevronLeft } from 'lucide-react'
import { cx } from '../lib/cx'
import { t } from '../lib/text'

interface HeaderProps {
  name: string
  logo: { webp: string; png: string; alt: string }
  open: boolean
  /** "Abierto · cierra 10:00 pm" o "Cerrado ahora · abrimos a las 4:00 pm" */
  statusText: string
  /** "Mesa 5" */
  tableText: string
}

/** Encabezado de marca: logo, nombre, estado del local y pastilla de mesa. */
export function Header({ name, logo, open, statusText, tableText }: HeaderProps) {
  return (
    <header className="flex items-center gap-3 px-4 pt-3 pb-3">
      <picture className="block h-[47px] w-16 shrink-0 overflow-hidden rounded-chico bg-tarjeta">
        <source srcSet={logo.webp} type="image/webp" />
        <img src={logo.png} alt={logo.alt} width={64} height={47} className="h-full w-full object-contain" />
      </picture>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-section text-texto">{name}</h1>
        <p className="mt-0.5 flex items-start gap-[5px] text-small text-texto-2">
          <span
            aria-hidden
            className={cx('mt-1 size-2 shrink-0 rounded-completo', open ? 'bg-verde' : 'bg-promo')}
          />
          <span>{statusText}</span>
        </p>
      </div>
      <span className="mt-2 -ml-2 inline-flex h-[31px] shrink-0 items-center self-start rounded-completo bg-verde-suave px-3 text-small font-medium text-verde">
        {tableText}
      </span>
    </header>
  )
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  onBack: () => void
}

/** Encabezado de página interna: botón atrás, título grande y subtítulo ("Tu pedido · Mesa 5"). */
export function PageHeader({ title, subtitle, onBack }: PageHeaderProps) {
  return (
    <header className="flex items-center gap-3 px-4 pt-3.5 pb-3">
      <button
        type="button"
        onClick={onBack}
        aria-label={t.common.back}
        className="relative grid size-10 shrink-0 place-items-center rounded-completo border border-borde bg-tarjeta text-texto before:absolute before:-inset-1 before:content-['']"
      >
        <ChevronLeft size={24} strokeWidth={2} aria-hidden />
      </button>
      <div className="min-w-0">
        <h1 className="text-title text-texto">{title}</h1>
        {subtitle && <p className="text-small text-texto-2">{subtitle}</p>}
      </div>
    </header>
  )
}

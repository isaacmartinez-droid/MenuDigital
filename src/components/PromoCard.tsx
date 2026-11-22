import type { Promo } from '../types/menu'
import { Tag } from './Tag'
import { thumbOf } from '../lib/images'

interface PromoCardProps {
  promo: Promo
  /** Texto de apoyo: en el menú "Hoy de 4 a 7 pm", en el inicio "Solo hoy, de 4 a 7 pm". */
  subtitle: string
  onClick: () => void
}

/** "Promo del día" de la web: tarjeta verde con etiqueta, título y foto a la derecha. */
export function PromoCard({ promo, subtitle, onClick }: PromoCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 overflow-hidden rounded-grande bg-verde pl-4 text-left text-blanco active:opacity-90 tablet:pl-5"
    >
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1 py-3 tablet:py-4">
        <Tag tone="promo">{promo.label}</Tag>
        <span className="text-section">{promo.title}</span>
        <span className="text-small">{subtitle}</span>
      </span>
      <img
        src={thumbOf(promo.image)}
        alt=""
        width={120}
        height={104}
        loading="lazy"
        className="h-[104px] w-[120px] shrink-0 self-stretch rounded-r-grande object-cover tablet:h-[112px] tablet:w-[180px]"
      />
    </button>
  )
}

/**
 * Las promos que se ven ahora: una ocupa todo el ancho; si hay más, van en una fila que
 * se desliza de costado (cada tarjeta al 85 %, para que se note que hay otra).
 */
export function PromoRow<P extends Promo & { id: string }>({ promos, onOpen }: { promos: P[]; onOpen: (promo: P) => void }) {
  if (promos.length === 1) {
    const [only] = promos
    return <PromoCard promo={only} subtitle={only.subtitle} onClick={() => onOpen(only)} />
  }
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 tablet:-mx-8 tablet:px-8">
      {promos.map((p) => (
        <li key={p.id} className="w-[85%] max-w-[480px] shrink-0 snap-start">
          <PromoCard promo={p} subtitle={p.subtitle} onClick={() => onOpen(p)} />
        </li>
      ))}
    </ul>
  )
}

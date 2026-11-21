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

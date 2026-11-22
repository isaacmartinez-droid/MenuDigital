import { Banknote, Bell, ShoppingBag } from 'lucide-react'
import type { Channel } from '../../types/order'
import { cx } from '../../lib/cx'

/** Colores del canal, como en el Figma: verde mesa, azul para llevar, gris mostrador. */
const styles: Record<Channel, { box: string; Icon: typeof Bell }> = {
  mesa: { box: 'bg-verde-suave text-verde', Icon: Bell },
  llevar: { box: 'bg-combo-fondo text-azul-logo', Icon: ShoppingBag },
  mostrador: { box: 'bg-fondo text-texto', Icon: Banknote },
}

/** Pastilla con el canal del pedido y dónde está: "Mesa 2 · Teléfono 1", "Para llevar · Ana". */
export function ChannelChip({ channel, label, className }: { channel: Channel; label: string; className?: string }) {
  const { box, Icon } = styles[channel]
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1 rounded-completo px-2 py-1 text-small font-medium whitespace-nowrap',
        box,
        className,
      )}
    >
      <Icon size={14} strokeWidth={1.6} aria-hidden />
      {label}
    </span>
  )
}

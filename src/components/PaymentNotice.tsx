import { Banknote } from 'lucide-react'
import { cx } from '../lib/cx'
import { t } from '../lib/text'

/**
 * Aviso ámbar de pago. En la mesa: "Pagás en caja al terminar" (en la cuenta).
 * Para llevar: "Pagás al recoger · No pagás nada ahora", en versión compacta
 * (W8b, cuando la comida está lista).
 */
export function PaymentNotice({ takeout = false }: { takeout?: boolean }) {
  return (
    <aside
      className={cx(
        'flex items-center gap-3 rounded-grande border-[1.5px] border-ambar bg-ambar-suave px-4',
        takeout ? 'py-2' : 'py-4',
      )}
    >
      <span
        aria-hidden
        className={cx(
          'grid shrink-0 place-items-center rounded-completo bg-ambar text-texto-sobre-ambar',
          takeout ? 'size-8' : 'size-11',
        )}
      >
        <Banknote size={takeout ? 18 : 22} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className={cx('text-texto-sobre-ambar', takeout ? 'text-dish' : 'text-section')}>
          {takeout ? t.web.payPickup : t.payment.title}
        </p>
        <p className={cx('text-small text-texto-sobre-ambar', !takeout && 'mt-1')}>
          {takeout ? t.web.payPickupNow : t.payment.body}
        </p>
      </div>
    </aside>
  )
}

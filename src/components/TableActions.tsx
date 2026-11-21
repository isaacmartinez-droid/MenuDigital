import { Banknote, Bell } from 'lucide-react'
import { cx } from '../lib/cx'
import { t } from '../lib/text'
import { Button } from './Button'

interface TableActionsProps {
  onCallWaiter: () => void
  onPay: () => void
  /** Ya se llamó hace poco: se ve apagado, pero al tocarlo dice cuánto falta. */
  waiterLocked: boolean
  className?: string
}

/** Botones de mesa: "Llamar al mesero" y "Ya vamos a pagar". */
export function TableActions({ onCallWaiter, onPay, waiterLocked, className }: TableActionsProps) {
  return (
    <div className={cx('grid grid-cols-2 gap-2', className)}>
      <Button
        variant="pill"
        aria-disabled={waiterLocked || undefined}
        onClick={onCallWaiter}
        className={cx(waiterLocked && 'text-texto-2')}
        icon={<Bell size={20} className={waiterLocked ? 'text-texto-2' : 'text-verde'} aria-hidden />}
      >
        {t.menu.callWaiter}
      </Button>
      <Button variant="pill" onClick={onPay} icon={<Banknote size={20} className="text-verde" aria-hidden />}>
        {t.menu.payNow}
      </Button>
    </div>
  )
}

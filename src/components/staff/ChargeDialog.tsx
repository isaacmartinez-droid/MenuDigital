import { useId, useRef, useState } from 'react'
import type { PayMethod } from '../../types/order'
import { Button } from '../Button'
import { Segmented } from './Segmented'
import { StaffDialog } from './StaffDialog'
import { cx } from '../../lib/cx'
import { formatMoney } from '../../lib/money'
import { fmt, t } from '../../lib/text'

interface ChargeDialogProps {
  /** "Cobrar Mesa 6" o "Cobrar a Ana". */
  title: string
  total: number
  /** Lo que dijo el cliente al avisar a caja (si lo dijo). */
  method: PayMethod | null
  cashGiven: number | null
  /** "Cobrar y cerrar mesa" o "Cobrar a Ana". */
  submitLabel: string
  onClose: () => void
  onCharge: (method: PayMethod, received: number | null) => void
}

/** Montos rápidos: exacto, la siguiente centena y el siguiente billete grande (510 → 510, 600, 1,000). */
function quickAmounts(total: number): number[] {
  const hundred = Math.ceil((total + 1) / 100) * 100
  const big = Math.ceil((hundred + 1) / 500) * 500
  return [...new Set([total, hundred, big])]
}

/**
 * P2b Cobrar: total, efectivo o tarjeta, cuánto recibió (con montos rápidos) y el
 * vuelto. "Imprimir ticket" queda marcado, pero todavía no hay impresora.
 */
export function ChargeDialog({ title, total, method: asked, cashGiven, submitLabel, onClose, onCharge }: ChargeDialogProps) {
  const c = t.staff.cashier
  const [method, setMethod] = useState<PayMethod>(asked ?? 'efectivo')
  const [received, setReceived] = useState(String(cashGiven ?? total))
  const [print, setPrint] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const amount = Number(received.replace(/\D/g, '')) || 0
  const cash = method === 'efectivo'
  const short = cash && amount < total

  return (
    <StaffDialog title={title} onClose={onClose} width={560} initialFocus={cash ? inputRef : undefined}>
      <div className="mt-4 flex flex-col gap-4 overflow-y-auto">
        <div className="flex items-center justify-between gap-4">
          <span className="text-section text-texto">{c.total}</span>
          <span className="text-display text-texto">{formatMoney(total)}</span>
        </div>

        <Segmented<PayMethod>
          label={c.method}
          value={method}
          onChange={setMethod}
          options={[
            { value: 'efectivo', label: c.cash },
            { value: 'tarjeta', label: c.card },
          ]}
        />

        {cash && (
          <>
            <div>
              <label htmlFor={`${id}-recibido`} className="text-dish text-texto">
                {c.received}
              </label>
              <input
                ref={inputRef}
                id={`${id}-recibido`}
                inputMode="numeric"
                value={received ? formatMoney(amount) : ''}
                onChange={(e) => setReceived(e.target.value.replace(/\D/g, ''))}
                aria-describedby={`${id}-cambio`}
                className="mt-2 h-12 w-full rounded-tarjeta border border-borde bg-tarjeta px-3 text-body text-texto outline-none focus:border-2 focus:border-verde"
              />
            </div>
            <div role="group" aria-label={c.quick} className="flex gap-2">
              {quickAmounts(total).map((q) => {
                const on = amount === q
                return (
                  <button
                    key={q}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setReceived(String(q))}
                    className={cx(
                      'min-h-12 flex-1 rounded-completo py-3 text-dish',
                      on ? 'bg-verde text-blanco' : 'border border-borde bg-tarjeta text-texto',
                    )}
                  >
                    {formatMoney(q)}
                  </button>
                )
              })}
            </div>
            <div
              id={`${id}-cambio`}
              aria-live="polite"
              className={cx(
                'flex items-center justify-between rounded-tarjeta p-4',
                short ? 'bg-ambar-suave text-texto-sobre-ambar' : 'bg-verde-suave text-verde',
              )}
            >
              {short ? (
                <span className="text-section">{fmt(c.missing, { amount: formatMoney(total - amount) })}</span>
              ) : (
                <>
                  <span className="text-section">{c.change}</span>
                  <span className="text-title-lg">{formatMoney(amount - total)}</span>
                </>
              )}
            </div>
          </>
        )}

        <label className="flex min-h-12 items-center gap-3 text-body text-texto">
          <input
            type="checkbox"
            checked={print}
            onChange={(e) => setPrint(e.target.checked)}
            className="size-[22px] accent-verde"
          />
          {c.printTicket}
        </label>
      </div>

      <Button block className="mt-4 shrink-0" disabled={short} onClick={() => onCharge(method, cash ? amount : null)}>
        {submitLabel}
      </Button>
    </StaffDialog>
  )
}

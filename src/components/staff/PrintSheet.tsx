import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { restaurant } from '../../lib/catalog'
import { formatMoney } from '../../lib/money'

export interface PrintLine {
  label: string
  amount?: number
  /** Texto a la derecha en vez de un monto. */
  value?: string
  strong?: boolean
}

interface PrintSheetProps {
  title: string
  /** Debajo del título (mesa, fecha). */
  lines: string[]
  rows: PrintLine[]
  totals: PrintLine[]
  footer?: ReactNode
  /** Se llama al cerrar la ventana de impresión. */
  onDone: () => void
}

/**
 * Ticket de 72 mm para imprimir desde caja (cuenta de la mesa, corte del día). Se
 * agrega al final de la página, abre la ventana de impresión del navegador y, al
 * cerrarla, avisa con onDone. En pantalla no se ve (`.print-area`).
 */
export function PrintSheet({ title, lines, rows, totals, footer, onDone }: PrintSheetProps) {
  useEffect(() => {
    const done = () => onDone()
    window.addEventListener('afterprint', done)
    const id = window.setTimeout(() => window.print(), 50)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('afterprint', done)
    }
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const row = (r: PrintLine, i: number) => (
    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontWeight: r.strong ? 700 : 400 }}>
      <span>{r.label}</span>
      <span>{r.value ?? (r.amount !== undefined ? formatMoney(r.amount) : '')}</span>
    </div>
  )

  return createPortal(
    <div className="print-area" aria-hidden>
      <p style={{ fontWeight: 700, fontSize: '14pt', textAlign: 'center' }}>{restaurant.name}</p>
      <p style={{ textAlign: 'center', marginBottom: 8 }}>{title}</p>
      {lines.map((l) => (
        <p key={l}>{l}</p>
      ))}
      <hr style={{ margin: '6px 0', borderTop: '1px dashed #000' }} />
      {rows.map(row)}
      <hr style={{ margin: '6px 0', borderTop: '1px dashed #000' }} />
      {totals.map(row)}
      {footer && <div style={{ marginTop: 10, textAlign: 'center' }}>{footer}</div>}
    </div>,
    document.body,
  )
}

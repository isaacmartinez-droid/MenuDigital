import { Navigate, useLocation } from 'react-router'
import { Check } from 'lucide-react'
import type { Receipt } from '../lib/api'
import { Header } from '../components/Header'
import { restaurant } from '../lib/catalog'
import { formatMoney } from '../lib/money'
import { fmt, t, tableLabel } from '../lib/text'
import { useOpenState } from '../lib/useOpenState'
import { paths, useMesa } from '../lib/useMesa'

/**
 * M6c Cuenta pagada: recibo (mesa, método, quién cobró). La mesa ya se cerró
 * y su estado se borró; el recibo llega por el estado de navegación.
 */
export function Paid() {
  const mesa = useMesa()
  const location = useLocation()
  const openState = useOpenState()
  const receipt = (location.state as { receipt?: Receipt } | null)?.receipt

  if (!receipt) return <Navigate to={paths.menu(mesa)} replace />

  return (
    <div className="app-shell">
      <Header
        name={restaurant.name}
        logo={restaurant.logo}
        open={openState.open}
        statusText={
          openState.open
            ? fmt(t.status.open, { close: openState.closesAt ?? '' })
            : fmt(t.status.closed, { open: openState.opensAt ?? '' })
        }
        tableText={tableLabel(mesa)}
      />
      <main className="px-4 pt-4 text-center">
        <span aria-hidden className="mx-auto grid size-16 animate-pop-in place-items-center rounded-completo bg-verde text-blanco">
          <Check size={30} strokeWidth={3} />
        </span>
        <h1 className="mt-3.5 text-title text-texto">{t.paid.title}</h1>
        <p className="mt-3 text-body text-texto-2">{t.paid.subtitle}</p>

        <dl className="mt-4 space-y-2 rounded-grande border border-borde bg-tarjeta px-4 py-4 text-left">
          <Row label={fmt(t.paid.table, { mesa: receipt.tableId })} value={formatMoney(receipt.total)} />
          <Row label={t.paid.method} value={receipt.method} />
          <Row label={t.paid.cashier} value={fmt(t.paid.cashierValue, { cashier: receipt.cashier })} />
        </dl>

        <p className="mt-4 px-2 text-small text-texto-2">{t.paid.closedNote}</p>
      </main>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-body text-texto-2">{label}</dt>
      <dd className="text-dish text-texto">{value}</dd>
    </div>
  )
}

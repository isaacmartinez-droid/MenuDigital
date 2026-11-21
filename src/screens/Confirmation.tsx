import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Header } from '../components/Header'
import { BottomDock, DockSpacer } from '../components/CartBar'
import { Button } from '../components/Button'
import { TAKEOUT } from '../lib/channel'
import { restaurant } from '../lib/catalog'
import { itemDetails } from '../lib/comandaStatus'
import { formatMoney } from '../lib/money'
import { fmt, t } from '../lib/text'
import { useOpenState } from '../lib/useOpenState'
import { paths } from '../lib/useMesa'
import { useComandas } from '../store/comandas'

/**
 * W7 Confirmación (para llevar): la comanda "de papel" con su número, y que se
 * le escribe por WhatsApp para confirmar. Pasa sola al seguimiento a los
 * timings.webConfirmMs (5 s) o con "Seguir mi pedido".
 */
export function Confirmation() {
  const navigate = useNavigate()
  const { comandaId = '' } = useParams()
  const comanda = useComandas(TAKEOUT, (s) => s.comandas.find((c) => c.id === comandaId))
  const openState = useOpenState()
  const follow = () => navigate(paths.tracking(TAKEOUT, comandaId), { replace: true })

  // Depende de que exista, no del objeto: si cambia de estado mientras tanto, el reloj no se reinicia.
  const exists = Boolean(comanda)
  useEffect(() => {
    if (!exists) return
    const id = window.setTimeout(
      () => navigate(paths.tracking(TAKEOUT, comandaId), { replace: true }),
      restaurant.timings.webConfirmMs,
    )
    return () => window.clearTimeout(id)
  }, [exists, comandaId, navigate])

  if (!comanda) return <Navigate to={paths.menu(TAKEOUT)} replace />

  return (
    <>
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
          tableText={t.web.place}
        />
        <main className="flex flex-col items-center gap-4 px-4 pt-4 text-center">
          <h1 className="text-title text-texto">
            {t.web.confirmTitle}
          </h1>

          {/* Comanda "de papel" */}
          <section
            aria-label={comanda.id}
            className="flex w-full flex-col items-center gap-3 rounded-chico border border-borde bg-tarjeta p-6 text-left"
          >
            <p className="text-small tracking-[0.12em] text-texto-2 uppercase">{t.web.ticketLabel}</p>
            <p className="font-mano text-comanda-lg font-bold text-verde">{comanda.id}</p>
            <hr className="w-full border-borde" />
            <ul className="flex w-full flex-col gap-2">
              {comanda.items.map((item, i) => {
                const details = itemDetails(item)
                return (
                  <li key={i} className="flex gap-2">
                    <span className="w-6 shrink-0 text-dish text-texto">{item.quantity}×</span>
                    <span className="min-w-0 flex-1 text-body text-texto">
                      {item.name}
                      {details && <span className="text-texto-2"> · {details}</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
            <hr className="w-full border-borde" />
            <p className="flex w-full items-center justify-between gap-3">
              <span className="text-small text-texto-2">{fmt(t.web.payLine, { name: comanda.customerName })}</span>
              <span className="text-price text-texto">{formatMoney(comanda.total)}</span>
            </p>
          </section>

          <p role="status" className="text-body text-texto-2">
            {t.web.confirmBody}
          </p>
          <DockSpacer />
        </main>
      </div>

      <BottomDock>
        <Button block onClick={follow}>
          {t.web.follow}
        </Button>
      </BottomDock>
    </>
  )
}

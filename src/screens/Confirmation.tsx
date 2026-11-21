import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Header } from '../components/Header'
import { BottomDock, DockSpacer } from '../components/CartBar'
import { Button } from '../components/Button'
import { StatusCard } from '../components/StatusCard'
import { DesktopNav } from '../components/DesktopNav'
import { useIsDesktop } from '../lib/useMediaQuery'
import { MapPin, MessageCircle } from 'lucide-react'
import { useNow } from '../lib/useNow'
import { whatsappHref } from '../lib/whatsapp'
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
  const now = useNow(30_000)
  const desktop = useIsDesktop()
  const follow = () => navigate(paths.tracking(TAKEOUT, comandaId), { replace: true })

  // Depende de que exista, no del objeto: si cambia de estado mientras tanto, el reloj no se reinicia.
  const exists = Boolean(comanda)
  useEffect(() => {
    // En tablet (T5) la confirmación ya muestra el seguimiento al lado: no hace falta pasar.
    if (!exists || window.matchMedia('(min-width: 768px)').matches) return
    const id = window.setTimeout(
      () => navigate(paths.tracking(TAKEOUT, comandaId), { replace: true }),
      restaurant.timings.webConfirmMs,
    )
    return () => window.clearTimeout(id)
  }, [exists, comandaId, navigate])

  if (!comanda) return <Navigate to={paths.menu(TAKEOUT)} replace />

  return (
    <>
      {desktop && <DesktopNav action="none" />}
      <div className="app-shell">
        <div className="desktop:hidden">
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
        </div>
        <main className="flex flex-col items-center gap-4 px-4 pt-4 text-center tablet:items-stretch tablet:gap-6 tablet:px-8 tablet:pt-6 tablet:text-left desktop:mx-auto desktop:max-w-[1040px] desktop:px-6 desktop:pt-10">
          <h1 className="text-title text-texto tablet:text-title-lg desktop:text-display">{t.web.confirmTitle}</h1>

          {/* Celular: el texto va debajo de la comanda; tablet (T5): debajo del título. */}
          <p role="status" className="order-2 text-body text-texto-2 tablet:order-none tablet:-mt-4 desktop:text-section desktop:font-normal">
            {t.web.confirmBody}
          </p>

          {/* T5: la comanda y el seguimiento lado a lado. */}
          <div className="order-1 grid w-full items-start gap-6 tablet:order-none tablet:grid-cols-2 desktop:gap-8">
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
            <div className="hidden tablet:flex tablet:flex-col tablet:gap-4">
              <StatusCard comanda={comanda} mesa={TAKEOUT} now={now} headingLevel="h2" />
              {/* D5: los botones van debajo del seguimiento (no hay barra abajo). */}
              <div className="hidden desktop:block">
                <PickupLinks />
              </div>
            </div>
          </div>
          <div className="order-3 tablet:order-none">
            <DockSpacer />
          </div>
        </main>
      </div>

      <BottomDock className="desktop:hidden">
        <div className="tablet:hidden">
          <Button block onClick={follow}>
            {t.web.follow}
          </Button>
        </div>
        {/* T5: cómo llegar y escribir por WhatsApp. */}
        <div className="hidden tablet:block">
          <PickupLinks />
        </div>
      </BottomDock>
    </>
  )
}

/** "Cómo llegar" y "Escribinos" por WhatsApp (T5 en la barra de abajo; D5 debajo del seguimiento). */
function PickupLinks() {
  const button =
    'inline-flex h-[52px] flex-1 items-center justify-center gap-2 rounded-grande border border-borde bg-tarjeta text-button text-texto hover:border-texto-2'
  return (
    <div className="flex gap-3">
      <a href={restaurant.web.mapsUrl} target="_blank" rel="noopener noreferrer" className={button}>
        <MapPin size={20} strokeWidth={1.8} aria-hidden />
        {t.web.directions}
        <span className="sr-only"> {t.web.newTab}</span>
      </a>
      {whatsappHref() && (
        <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className={button}>
          <MessageCircle size={20} strokeWidth={1.8} aria-hidden />
          {t.closed.whatsapp}
          <span className="sr-only"> {t.web.newTab}</span>
        </a>
      )}
    </div>
  )
}

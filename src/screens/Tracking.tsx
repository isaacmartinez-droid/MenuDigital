import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { BellRing, ChevronRight, Plus } from 'lucide-react'
import { cx } from '../lib/cx'
import { formatMoney } from '../lib/money'
import { useNow } from '../lib/useNow'
import { etaFor, sentAtClock, statusLabel } from '../lib/comandaStatus'
import { enableNotifications, notificationPermission } from '../lib/notifications'
import { readItem, tableKey, writeItem } from '../lib/storage'
import type { Substitute } from '../types/menu'
import type { Comanda as ComandaModel } from '../types/order'
import { Header } from '../components/Header'
import { TrackingBar } from '../components/TrackingBar'
import { Comanda } from '../components/Comanda'
import { SoldOutSheet } from '../components/SoldOutSheet'
import { NoticeBanner } from '../components/NoticeBanner'
import { BottomDock, DockSpacer } from '../components/CartBar'
import { Button } from '../components/Button'
import { getDish, restaurant } from '../lib/catalog'
import { fmt, t, tableLabel } from '../lib/text'
import { replaceComponent } from '../lib/api'
import { clearAgotado, useDemoFlags } from '../lib/demoFlags'
import { useOpenState } from '../lib/useOpenState'
import { useLiveComanda } from '../lib/useLiveComanda'
import { useOnline } from '../lib/useOnline'
import { paths, useMesa } from '../lib/useMesa'
import { comandasStore, useComandas } from '../store/comandas'

/** Estado de una orden en pastilla: verde en curso, ámbar lista, gris entregada. */
function StatusChip({ status }: { status: ComandaModel['status'] }) {
  return (
    <span
      className={cx(
        'inline-flex h-6 shrink-0 items-center rounded-completo px-2.5 text-small font-medium whitespace-nowrap',
        status === 'entregada'
          ? 'bg-borde text-texto-2'
          : status === 'lista'
            ? 'bg-ambar-suave text-texto-sobre-ambar'
            : 'bg-verde-suave text-verde',
      )}
    >
      {statusLabel(status)}
    </span>
  )
}

/** M4g: primer plato de la comanda con una parte que puede agotarse en cocina. */
function findReplaceable(comanda: ComandaModel | undefined) {
  for (const item of comanda?.items ?? []) {
    const component = getDish(item.dishId)?.replaceable?.[0]
    if (component) return { item, component }
  }
  return null
}

/**
 * M4 Seguimiento de una comanda: Procesando → En el comal → ¡Ya está! → Entregada (M5).
 * Desde aquí se llama al mesero (M4d–M4f), se pide algo más o se va a pagar.
 * Con ?forzar=agotado sale la hoja "Se acabó el maduro" (M4g).
 */
export function Tracking() {
  const mesa = useMesa()
  const navigate = useNavigate()
  const { comandaId = '' } = useParams()
  const comanda = useLiveComanda(mesa, comandaId)
  const comandas = useComandas(mesa, (s) => s.comandas)
  // Reloj para que "Lista en unos N min" baje solo mientras no se entregó.
  const now = useNow(30_000, comanda?.status !== 'entregada')
  const openState = useOpenState()
  const flags = useDemoFlags()
  const online = useOnline()
  const [notifyPerm, setNotifyPerm] = useState(notificationPermission)
  const [notifyDismissed, setNotifyDismissed] = useState(() => readItem('session', tableKey(mesa, 'avisos')) === 'no')
  const [notifyJustOn, setNotifyJustOn] = useState(false)

  useEffect(() => {
    if (!notifyJustOn) return
    const id = window.setTimeout(() => setNotifyJustOn(false), 4000)
    return () => window.clearTimeout(id)
  }, [notifyJustOn])

  const soldOut = findReplaceable(comanda)
  const alreadyReplaced = Boolean(
    soldOut &&
      comanda?.substitutions.some((s) => s.dishId === soldOut.item.dishId && s.componentId === soldOut.component.id),
  )
  const [soldOutDismissed, setSoldOutDismissed] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [replacedText, setReplacedText] = useState<string | null>(null)
  const showSoldOut = Boolean(
    flags.agotado && soldOut && comanda?.mine && comanda.status !== 'entregada' && !alreadyReplaced && !soldOutDismissed,
  )

  useEffect(() => {
    if (!replacedText) return
    const id = window.setTimeout(() => setReplacedText(null), 5000)
    return () => window.clearTimeout(id)
  }, [replacedText])

  if (!comanda) {
    return (
      <div className="app-shell px-4 pt-10 text-center">
        <p className="text-body text-texto-2">{t.tracking.notFound}</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate(paths.menu(mesa))}>
          {t.order.emptyCta}
        </Button>
      </div>
    )
  }

  const status = comanda.status
  const sentAt = fmt(t.tracking.sentAt, { time: sentAtClock(comanda) })
  // Mientras se prepara: hora estimada en rango, como las apps de delivery.
  const inProgress = status === 'recibida' || status === 'en-el-comal'
  const eta = etaFor(comanda, now)
  const headline = {
    recibida: { title: t.tracking.processingTitle, body: `${t.tracking.processingBody} · ${sentAt}` },
    'en-el-comal': {
      title: t.tracking.cookingTitle,
      body: `${fmt(t.tracking.etaIn, { from: eta.minFrom, to: eta.minTo })} · ${sentAt}`,
    },
    lista: { title: t.tracking.readyTitle, body: fmt(t.tracking.readyBody, { mesa }) },
    entregada: { title: t.tracking.deliveredTitle, body: t.tracking.deliveredBody },
  }[status]
  // Las demás órdenes de este teléfono (la más reciente primero) y el total de toda la mesa.
  const others = comandas.filter((c) => c.mine && c.id !== comanda.id).sort((a, b) => b.number - a.number)
  const accountTotal = comandas.reduce((sum, c) => sum + c.total, 0)

  const closeSoldOut = () => {
    clearAgotado()
    setSoldOutDismissed(true)
  }
  const replace = async (substitute: Substitute) => {
    if (!soldOut) return
    setReplacing(true)
    const sub = {
      dishId: soldOut.item.dishId,
      componentId: soldOut.component.id,
      componentName: soldOut.component.name,
      substituteId: substitute.id,
      substituteName: substitute.name.toLowerCase(),
      removes: substitute.removes,
      at: new Date().toISOString(),
    }
    try {
      await replaceComponent(mesa, { ...sub, comandaId: comanda.id })
      comandasStore(mesa).getState().addSubstitution(comanda.id, sub)
      setReplacedText(
        substitute.removes
          ? fmt(t.soldOut.doneNone, { dish: soldOut.item.name, component: soldOut.component.name })
          : fmt(t.soldOut.done, { component: soldOut.component.name, substitute: sub.substituteName }),
      )
      closeSoldOut()
    } finally {
      setReplacing(false)
    }
  }

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

      <main className="px-4 pt-2">
        {!online && (
          <NoticeBanner role="status" tone="aviso" title={t.offline.title} body={t.offline.trackingBody} className="mb-3" />
        )}
        {replacedText && (
          <NoticeBanner role="status" tone="positivo" title={t.soldOut.doneTitle} body={replacedText} className="mb-3" />
        )}

        <section className="rounded-grande border border-borde bg-tarjeta px-4 pt-4 pb-4" aria-labelledby="estado">
          {inProgress && (
            <div className="mb-2.5">
              <p className="text-small text-texto-2">{t.tracking.etaLabel}</p>
              <p className="text-title-lg text-texto tabular-nums">{eta.range}</p>
            </div>
          )}
          <div aria-live="polite">
            <h1 id="estado" className={cx('text-texto', inProgress ? 'text-section' : 'text-title')}>
              {headline.title}
            </h1>
            <p className="mt-1 text-body text-texto-2">{headline.body}</p>
          </div>
          <div className="mt-4">
            <TrackingBar status={status} />
          </div>
        </section>

        {/* Ofrece los avisos del sistema mientras la orden no se entregó (una vez por sesión). */}
        {status !== 'entregada' && notifyPerm === 'default' && !notifyDismissed && (
          <section aria-labelledby="avisos" className="mt-3 flex gap-3 rounded-grande border border-borde bg-tarjeta p-4">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-completo bg-verde-suave text-verde">
              <BellRing size={20} strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="avisos" className="text-dish text-texto">
                {t.tracking.notifyAskTitle}
              </h2>
              <p className="mt-0.5 text-small text-texto-2">{t.tracking.notifyAskBody}</p>
              <div className="mt-3 flex items-center gap-1">
                <button
                  type="button"
                  onClick={async () => {
                    const permission = await enableNotifications()
                    setNotifyPerm(permission)
                    if (permission === 'granted') setNotifyJustOn(true)
                  }}
                  className="focus-on-dark h-11 rounded-completo bg-verde px-4 text-small font-semibold text-blanco"
                >
                  {t.tracking.notifyAskYes}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    writeItem('session', tableKey(mesa, 'avisos'), 'no')
                    setNotifyDismissed(true)
                  }}
                  className="h-11 px-3 text-small font-medium text-texto-2"
                >
                  {t.tracking.notifyAskNo}
                </button>
              </div>
            </div>
          </section>
        )}
        {notifyJustOn && (
          <NoticeBanner role="status" tone="positivo" title={t.tracking.notifyOn} className="mt-3" />
        )}

        <div className="mt-3">
          <Comanda comanda={comanda} heading={fmt(t.tracking.yourOrder, { name: comanda.customerName })} />
        </div>

        {others.length > 0 && (
          <section aria-labelledby="otras-ordenes" className="mt-4">
            <h2 id="otras-ordenes" className="text-dish text-texto">
              {t.tracking.otherOrders}
            </h2>
            <ul className="mt-2 divide-y divide-borde rounded-grande border border-borde bg-tarjeta">
              {others.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => navigate(paths.tracking(mesa, c.id), { replace: true })}
                    aria-label={`${fmt(t.tracking.openOrder, { id: c.id })} · ${statusLabel(c.status)}`}
                    className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-dish text-texto">{c.id}</span>
                      <span className="block truncate text-small text-texto-2">
                        {c.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                      </span>
                    </span>
                    <StatusChip status={c.status} />
                    <ChevronRight size={18} strokeWidth={2} aria-hidden className="shrink-0 text-texto-2" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <button
          type="button"
          onClick={() => navigate(paths.bill(mesa))}
          className="mt-4 flex min-h-14 w-full items-center gap-3 rounded-grande border border-borde bg-tarjeta px-4 text-left"
        >
          <span className="min-w-0 flex-1 text-dish text-texto">{t.tracking.accountTitle}</span>
          <span className="text-price text-texto">{formatMoney(accountTotal)}</span>
          <span className="inline-flex items-center gap-0.5 text-small font-semibold text-verde">
            {t.tracking.seeBill}
            <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
          </span>
        </button>

        {/* "Llamar al mesero" es el botón flotante; pagar, la fila "Cuenta de la mesa". */}
        <DockSpacer size={openState.open ? 'lg' : 'md'} />
      </main>

      {/* Fuera de horario no se piden cosas nuevas; llamar al mesero y pagar siguen. */}
      {openState.open && (
        <BottomDock>
          <div className="pt-1">
            <Button
              block
              variant="secondary"
              icon={<Plus size={24} strokeWidth={2} aria-hidden />}
              onClick={() => navigate(paths.menu(mesa))}
            >
              {t.tracking.orderMore}
            </Button>
          </div>
        </BottomDock>
      )}

      {soldOut && (
        <SoldOutSheet
          open={showSoldOut}
          dishName={soldOut.item.name}
          component={soldOut.component}
          busy={replacing}
          onClose={closeSoldOut}
          onSubmit={replace}
        />
      )}
    </div>
  )
}

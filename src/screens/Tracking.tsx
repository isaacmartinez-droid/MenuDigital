import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Plus } from 'lucide-react'
import type { Substitute } from '../types/menu'
import type { Comanda as ComandaModel } from '../types/order'
import { Header } from '../components/Header'
import { TrackingBar } from '../components/TrackingBar'
import { Comanda } from '../components/Comanda'
import { TableActions } from '../components/TableActions'
import { WaiterSheet } from '../components/WaiterSheet'
import { WaiterBanner } from '../components/WaiterBanner'
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
import { useWaiter } from '../lib/useWaiter'
import { useOnline } from '../lib/useOnline'
import { paths, useMesa } from '../lib/useMesa'
import { comandasStore } from '../store/comandas'

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
  const openState = useOpenState()
  const flags = useDemoFlags()
  const waiter = useWaiter(mesa)
  const online = useOnline()
  const [waiterSheet, setWaiterSheet] = useState(false)

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
  const headline = {
    recibida: { title: t.tracking.processingTitle, body: t.tracking.processingBody },
    'en-el-comal': {
      title: t.tracking.cookingTitle,
      body: fmt(t.tracking.cookingBody, { min: restaurant.timings.readyEstimateMin }),
    },
    lista: { title: t.tracking.readyTitle, body: fmt(t.tracking.readyBody, { mesa }) },
    entregada: { title: t.tracking.deliveredTitle, body: t.tracking.deliveredBody },
  }[status]
  const delivered = status === 'entregada'

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
        <WaiterBanner
          phase={waiter.phase}
          waiter={waiter.waiter}
          notice={waiter.notice}
          cooldownLeft={waiter.cooldownLeft}
          className="mb-3"
        />
        {!online && (
          <NoticeBanner role="status" tone="aviso" title={t.offline.title} body={t.offline.trackingBody} className="mb-3" />
        )}
        {replacedText && (
          <NoticeBanner role="status" tone="positivo" title={t.soldOut.doneTitle} body={replacedText} className="mb-3" />
        )}

        <section className="rounded-grande border border-borde bg-tarjeta px-4 pt-4 pb-4" aria-labelledby="estado">
          <div aria-live="polite">
            <h1 id="estado" className="text-title text-texto">
              {headline.title}
            </h1>
            <p className="mt-1 text-body text-texto-2">{headline.body}</p>
          </div>
          <div className="mt-4">
            <TrackingBar status={status} />
          </div>
        </section>

        <div className="mt-3">
          <Comanda
            comanda={comanda}
            heading={fmt(t.tracking.yourOrder, { name: comanda.customerName })}
            pill={fmt(delivered ? t.tracking.tablePillDelivered : t.tracking.tablePill, { mesa })}
            footnote={fmt(t.tracking.addsToTable, { mesa })}
          />
        </div>

        <TableActions
          className="mt-3"
          waiterLocked={waiter.coolingDown}
          onCallWaiter={() => waiter.tryOpen() && setWaiterSheet(true)}
          onPay={() => navigate(paths.bill(mesa))}
        />
        {openState.open && <DockSpacer size="lg" />}
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
            {!delivered && <p className="mt-2.5 text-center text-small text-texto-2">{t.tracking.orderMoreHelp}</p>}
          </div>
        </BottomDock>
      )}

      <WaiterSheet
        open={waiterSheet}
        onClose={() => setWaiterSheet(false)}
        onSubmit={(reason) => {
          setWaiterSheet(false)
          void waiter.send(reason)
        }}
      />

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

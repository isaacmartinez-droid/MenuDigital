import { useState, type ReactNode } from 'react'
import { Bell, Banknote, Plus } from 'lucide-react'
import { Button } from '../components/Button'
import { Tag } from '../components/Tag'
import { DishCard } from '../components/DishCard'
import { QuantityStepper } from '../components/QuantityStepper'
import { CartBar } from '../components/CartBar'
import { Toast } from '../components/Toast'
import { NoticeBanner } from '../components/NoticeBanner'
import { BottomSheet } from '../components/BottomSheet'
import { OptionCard } from '../components/OptionCard'
import { TrackingTimeline } from '../components/TrackingTimeline'
import { Comanda } from '../components/Comanda'
import { StarRating } from '../components/StarRating'
import { Header, PageHeader } from '../components/Header'
import { PaymentNotice } from '../components/PaymentNotice'
import { getDish, restaurant } from '../lib/catalog'
import { formatMoney } from '../lib/money'
import { fmt, t } from '../lib/text'
import type { Comanda as ComandaModel, ComandaStatus } from '../types/order'

/**
 * Muestrario de la etapa a) (solo en desarrollo, /componentes).
 * Usa los mismos datos que las capturas para comparar a ojo.
 */
export function ComponentsPreview() {
  const fritanga = getDish('fritanga-tradicional')!
  const enchilada = getDish('enchilada')!
  const combo = getDish('combo-para-dos')!
  const agotado = getDish('fritanga-cerdo')!
  const [qty, setQty] = useState(1)
  const [status, setStatus] = useState<ComandaStatus>('en-el-comal')
  const [sheet, setSheet] = useState(false)
  const [reason, setReason] = useState('mesero')
  const [stars, setStars] = useState(4)
  const noop = () => {}

  const comanda: ComandaModel = {
    id: 'FN-0142',
    number: 142,
    tableId: '5',
    customerName: 'Ana',
    mine: true,
    items: [
      { dishId: 'fritanga-tradicional', name: 'Fritanga tradicional', quantity: 1, extras: [], note: 'sin repollo', unitPrice: 250, lineTotal: 250 },
      { dishId: 'enchilada', name: 'Enchilada', quantity: 2, extras: [], unitPrice: 90, lineTotal: 180 },
    ],
    total: 430,
    status,
    createdAt: new Date().toISOString(),
    statusAt: new Date().toISOString(),
    substitutions: [],
  }

  return (
    <div className="app-shell pb-28">
      <Header
        name={restaurant.name}
        logo={restaurant.logo}
        open
        statusText={fmt(t.status.open, { close: '10:00 pm' })}
        tableText="Mesa 5"
      />
      <div className="grid grid-cols-2 gap-[9px] px-4">
        <Button variant="pill" icon={<Bell size={20} className="text-verde" aria-hidden />}>
          {t.menu.callWaiter}
        </Button>
        <Button variant="pill" icon={<Banknote size={20} className="text-verde" aria-hidden />}>
          {t.menu.payNow}
        </Button>
      </div>

      <Section title="Carrusel">
        <div className="no-scrollbar -mx-4 flex snap-x gap-[13px] overflow-x-auto px-4">
          <DishCard variant="carousel" dish={fritanga} quantity={qty} canOrder onAdd={() => setQty(qty + 1)} onDecrement={noop} onOpen={noop} />
          <DishCard variant="carousel" dish={enchilada} quantity={0} canOrder onAdd={noop} onDecrement={noop} onOpen={noop} />
          <DishCard variant="carousel" dish={combo} quantity={0} canOrder onAdd={noop} onDecrement={noop} onOpen={noop} />
        </div>
      </Section>

      <Section title="Lista">
        <div className="divide-y divide-borde">
          <DishCard variant="row" dish={fritanga} quantity={qty} canOrder onAdd={() => setQty(qty + 1)} onDecrement={() => setQty(Math.max(0, qty - 1))} onOpen={noop} />
          <DishCard variant="row" dish={combo} quantity={0} canOrder onAdd={noop} onDecrement={noop} onOpen={noop} />
          <DishCard variant="row" dish={agotado} quantity={0} canOrder onAdd={noop} onDecrement={noop} onOpen={noop} />
          <DishCard variant="row" dish={enchilada} quantity={0} canOrder={false} onAdd={noop} onDecrement={noop} onOpen={noop} />
        </div>
      </Section>

      <Section title="Avisos">
        <div className="space-y-3">
          <Toast
            title={fmt(t.menu.added, { dish: 'Fritanga tradicional' })}
            body={fmt(t.menu.addedWithSide, { side: 'gallo pinto' })}
            action={{ label: t.common.undo, onClick: noop }}
          />
          <NoticeBanner tone="positivo" title={t.waiter.notifiedTitle} body={t.waiter.notifiedBody} />
          <NoticeBanner tone="aviso" title={t.closed.title} body={fmt(t.closed.body, { open: '4:00 pm' })} />
          <NoticeBanner tone="aviso" title={t.offline.title} body={t.offline.body} />
          <PaymentNotice />
        </div>
      </Section>

      <Section title="Seguimiento">
        <div className="mb-3 flex flex-wrap gap-2">
          {(['recibida', 'en-el-comal', 'lista', 'entregada'] as const).map((s) => (
            <Button key={s} variant="pill" className="h-9 min-h-9 px-3" onClick={() => setStatus(s)}>
              {s}
            </Button>
          ))}
        </div>
        <div className="rounded-grande border border-borde bg-tarjeta p-4">
          <h2 className="text-title text-texto">{t.tracking.cookingTitle}</h2>
          <p className="mt-1 text-body text-texto-2">{fmt(t.tracking.cookingBody, { min: 15 })}</p>
          <div className="mt-5">
            <TrackingTimeline comanda={comanda} status={status} />
          </div>
        </div>
        <div className="mt-3">
          <Comanda
            comanda={comanda}
            heading={fmt(t.tracking.yourOrder, { name: 'Ana' })}
          />
        </div>
      </Section>

      <Section title="Etiquetas, contador, estrellas y botones">
        <div className="flex flex-wrap gap-2">
          <Tag tone="ambar">Más vendido</Tag>
          <Tag tone="promo">Promo</Tag>
          <Tag tone="combo">Combo</Tag>
          <Tag tone="agotado">Agotado</Tag>
          <Tag tone="oscuro">Obligatorio</Tag>
          <Tag tone="contorno">Opcional</Tag>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <QuantityStepper value={qty} onIncrement={() => setQty(qty + 1)} onDecrement={() => setQty(Math.max(1, qty - 1))} min={1} itemName="Fritanga tradicional" size="md" />
          <StarRating value={stars} onChange={setStars} label="Calificación de Enchilada" />
          <StarRating value={0} label="Fritanga tradicional" />
        </div>
        <div className="mt-4 space-y-3">
          <Button block trailing={formatMoney(430)}>
            {t.order.send}
          </Button>
          <Button block variant="secondary" icon={<Plus size={24} aria-hidden />}>
            {t.tracking.orderMore}
          </Button>
          <Button block disabled>
            {fmt(t.closed.button, { open: '4:00 pm' })}
          </Button>
          <Button block onClick={() => setSheet(true)}>
            Abrir hoja "¿Qué necesitás?"
          </Button>
        </div>
      </Section>

      <Section title="Encabezado de página">
        <PageHeader title={t.order.title} subtitle="Mesa 5" onBack={noop} />
      </Section>

      <BottomSheet
        open={sheet}
        onClose={() => setSheet(false)}
        title={t.waiter.sheetTitle}
        footer={
          <Button block icon={<Bell size={22} aria-hidden />} onClick={() => setSheet(false)}>
            {t.waiter.submit}
          </Button>
        }
      >
        <div className="space-y-4" role="radiogroup" aria-label={t.waiter.sheetTitle}>
          {restaurant.waiterReasons.map((r) => (
            <OptionCard
              key={r.id}
              name="motivo"
              value={r.id}
              checked={reason === r.id}
              onChange={setReason}
              title={r.title}
              hint={r.hint}
            />
          ))}
        </div>
      </BottomSheet>

      <CartBar label={fmt(t.menu.viewOrder, { n: qty, platos: qty === 1 ? 'plato' : 'platos' })} total={formatMoney(qty * 220)} onClick={noop} />
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 px-4">
      <h2 className="mb-3 text-section text-texto">{title}</h2>
      {children}
    </section>
  )
}

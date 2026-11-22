import { useEffect, useId, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ChevronLeft, Plus, Search } from 'lucide-react'
import { Button } from '../../components/Button'
import { Photo } from '../../components/Photo'
import { QuantityStepper } from '../../components/QuantityStepper'
import { ChargeDialog } from '../../components/staff/ChargeDialog'
import { Segmented } from '../../components/staff/Segmented'
import { StaffBar } from '../../components/staff/StaffBar'
import { TAKEOUT } from '../../lib/channel'
import { getDish, menu, restaurant } from '../../lib/catalog'
import { isOnDay, useToday } from '../../lib/combos'
import { cx } from '../../lib/cx'
import { formatMoney } from '../../lib/money'
import { toComandaItems } from '../../lib/orderFlow'
import { promoAllows, useActivePromos } from '../../lib/promo'
import { COUNTER, chargeTable, createManualOrder } from '../../lib/staff'
import { fmt, t, tableLabel } from '../../lib/text'
import { useAvailability } from '../../store/availability'
import { formatPhone } from '../../store/customer'
import type { Channel, PayMethod } from '../../types/order'
import { describedBy, inputClass } from './panel/formUtils'

const m = t.staff.cashier.manual

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

type ManualChannel = Extract<Channel, 'mostrador' | 'mesa' | 'llevar'>

interface ManualOrderProps {
  /** Mesa fija (el mesero agrega a su mesa); sin ella, se elige el canal. */
  fixedTable?: string
  /** Celular del mesero: una columna y sin "Cobrar ahora". */
  compact?: boolean
  /** A dónde vuelve (y adónde va al enviar). */
  backTo: string
}

/**
 * P2c Nuevo pedido: para quien no tiene celular o no quiere escanear. Se elige el
 * canal (Mostrador, Mesa o Para llevar), se agregan platos y se envía a la cocina o
 * se cobra en el momento. El mesero lo usa desde una mesa ("Agregar pedido a esta
 * mesa"): queda en la misma cuenta.
 */
function ManualOrder({ fixedTable, compact = false, backTo }: ManualOrderProps) {
  const navigate = useNavigate()
  const id = useId()
  useAvailability()
  const today = useToday()
  const promos = useActivePromos()
  const [channel, setChannel] = useState<ManualChannel>(fixedTable ? 'mesa' : 'mostrador')
  const [mesa, setMesa] = useState(fixedTable ?? restaurant.tables[0])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [query, setQuery] = useState('')
  const [lines, setLines] = useState<Record<string, number>>({})
  const [error, setError] = useState('')
  const [charging, setCharging] = useState(false)

  const dishes = useMemo(() => {
    const q = normalize(query.trim())
    return menu.dishes.filter(
      (d) =>
        d.available &&
        isOnDay(d, today) &&
        promoAllows(d, channel === 'llevar', promos) &&
        (!q || normalize(`${d.name} ${d.shortDescription}`).includes(q)),
    )
  }, [query, today, channel, promos])

  const entries = Object.entries(lines).filter(([, n]) => n > 0)
  const items = toComandaItems(
    entries.map(([dishId, quantity]) => ({ lineId: dishId, dishId, quantity, sideId: getDish(dishId)?.defaultSide, extraIds: [] })),
  )
  const total = items.reduce((s, i) => s + i.lineTotal, 0)
  const setQty = (dishId: string, n: number) => setLines((l) => ({ ...l, [dishId]: Math.max(0, n) }))
  const channelLabel = channel === 'mostrador' ? m.counter : channel === 'mesa' ? tableLabel(mesa) : t.staff.takeout
  const who = name.trim() || (compact ? fmt(m.waiterName, { name: restaurant.staff.waiter }) : m.noName)

  useEffect(() => {
    document.title = `${m.title} · ${restaurant.name}`
  }, [])

  /** Valida y arma el pedido; devuelve null si falta algo. */
  const prepare = () => {
    if (!items.length) {
      setError(m.errorEmpty)
      return null
    }
    if (channel === 'llevar' && phone.length !== restaurant.web.phoneDigits) {
      setError(m.errorPhone)
      document.getElementById(`${id}-phone`)?.focus()
      return null
    }
    setError('')
    return {
      tableId: channel === 'mesa' ? mesa : channel === 'llevar' ? TAKEOUT : COUNTER,
      channel,
      customerName: who,
      ...(channel === 'llevar' ? { phone } : {}),
      items,
    }
  }

  const send = () => {
    const input = prepare()
    if (!input) return
    const result = createManualOrder(input)
    if (!result) return setError(fmt(m.blocked, { mesa: tableLabel(mesa) }))
    navigate(backTo, { state: { notice: fmt(m.sent, { id: result.comanda.id }) } })
  }

  const charge = (method: PayMethod, received: number | null) => {
    const input = prepare()
    if (!input) return setCharging(false)
    const result = createManualOrder(input)
    if (!result) {
      setCharging(false)
      return setError(fmt(m.blocked, { mesa: tableLabel(mesa) }))
    }
    chargeTable(result.table, {
      comandaIds: [result.comanda.id],
      scope: channel === 'mesa' ? 'mine' : 'table',
      method,
      received,
    })
    const methodText = method === 'efectivo' ? t.staff.cashier.methodCash : t.staff.cashier.methodCard
    navigate(backTo, {
      state: { notice: fmt(m.charged, { id: result.comanda.id, total: formatMoney(total), method: methodText }) },
    })
  }

  const menuColumn = (
    <section aria-label={m.title} className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link
          to={backTo}
          aria-label={m.back}
          className="grid size-10 shrink-0 place-items-center rounded-completo border border-borde bg-tarjeta text-texto"
        >
          <ChevronLeft size={22} aria-hidden />
        </Link>
        <h2 className="text-title-lg text-texto">{compact ? tableLabel(mesa) : m.title}</h2>
      </div>
      <p className="text-body text-texto-2">{compact ? t.staff.waiters.addOrderHint : m.subtitle}</p>
      {!fixedTable && (
        <Segmented<ManualChannel>
          label={m.channelLabel}
          value={channel}
          onChange={setChannel}
          options={[
            { value: 'mostrador', label: m.counter },
            { value: 'mesa', label: m.table },
            { value: 'llevar', label: m.takeout },
          ]}
        />
      )}
      {channel === 'mesa' && !fixedTable && (
        <div className="flex items-center gap-3">
          <label htmlFor={`${id}-mesa`} className="text-dish text-texto">
            {m.tablePick}
          </label>
          <select id={`${id}-mesa`} value={mesa} onChange={(e) => setMesa(e.target.value)} className={cx(inputClass(), 'w-40')}>
            {restaurant.tables.map((n) => (
              <option key={n} value={n}>
                {tableLabel(n)}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="relative">
        <Search size={20} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-texto-2" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={m.search}
          aria-label={m.search}
          className={cx(inputClass(), 'pl-10')}
        />
      </div>
      <p className="sr-only" role="status">
        {query ? fmt(m.results, { n: dishes.length }) : ''}
      </p>
      <ul className={cx('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
        {dishes.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => setQty(d.id, (lines[d.id] ?? 0) + 1)}
              aria-label={fmt(m.add, { name: d.name })}
              className="flex w-full items-center gap-2 rounded-tarjeta border border-borde bg-tarjeta p-2 text-left"
            >
              <Photo src={d.image} className="size-12 shrink-0 rounded-chico" />
              <span className="min-w-0 flex-1">
                <span className="block text-dish text-texto">{d.name}</span>
                <span className="block text-small text-texto-2">{formatMoney(d.price)}</span>
              </span>
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-completo bg-verde text-blanco">
                <Plus size={18} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )

  const ticket = (
    <section
      aria-label={`${channelLabel} · ${who}`}
      className={cx(
        'flex shrink-0 flex-col gap-3 rounded-grande border border-borde bg-tarjeta p-6',
        compact ? 'w-full' : 'w-full self-stretch md:w-[400px]',
      )}
    >
      <h2 className="text-section text-texto">
        {channelLabel} · {who}
      </h2>
      <div className={cx('grid gap-3', channel === 'llevar' ? 'grid-cols-2' : 'grid-cols-1')}>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-name`} className="text-small font-medium text-texto-2">
            {m.nameLabel}
          </label>
          <input
            id={`${id}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={m.namePlaceholder}
            maxLength={30}
            autoComplete="off"
            className={inputClass()}
          />
        </div>
        {channel === 'llevar' && (
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-phone`} className="text-small font-medium text-texto-2">
              {m.phoneLabel}
            </label>
            <input
              id={`${id}-phone`}
              value={formatPhone(phone)}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, restaurant.web.phoneDigits))}
              inputMode="numeric"
              autoComplete="off"
              aria-describedby={describedBy(`${id}-phone`, undefined, error === m.errorPhone ? error : undefined)}
              className={inputClass(error === m.errorPhone)}
            />
          </div>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-body text-texto-2">{m.ticketEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.dishId} className="flex items-center gap-2 text-body text-texto">
              <QuantityStepper
                value={item.quantity}
                onIncrement={() => setQty(item.dishId, item.quantity + 1)}
                onDecrement={() => setQty(item.dishId, item.quantity - 1)}
                itemName={item.name}
              />
              <span className="min-w-0 flex-1">{item.name}</span>
              <span>{formatMoney(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
      )}
      <hr className="border-borde" />
      <div className="flex justify-between text-section text-texto">
        <span>{t.staff.cashier.total}</span>
        <span>{formatMoney(total)}</span>
      </div>
      {error && error !== m.errorPhone && (
        <p role="alert" className="text-small text-promo">
          {error}
        </p>
      )}
      {error === m.errorPhone && (
        <p id={`${id}-phone-e`} role="alert" className="text-small text-promo">
          {error}
        </p>
      )}
      <div className="flex-1" />
      <Button block onClick={send}>
        {m.send}
      </Button>
      {!compact && (
        <Button
          variant="secondary"
          block
          onClick={() => {
            if (prepare()) setCharging(true)
          }}
        >
          {m.chargeNow}
        </Button>
      )}
      {charging && (
        <ChargeDialog
          title={fmt(t.staff.cashier.chargeTitle, { who: `${channelLabel} · ${who}` })}
          total={total}
          method={null}
          cashGiven={null}
          submitLabel={fmt(t.staff.cashier.charge, { total: formatMoney(total) })}
          onClose={() => setCharging(false)}
          onCharge={charge}
        />
      )}
    </section>
  )

  return (
    <main className={cx('flex flex-1 gap-6', compact ? 'flex-col px-4 pt-2 pb-8' : 'flex-col p-6 md:flex-row')}>
      {menuColumn}
      {ticket}
    </main>
  )
}

/** /caja/nuevo: Nuevo pedido desde caja (tablet). */
export function CashierNewOrder() {
  return (
    <>
      <StaffBar area="caja" user={restaurant.staff.cashier} />
      <ManualOrder backTo="/caja" />
    </>
  )
}

/** /meseros/mesa/:mesa/nuevo: el mesero agrega un pedido a su mesa (celular). */
export function WaiterNewOrder() {
  const { mesa = '' } = useParams()
  return (
    <div className="mx-auto w-full max-w-app">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <h1 className="text-title text-texto">{t.staff.areas.meseros}</h1>
        <span className="rounded-completo bg-verde-suave px-3 py-2 text-small font-medium text-verde">
          {restaurant.staff.waiter}
        </span>
      </header>
      <ManualOrder fixedTable={mesa} compact backTo={`/meseros/mesa/${mesa}`} />
    </div>
  )
}

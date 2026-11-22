import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ChevronLeft, Plus } from 'lucide-react'
import { Button } from '../../components/Button'
import { Segmented } from '../../components/staff/Segmented'
import { restaurant } from '../../lib/catalog'
import { statusLabel } from '../../lib/comandaStatus'
import { cx } from '../../lib/cx'
import { formatMoney } from '../../lib/money'
import {
  ackCall,
  boardComandas,
  finishCall,
  markCleaned,
  setComandaStatus,
  useBoard,
  type BoardComanda,
  type BoardTable,
} from '../../lib/staff'
import { agoText } from '../../lib/staffText'
import { listKeys, readItem } from '../../lib/storage'
import { fmt, t, tableLabel } from '../../lib/text'
import { useNow } from '../../lib/useNow'
import type { WaiterCallRecord } from '../../lib/server'

const w = t.staff.waiters
const reasonTitle = (id: string) => restaurant.waiterReasons.find((r) => r.id === id)?.title ?? id

/** "hace 30 s" o "hace 2 min". */
const agoShort = (ms: number, now: number) => {
  const s = Math.max(0, Math.floor((now - ms) / 1000))
  return s < 60 ? fmt(t.staff.agoSec, { s }) : agoText(new Date(ms).toISOString(), now)
}

/** Mesas con pedido armado en este navegador pero todavía sin enviar ("Pidiendo"). */
function tablesOrdering(): Set<string> {
  const ids = new Set<string>()
  for (const key of listKeys(`${restaurant.id}:mesa:`)) {
    const match = /:mesa:([^:]+):pedido$/.exec(key)
    if (!match) continue
    try {
      const items = (JSON.parse(readItem('local', key) ?? '{}') as { state?: { items?: unknown[] } }).state?.items
      if (items?.length) ids.add(match[1])
    } catch {
      /* nada */
    }
  }
  return ids
}

type TableState = 'calling' | 'paying' | 'eating' | 'ordering' | 'free'

interface TableView {
  mesa: string
  table?: BoardTable
  state: TableState
  total: number
  phones: number
}

/** Estado de cada mesa del local (P3m), con lo que hay en el tablero. */
function tableViews(tables: BoardTable[]): TableView[] {
  const ordering = tablesOrdering()
  return restaurant.tables.map((mesa) => {
    // La mesa con cuenta abierta o con un llamado sin atender (pueden llamar antes de pedir).
    const table = tables.find(
      (tb) => tb.tableId === mesa && (tb.state.comandas.some((c) => !c.paid) || tb.state.calls?.some((c) => !c.doneAt)),
    )
    const unpaid = table?.state.comandas.filter((c) => !c.paid) ?? []
    const calling = table?.state.calls?.some((c) => !c.doneAt)
    const state: TableState = calling
      ? 'calling'
      : table?.state.bill
        ? 'paying'
        : unpaid.length
          ? 'eating'
          : ordering.has(mesa)
            ? 'ordering'
            : 'free'
    return {
      mesa,
      table,
      state,
      total: unpaid.reduce((s, c) => s + c.total, 0),
      phones: new Set(unpaid.map((c) => c.customerName)).size,
    }
  })
}

const stateStyle: Record<TableState, string> = {
  calling: 'bg-ambar text-texto-sobre-ambar',
  paying: 'bg-ambar text-texto-sobre-ambar',
  eating: 'bg-verde-suave text-verde',
  ordering: 'bg-combo-fondo text-azul-logo',
  free: 'bg-fondo text-texto-2',
}

function stateText(v: TableView): string {
  if (v.state === 'eating' && v.phones > 1) return fmt(w.states.eatingPhones, { n: v.phones })
  return w.states[v.state]
}

/** Barra de arriba del celular del mesero: título y quién entró. */
function WaiterBar({ title, back }: { title: string; back?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3">
        {back}
        <h1 className="text-title text-texto">{title}</h1>
      </div>
      <span className="rounded-completo bg-verde-suave px-3 py-2 text-small font-medium text-verde">
        {restaurant.staff.waiter}
      </span>
    </header>
  )
}

/** Tarjeta de aviso (P3): la mesa en verde, qué pasa y los botones. */
function AlertCard({
  mesa,
  title,
  sub,
  tone,
  children,
}: {
  mesa: string
  title: string
  sub: string
  tone?: 'coming'
  children: ReactNode
}) {
  return (
    <li
      className={cx(
        'flex flex-col gap-3 rounded-grande border border-borde p-4',
        tone === 'coming' ? 'bg-verde-suave' : 'bg-tarjeta',
      )}
    >
      <div className="flex items-center gap-3">
        <span className="rounded-tarjeta bg-verde px-3 py-2 text-section text-blanco">{tableLabel(mesa)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-dish text-texto">{title}</p>
          <p className="text-small font-medium text-texto-2">{sub}</p>
        </div>
      </div>
      <div className="flex gap-2">{children}</div>
    </li>
  )
}

/**
 * P3 Meseros (celular): pestañas Avisos y Mesas.
 * - Avisos: mesas que llaman (Voy → "Vas en camino" → Atendido), mesas que están
 *   pagando en caja (Mesa limpia) y pedidos de mesa listos para llevar (Entregado).
 * - Mesas (P3m): las mesas del local con su estado y total; cada una abre P3d.
 * Con "Voy", el teléfono del cliente pasa a "Carlos va en camino".
 */
export function Waiters() {
  const tables = useBoard()
  const now = useNow(5000)
  const [tab, setTab] = useState<'avisos' | 'mesas'>('avisos')

  useEffect(() => {
    document.title = `${t.staff.areas.meseros} · ${restaurant.name}`
  }, [])

  const { calls, paying, ready, views } = useMemo(() => {
    const mesas = tables.filter((tb) => restaurant.tables.includes(tb.tableId))
    return {
      calls: mesas
        .flatMap((table) => (table.state.calls ?? []).filter((c) => !c.doneAt).map((call) => ({ table, call })))
        .sort((a, b) => a.call.at - b.call.at),
      paying: mesas.filter(
        (tb) => tb.state.bill && !tb.state.cleanedAt && tb.state.comandas.some((c) => !c.paid),
      ),
      ready: boardComandas(mesas)
        .filter((e) => e.channel === 'mesa' && e.status === 'lista')
        .sort((a, b) => Date.parse(a.comanda.statusAt) - Date.parse(b.comanda.statusAt)),
      views: tableViews(tables),
    }
  }, [tables])

  const count = calls.length + paying.length + ready.length

  return (
    <div className="mx-auto w-full max-w-app">
      <WaiterBar title={t.staff.areas.meseros} />
      <main className="flex flex-col gap-3 px-4 pt-2 pb-8">
        <Segmented
          label={w.tabsLabel}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'avisos', label: fmt(w.tabAlerts, { n: count }) },
            { value: 'mesas', label: w.tabTables },
          ]}
        />

        {tab === 'avisos' ? (
          <>
            {count === 0 && <p className="text-body text-texto-2">{w.empty}</p>}
            <ul className="flex flex-col gap-3" aria-live="polite">
              {calls.map(({ table, call }) => (
                <CallCard key={`${table.source}:${table.tableId}:${call.at}`} table={table} call={call} now={now} />
              ))}
              {paying.map((table) => (
                <AlertCard
                  key={`pago:${table.source}:${table.tableId}`}
                  mesa={table.tableId}
                  title={fmt(w.paying, {
                    total: formatMoney(table.state.comandas.filter((c) => !c.paid).reduce((s, c) => s + c.total, 0)),
                  })}
                  sub={w.payingSub}
                >
                  <Button variant="secondary" className="flex-1" onClick={() => markCleaned(table)}>
                    {w.clean}
                  </Button>
                </AlertCard>
              ))}
              {ready.map((entry) => (
                <ReadyCard key={`${entry.table.source}:${entry.comanda.id}`} entry={entry} />
              ))}
            </ul>
            <p className="text-small text-texto-2">{w.footnote}</p>
          </>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {views.map((v) => {
              const body = (
                <>
                  <span className="text-section text-texto">{tableLabel(v.mesa)}</span>
                  <span className={cx('w-fit rounded-completo px-2 py-1 text-small font-medium', stateStyle[v.state])}>
                    {stateText(v)}
                  </span>
                  <span className={cx('text-dish', v.state === 'free' ? 'text-texto-2' : 'text-texto')}>
                    {v.state === 'free' ? '—' : formatMoney(v.total)}
                  </span>
                </>
              )
              const box = 'flex flex-col gap-2 rounded-grande border border-borde bg-tarjeta p-3 text-left'
              return (
                <li key={v.mesa}>
                  {v.table?.state.comandas.some((c) => !c.paid) ? (
                    <Link to={`/meseros/mesa/${v.mesa}`} className={box}>
                      {body}
                    </Link>
                  ) : (
                    <div className={box}>{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}

function CallCard({ table, call, now }: { table: BoardTable; call: WaiterCallRecord; now: number }) {
  if (call.ackAt) {
    return (
      <AlertCard
        mesa={table.tableId}
        title={w.coming}
        sub={fmt(w.comingSub, { waiter: call.waiter ?? restaurant.staff.waiter })}
        tone="coming"
      >
        <Button className="flex-1" onClick={() => finishCall(table, call.at)}>
          {w.done}
        </Button>
      </AlertCard>
    )
  }
  return (
    <AlertCard
      mesa={table.tableId}
      title={fmt(w.calling, { reason: reasonTitle(call.reason) })}
      sub={fmt(w.callingSub, { ago: agoShort(call.at, now) })}
    >
      <Button className="flex-1" onClick={() => ackCall(table, call.at)}>
        {w.go}
      </Button>
    </AlertCard>
  )
}

function ReadyCard({ entry }: { entry: BoardComanda }) {
  const items = entry.comanda.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')
  return (
    <AlertCard mesa={entry.comanda.tableId} title={fmt(w.ready, { id: entry.comanda.id })} sub={fmt(w.readySub, { items })}>
      <Button className="flex-1" onClick={() => setComandaStatus(entry.table, entry.comanda.id, 'entregada')}>
        {w.delivered}
      </Button>
    </AlertCard>
  )
}

/** P3d: una mesa, con los pedidos de cada persona y su estado. */
export function WaiterTable() {
  const { mesa = '' } = useParams()
  const navigate = useNavigate()
  const tables = useBoard()
  const now = useNow(15_000)
  const table = tables.find((tb) => tb.tableId === mesa && tb.state.comandas.some((c) => !c.paid))
  const entries = table ? boardComandas([table]).filter((e) => !e.comanda.paid) : []

  useEffect(() => {
    if (!table) navigate('/meseros', { replace: true })
  }, [table, navigate])
  if (!table) return null

  const total = entries.reduce((s, e) => s + e.comanda.total, 0)
  const phones = new Set(entries.map((e) => e.comanda.customerName)).size
  const opened = entries.reduce((a, e) => (e.comanda.createdAt < a ? e.comanda.createdAt : a), entries[0]?.comanda.createdAt ?? '')

  return (
    <div className="mx-auto w-full max-w-app">
      <WaiterBar
        title={tableLabel(mesa)}
        back={
          <Link
            to="/meseros"
            aria-label={w.back}
            className="grid size-10 place-items-center rounded-completo border border-borde bg-tarjeta text-texto"
          >
            <ChevronLeft size={20} aria-hidden />
          </Link>
        }
      />
      <main className="flex flex-col gap-3 px-4 pt-2 pb-8">
        <p className="text-body text-texto-2">
          {fmt(w.tableSummary, {
            phones: phones === 1 ? t.staff.cashier.phone : fmt(t.staff.cashier.phones, { n: phones }),
            ago: agoText(opened, now),
            total: formatMoney(total),
          })}
        </p>
        <ul className="flex flex-col gap-3">
          {entries.map((e) => {
            const done = e.status === 'entregada'
            return (
              <li key={e.comanda.id} className="flex flex-col gap-2 rounded-grande border border-borde bg-tarjeta p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-dish text-texto">
                    {e.comanda.customerName} · {e.comanda.id}
                  </p>
                  <span
                    className={cx(
                      'rounded-completo px-2 py-1 text-small font-medium',
                      done ? 'bg-verde-suave text-verde' : 'bg-ambar-suave text-texto-sobre-ambar',
                    )}
                  >
                    {statusLabel(e.status)}
                  </span>
                </div>
                <p className="text-body text-texto">
                  {e.comanda.items
                    .map((i) => [`${i.quantity}× ${i.name}`, i.note].filter(Boolean).join(' · '))
                    .join(', ')}
                </p>
              </li>
            )
          })}
        </ul>
        {/* Pedido manual del mesero: en una etapa siguiente. */}
        <Button variant="secondary" block disabled title={t.staff.soon} icon={<Plus size={20} aria-hidden />}>
          {w.addOrder}
        </Button>
        <p className="text-small text-texto-2">{w.addOrderHint}</p>
      </main>
    </div>
  )
}

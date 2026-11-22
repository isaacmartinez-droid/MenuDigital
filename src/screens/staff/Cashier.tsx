import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Lock, MessageCircle, Unlock } from 'lucide-react'
import { Button } from '../../components/Button'
import { NoticeBanner } from '../../components/NoticeBanner'
import { ChannelChip } from '../../components/staff/ChannelChip'
import { ChargeDialog } from '../../components/staff/ChargeDialog'
import { PrintSheet } from '../../components/staff/PrintSheet'
import { Segmented } from '../../components/staff/Segmented'
import { StaffBar } from '../../components/staff/StaffBar'
import { TAKEOUT } from '../../lib/channel'
import { restaurant } from '../../lib/catalog'
import { cx } from '../../lib/cx'
import { formatMoney } from '../../lib/money'
import {
  COUNTER,
  awaitingConfirmation,
  boardComandas,
  chargeAmounts,
  chargeTable,
  confirmTakeout,
  setBlocked,
  useBoard,
  type BoardComanda,
  type BoardTable,
} from '../../lib/staff'
import { agoText, placeLabel } from '../../lib/staffText'
import { statusLabel } from '../../lib/comandaStatus'
import { fmt, t, tableLabel } from '../../lib/text'
import { useNow } from '../../lib/useNow'
import { formatPhone } from '../../store/customer'
import type { Comanda, PayMethod } from '../../types/order'

type Tab = 'confirmar' | 'cobrar' | 'curso'
type Mode = 'table' | 'person'

const c = t.staff.cashier
const tableKeyOf = (table: BoardTable) => `${table.source}:${table.tableId}`
/** "Mesa 5" o "Mostrador". */
const accountLabel = (tableId: string) => (tableId === COUNTER ? c.counterChip : tableLabel(tableId))
const comandaKeyOf = (entry: BoardComanda) => `${tableKeyOf(entry.table)}:${entry.comanda.id}`

/** Personas de la cuenta (por nombre), con sus comandas, en el orden en que pidieron. */
function peopleOf(comandas: Comanda[]): { name: string; comandas: Comanda[] }[] {
  const people = new Map<string, Comanda[]>()
  for (const cm of [...comandas].sort((a, b) => a.number - b.number)) {
    people.set(cm.customerName, [...(people.get(cm.customerName) ?? []), cm])
  }
  return [...people].map(([name, list]) => ({ name, comandas: list }))
}

/** Link de WhatsApp al cliente con el mensaje de confirmación ya escrito. */
function confirmLink(comanda: Comanda): string {
  const country = restaurant.whatsapp.number.replace(/\D/g, '').slice(0, -8)
  const items = comanda.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')
  const text = fmt(c.waMessage, { name: comanda.customerName, id: comanda.id, items, total: formatMoney(comanda.total) })
  return `https://wa.me/${country}${comanda.phone ?? ''}?text=${encodeURIComponent(text)}`
}

/**
 * P2 Caja: a la izquierda las pestañas Por confirmar (pedidos web) y Por cobrar
 * (mesas), con la lista; a la derecha el detalle de lo elegido. Cobrar abre P2b;
 * al cerrar la mesa, el teléfono del cliente pasa solo a "Cuenta pagada".
 */
export function Cashier() {
  const tables = useBoard()
  const now = useNow(15_000)
  const navigate = useNavigate()
  const location = useLocation()
  const [tab, setTab] = useState<Tab>('cobrar')
  const [selected, setSelected] = useState<string | null>(null)
  const [mode, setMode] = useState<Record<string, Mode>>({})
  const [person, setPerson] = useState<Record<string, string>>({})
  const [charging, setCharging] = useState(false)
  // Al volver de "Nuevo pedido", su aviso ("FN-0150 enviado a la cocina").
  const [notice, setNotice] = useState<{ tone: 'positivo'; title: string; body?: string } | null>(() => {
    const text = (location.state as { notice?: string } | null)?.notice
    return text ? { tone: 'positivo', title: text } : null
  })

  useEffect(() => {
    document.title = `${t.staff.areas.caja} · ${restaurant.name}`
  }, [])

  const { toCharge, toConfirm, inProgress } = useMemo(() => {
    const entries = boardComandas(tables)
    // Mesas con cuenta abierta, y el mostrador real (pedidos manuales que no se cobraron al momento).
    const mesas = tables
      .filter(
        (tb) =>
          tb.tableId !== TAKEOUT &&
          (tb.tableId !== COUNTER || tb.source === 'real') &&
          tb.state.comandas.some((cm) => !cm.paid && !cm.pendingAccept),
      )
      .sort((a, b) => {
        // Primero los que vienen a pagar (el que avisó antes, arriba); después las cuentas abiertas.
        if (Boolean(a.state.bill) !== Boolean(b.state.bill)) return a.state.bill ? -1 : 1
        const first = (tb: BoardTable) => Math.min(...tb.state.comandas.map((cm) => Date.parse(cm.createdAt)))
        return a.state.bill ? Date.parse(a.state.billAt ?? '') - Date.parse(b.state.billAt ?? '') : first(a) - first(b)
      })
    return {
      toCharge: mesas,
      toConfirm: entries.filter(awaitingConfirmation).sort((a, b) => a.comanda.number - b.comanda.number),
      inProgress: entries
        .filter((e) => e.status !== 'entregada' && !awaitingConfirmation(e) && !e.comanda.pendingAccept)
        .sort((a, b) => a.comanda.number - b.comanda.number),
    }
  }, [tables])

  // Lo elegido, o el primero de la lista si lo elegido ya no está (se cobró o se confirmó).
  const current =
    tab === 'cobrar'
      ? (toCharge.find((tb) => tableKeyOf(tb) === selected) ?? toCharge[0])
      : undefined
  const currentConfirm =
    tab === 'confirmar' ? (toConfirm.find((e) => comandaKeyOf(e) === selected) ?? toConfirm[0]) : undefined
  const currentProgress =
    tab === 'curso' ? (inProgress.find((e) => comandaKeyOf(e) === selected) ?? inProgress[0]) : undefined

  const changeTab = (next: Tab) => {
    setTab(next)
    setSelected(null)
    setNotice(null)
  }

  return (
    <>
      <StaffBar
        area="caja"
        user={restaurant.staff.cashier}
        actions={
          <>
            <Button onClick={() => navigate('/caja/nuevo')}>{c.newOrder}</Button>
            <Button variant="secondary" onClick={() => navigate('/caja/corte')}>
              {c.dayClose}
            </Button>
          </>
        }
      />

      <main className="flex flex-1 flex-col gap-6 p-6 md:flex-row">
        <section aria-label={c.tabsLabel} className="flex min-w-0 flex-1 flex-col gap-3">
          <Segmented<Tab>
            label={c.tabsLabel}
            value={tab}
            onChange={changeTab}
            options={[
              { value: 'confirmar', label: fmt(c.tabConfirm, { n: toConfirm.length }) },
              { value: 'cobrar', label: fmt(c.tabCharge, { n: toCharge.length }) },
              { value: 'curso', label: fmt(c.tabInProgress, { n: inProgress.length }) },
            ]}
          />

          {notice && <NoticeBanner tone={notice.tone} title={notice.title} body={notice.body} role="status" />}

          {tab === 'cobrar' &&
            (toCharge.length === 0 ? (
              <p className="text-body text-texto-2">{c.emptyCharge}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {toCharge.map((tb) => {
                  const coming = Boolean(tb.state.bill)
                  const unpaid = tb.state.comandas.filter((cm) => !cm.paid)
                  const phones = new Set(tb.state.comandas.map((cm) => cm.customerName)).size
                  const since = coming
                    ? (tb.state.billAt ?? unpaid[0].createdAt)
                    : unpaid.reduce((a, cm) => (cm.createdAt < a ? cm.createdAt : a), unpaid[0].createdAt)
                  const sub = coming
                    ? `${tb.state.bill?.scope === 'mine' ? c.scopeMine : c.scopeTable} · ${agoText(since, now)}`
                    : `${phones === 1 ? c.phone : fmt(c.phones, { n: phones })} · ${agoText(since, now)}`
                  const total = chargeAmounts(tb.state, unpaid.map((cm) => cm.id)).subtotal
                  return (
                    <li key={tableKeyOf(tb)}>
                      <AccountRow
                        selected={tb === current}
                        onSelect={() => setSelected(tableKeyOf(tb))}
                        chip={
                          <ChannelChip
                            channel={tb.tableId === COUNTER ? 'mostrador' : 'mesa'}
                            label={accountLabel(tb.tableId)}
                          />
                        }
                        title={coming ? c.comingToPay : c.eating}
                        sub={sub}
                        total={formatMoney(total)}
                      />
                    </li>
                  )
                })}
              </ul>
            ))}

          {tab === 'curso' &&
            (inProgress.length === 0 ? (
              <p className="text-body text-texto-2">{c.emptyProgress}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {inProgress.map((e) => (
                  <li key={comandaKeyOf(e)}>
                    <AccountRow
                      selected={e === currentProgress}
                      onSelect={() => setSelected(comandaKeyOf(e))}
                      chip={<ChannelChip channel={e.channel} label={e.comanda.id} />}
                      title={fmt(c.progressTitle, { id: placeLabel(e), status: statusLabel(e.status) })}
                      sub={agoText(e.comanda.createdAt, now)}
                      total={formatMoney(e.comanda.total)}
                    />
                  </li>
                ))}
              </ul>
            ))}

          {tab === 'confirmar' &&
            (toConfirm.length === 0 ? (
              <p className="text-body text-texto-2">{c.emptyConfirm}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {toConfirm.map((e) => (
                  <li key={comandaKeyOf(e)}>
                    <AccountRow
                      selected={e === currentConfirm}
                      onSelect={() => setSelected(comandaKeyOf(e))}
                      chip={<ChannelChip channel="llevar" label={e.comanda.id} />}
                      title={`${e.comanda.customerName} · ${formatPhone(e.comanda.phone ?? '')}`}
                      sub={`${t.staff.takeout} · ${agoText(e.comanda.createdAt, now)}`}
                      total={formatMoney(e.comanda.total)}
                    />
                  </li>
                ))}
              </ul>
            ))}
        </section>

        {current && (
          <TableDetail
            table={current}
            mode={mode[tableKeyOf(current)] ?? (current.state.bill?.scope === 'mine' ? 'person' : 'table')}
            onMode={(m) => setMode({ ...mode, [tableKeyOf(current)]: m })}
            person={person[tableKeyOf(current)]}
            onPerson={(name) => setPerson({ ...person, [tableKeyOf(current)]: name })}
            charging={charging}
            onCharging={(open) => {
              // Al abrir el cobro, la mesa queda elegida: si otra mesa sube al primer lugar, no cambia.
              if (open) setSelected(tableKeyOf(current))
              setCharging(open)
            }}
            onCharged={(n) => setNotice(n)}
          />
        )}
        {currentProgress && <ProgressDetail entry={currentProgress} />}
        {currentConfirm && (
          <ConfirmDetail
            entry={currentConfirm}
            onConfirmed={() => {
              confirmTakeout(currentConfirm.table, currentConfirm.comanda.id)
              setNotice({ tone: 'positivo', title: fmt(c.sentToKitchen, { id: currentConfirm.comanda.id }) })
            }}
          />
        )}
      </main>
    </>
  )
}

/** Fila de la lista: canal, qué pasa, hace cuánto y el total. */
function AccountRow({
  selected,
  onSelect,
  chip,
  title,
  sub,
  total,
}: {
  selected: boolean
  onSelect: () => void
  chip: ReactNode
  title: string
  sub: string
  total: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cx(
        'flex w-full items-center gap-3 rounded-tarjeta bg-tarjeta px-4 py-3 text-left',
        selected ? 'border-2 border-verde' : 'border border-borde',
      )}
    >
      {chip}
      <span className="min-w-0 flex-1">
        <span className="block text-dish text-texto">{title}</span>
        <span className="block text-small font-medium text-texto-2">{sub}</span>
      </span>
      <span className="text-price text-texto">{total}</span>
    </button>
  )
}

function Panel({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section
      aria-label={label}
      className="flex w-full shrink-0 flex-col gap-3 self-stretch rounded-grande border border-borde bg-tarjeta p-6 md:w-[460px]"
    >
      {children}
    </section>
  )
}

function ItemRows({ comanda, muted }: { comanda: Comanda; muted?: boolean }) {
  return comanda.items.map((item, i) => (
    <div key={`${comanda.id}-${i}`} className={cx('flex gap-2 text-body', muted ? 'text-texto-2' : 'text-texto')}>
      <span className="text-texto-2">{item.quantity}×</span>
      <span className="min-w-0 flex-1">{item.name}</span>
      <span>{formatMoney(item.lineTotal)}</span>
    </div>
  ))
}

/** Detalle de una mesa: por persona, total, cómo cobrar y Cobrar (P2 y P2e). */
function TableDetail({
  table,
  mode,
  onMode,
  person,
  onPerson,
  charging,
  onCharging,
  onCharged,
}: {
  table: BoardTable
  mode: Mode
  onMode: (m: Mode) => void
  person: string | undefined
  onPerson: (name: string) => void
  charging: boolean
  onCharging: (open: boolean) => void
  onCharged: (notice: { tone: 'positivo'; title: string; body?: string }) => void
}) {
  const { state } = table
  const mesa = accountLabel(table.tableId)
  const [printing, setPrinting] = useState(false)
  const blocked = Boolean(state.blocked)
  const coming = Boolean(state.bill)
  const people = peopleOf(state.comandas)
  const requester = state.comandas.find((cm) => cm.mine)?.customerName
  const unpaidPeople = people.filter((p) => p.comandas.some((cm) => !cm.paid))
  // Por persona: la elegida o, si no, quien avisó a caja (o la primera que falta).
  const chosen =
    unpaidPeople.find((p) => p.name === person) ??
    unpaidPeople.find((p) => p.name === requester) ??
    unpaidPeople[0]
  const ids =
    mode === 'table'
      ? state.comandas.filter((cm) => !cm.paid).map((cm) => cm.id)
      : (chosen?.comandas.filter((cm) => !cm.paid).map((cm) => cm.id) ?? [])
  const { subtotal, tip, total } = chargeAmounts(state, ids)
  const methodText = (m: PayMethod) => (m === 'efectivo' ? c.methodCash : c.methodCard)

  const charge = (method: PayMethod, received: number | null) => {
    const result = chargeTable(table, { comandaIds: ids, scope: mode === 'table' ? 'table' : 'mine', method, received })
    onCharging(false)
    if (!result) return
    const amount = formatMoney(result.payment.total)
    onCharged(
      result.closed
        ? { tone: 'positivo', title: fmt(c.closedTitle, { mesa }), body: fmt(c.closedBody, { total: amount, method: methodText(method) }) }
        : {
            tone: 'positivo',
            title: fmt(c.personPaidTitle, { name: chosen?.name ?? '' }),
            body: fmt(c.personPaidBody, { total: amount, method: methodText(method), mesa }),
          },
    )
  }

  return (
    <Panel label={mesa}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title-lg text-texto">{mesa}</h2>
        <span
          className={cx(
            'rounded-completo px-3 py-1 text-small font-medium',
            blocked ? 'bg-promo text-blanco' : coming ? 'bg-ambar text-texto-sobre-ambar' : 'bg-verde-suave text-verde',
          )}
        >
          {blocked ? c.blockedBadge : coming ? c.statusComing : c.statusOpen}
        </span>
      </div>
      {coming && (
        <p className="text-body text-texto-2">
          {state.bill?.scope === 'mine' ? fmt(c.detailComingMine, { name: requester ?? '' }) : c.detailComingTable}
        </p>
      )}

      {mode === 'person' && <p className="text-small text-texto-2">{c.pickPerson}</p>}
      <div className="flex flex-col gap-3" role={mode === 'person' ? 'radiogroup' : undefined} aria-label={mode === 'person' ? c.perPerson : undefined}>
        {people.map((p) => {
          const paid = p.comandas.every((cm) => cm.paid)
          const heading = `${p.name} · ${p.comandas.map((cm) => cm.id).join(', ')}`
          const body = (
            <>
              <span className="flex items-center justify-between gap-2 text-small font-medium text-texto-2">
                {heading}
                {paid && <span className="text-verde">{c.paidPerson}</span>}
              </span>
              {p.comandas.map((cm) => (
                <ItemRows key={cm.id} comanda={cm} muted={paid} />
              ))}
            </>
          )
          if (mode === 'table' || paid) {
            return (
              <div key={p.name} className="flex flex-col gap-1">
                {body}
              </div>
            )
          }
          const on = p === chosen
          return (
            <button
              key={p.name}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onPerson(p.name)}
              className={cx(
                'flex flex-col gap-1 rounded-tarjeta p-3 text-left',
                on ? 'border-2 border-verde' : 'border border-borde',
              )}
            >
              {body}
            </button>
          )
        })}
      </div>

      <hr className="border-borde" />
      {tip > 0 && (
        <>
          <div className="flex justify-between text-body text-texto-2">
            <span>{t.paid.subtotal}</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between text-body text-texto-2">
            <span>{c.tip}</span>
            <span>{formatMoney(tip)}</span>
          </div>
        </>
      )}
      <div className="flex justify-between text-section text-texto">
        <span>{c.total}</span>
        <span>{formatMoney(total)}</span>
      </div>

      <Segmented<Mode>
        label={c.howToCharge}
        value={mode}
        onChange={onMode}
        options={[
          { value: 'table', label: c.together },
          { value: 'person', label: c.perPerson, disabled: unpaidPeople.length < 2 },
        ]}
      />

      <div className="flex-1" />
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" disabled={!ids.length} onClick={() => setPrinting(true)}>
          {c.print}
        </Button>
        <Button
          className="flex-1"
          disabled={!ids.length}
          onClick={() => {
            if (mode === 'person' && chosen) onPerson(chosen.name)
            onCharging(true)
          }}
        >
          {fmt(c.charge, { total: formatMoney(total) })}
        </Button>
      </div>
      {table.tableId !== COUNTER && (
        <>
          <p className="text-center text-small text-texto-2">{c.pinNote}</p>
          <Button
            variant="secondary"
            block
            icon={blocked ? <Unlock size={18} aria-hidden /> : <Lock size={18} aria-hidden />}
            onClick={() => {
              setBlocked(table, !blocked)
              onCharged({ tone: 'positivo', title: fmt(blocked ? c.unblockedNotice : c.blockedNotice, { mesa }) })
            }}
          >
            {blocked ? c.unblock : c.block}
          </Button>
        </>
      )}

      {printing && (
        <PrintSheet
          title={t.staff.cashier.printSheet.title}
          lines={[
            mode === 'person' && chosen ? `${mesa} · ${chosen.name}` : mesa,
            new Date().toLocaleString(restaurant.currency.locale),
          ]}
          rows={state.comandas
            .filter((cm) => ids.includes(cm.id))
            .flatMap((cm) => cm.items.map((i) => ({ label: `${i.quantity}× ${i.name}`, amount: i.lineTotal })))}
          totals={[
            ...(tip > 0
              ? [
                  { label: t.staff.cashier.printSheet.subtotal, amount: subtotal },
                  { label: c.tip, amount: tip },
                ]
              : []),
            { label: c.total, amount: total, strong: true },
          ]}
          footer={
            <>
              {fmt(t.staff.cashier.printSheet.printedBy, { name: restaurant.staff.cashier })}
              <br />
              {t.staff.cashier.printSheet.thanks}
            </>
          }
          onDone={() => setPrinting(false)}
        />
      )}

      {charging && (
        <ChargeDialog
          title={mode === 'table' ? fmt(c.chargeTitle, { who: mesa }) : fmt(c.chargePerson, { name: chosen?.name ?? '' })}
          total={total}
          method={state.bill?.method ?? null}
          cashGiven={state.bill?.cashGiven ?? null}
          submitLabel={mode === 'table' ? c.chargeAndClose : fmt(c.chargePerson, { name: chosen?.name ?? '' })}
          onClose={() => onCharging(false)}
          onCharge={charge}
        />
      )}
    </Panel>
  )
}

/** P2a: pedido web por confirmar por WhatsApp antes de cocinar. */
function ConfirmDetail({ entry, onConfirmed }: { entry: BoardComanda; onConfirmed: () => void }) {
  const { comanda } = entry
  return (
    <Panel label={comanda.id}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-mano text-comanda font-bold text-texto">{comanda.id}</h2>
        <ChannelChip channel="llevar" label={t.staff.takeout} />
      </div>
      <p className="text-dish text-texto">
        {comanda.customerName} · {formatPhone(comanda.phone ?? '')}
      </p>
      <ItemRows comanda={comanda} />
      <hr className="border-borde" />
      <NoticeBanner
        tone="aviso"
        title={c.confirmTitle}
        body={fmt(c.confirmBody, { name: comanda.customerName, id: comanda.id })}
      />
      <a
        href={confirmLink(comanda)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-[52px] w-full items-center justify-center gap-2.5 rounded-grande bg-verde px-4 text-button text-blanco"
      >
        <MessageCircle size={20} strokeWidth={1.8} aria-hidden />
        {c.confirmWhatsApp}
        <span className="sr-only"> {t.web.newTab}</span>
      </a>
      <Button variant="secondary" block onClick={onConfirmed}>
        {c.confirmed}
      </Button>
      <div className="flex-1" />
      <p className="text-small text-texto-2">{c.confirmHint}</p>
    </Panel>
  )
}

/** "En curso": un pedido que está en la cocina (lo mueve la cocina). */
function ProgressDetail({ entry }: { entry: BoardComanda }) {
  const { comanda } = entry
  return (
    <Panel label={comanda.id}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-mano text-comanda font-bold text-texto">{comanda.id}</h2>
        <ChannelChip channel={entry.channel} label={placeLabel(entry)} />
      </div>
      <p className="text-dish text-texto">
        {comanda.customerName} · {statusLabel(entry.status)}
      </p>
      <ItemRows comanda={comanda} />
      <hr className="border-borde" />
      <div className="flex justify-between text-section text-texto">
        <span>{c.total}</span>
        <span>{formatMoney(comanda.total)}</span>
      </div>
      <div className="flex-1" />
      <p className="text-small text-texto-2">{c.progressHint}</p>
    </Panel>
  )
}

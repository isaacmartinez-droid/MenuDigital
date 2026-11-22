import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { StaffBar } from '../../components/staff/StaffBar'
import { KitchenTicket, type KitchenColumn } from '../../components/staff/KitchenTicket'
import { SoldOutDialog } from '../../components/staff/SoldOutDialog'
import { beep, onSoundReady, soundReady, unlockSound } from '../../lib/beep'
import { restaurant } from '../../lib/catalog'
import { boardComandas, setComandaStatus, useBoard, type BoardComanda } from '../../lib/staff'
import { agoText, clockNow, minutesSince } from '../../lib/staffText'
import { fmt, t, tableLabel } from '../../lib/text'
import { useNow } from '../../lib/useNow'
import type { ComandaStatus } from '../../types/order'

const COLUMNS: { key: KitchenColumn; status: ComandaStatus; next: ComandaStatus }[] = [
  { key: 'nuevo', status: 'recibida', next: 'en-el-comal' },
  { key: 'cocinando', status: 'en-el-comal', next: 'lista' },
  { key: 'listo', status: 'lista', next: 'entregada' },
]

/**
 * Después de mover una comanda, la de al lado sube a su lugar: un doble toque la movía
 * también. Durante 0,6 s después de un toque, los botones de la cocina no hacen nada.
 */
let lockedUntil = 0
function tapAllowed(): boolean {
  const now = Date.now()
  if (now < lockedUntil) return false
  lockedUntil = now + 600
  return true
}

const byCreated = (a: BoardComanda, b: BoardComanda) => Date.parse(a.comanda.createdAt) - Date.parse(b.comanda.createdAt)
const byLatestChange = (a: BoardComanda, b: BoardComanda) => Date.parse(b.comanda.statusAt) - Date.parse(a.comanda.statusAt)

/**
 * P1 Cocina: columnas Nuevos, Cocinando y Listos. Llegan los pedidos de las mesas
 * y los de la web ya confirmados por caja. "A cocinar", "Lista" y "Entregado"
 * cambian el estado que ve el cliente en su teléfono. "Agotados" abre P1c.
 */
export function Kitchen() {
  const tables = useBoard()
  const now = useNow(15_000)
  const k = t.staff.kitchen
  const [soldOutOpen, setSoldOutOpen] = useState(false)
  const [sound, setSound] = useState(soundReady)
  const [announcement, setAnnouncement] = useState('')
  const act = (entry: BoardComanda, next: ComandaStatus) => {
    if (tapAllowed()) setComandaStatus(entry.table, entry.comanda.id, next)
  }

  useEffect(() => {
    document.title = `${t.staff.areas.cocina} · ${restaurant.name}`
  }, [])

  // El navegador deja sonar recién después de un toque: el primero lo activa.
  useEffect(() => {
    const stop = onSoundReady(() => setSound(true))
    const onPointer = () => unlockSound()
    document.addEventListener('pointerdown', onPointer, { once: true })
    return () => {
      stop()
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [])

  const columns = useMemo(() => {
    const all = boardComandas(tables).filter(
      // Para llevar entra a cocina recién cuando caja lo confirma (si se pidió con la caja abierta),
      // y el primer pedido de una mesa, cuando el mesero lo acepta (regla del panel).
      (c) =>
        !c.comanda.pendingAccept && (c.channel !== 'llevar' || !c.comanda.kitchenLive || Boolean(c.comanda.confirmedAt)),
    )
    return COLUMNS.map((col) => ({
      ...col,
      items: all.filter((c) => c.status === col.status).sort(col.key === 'listo' ? byLatestChange : byCreated),
    }))
  }, [tables])

  // Pedido nuevo: suena y se anuncia (la primera lectura no cuenta).
  const known = useRef<Set<string> | null>(null)
  const newIds = columns[0].items.map((c) => `${c.table.source}:${c.table.tableId}:${c.comanda.id}`)
  useEffect(() => {
    const ids = newIds
    if (known.current) {
      const fresh = columns[0].items.filter((_, i) => !known.current?.has(ids[i]))
      if (fresh.length) {
        beep()
        setAnnouncement(fresh.map((c) => fmt(k.newAlert, { id: c.comanda.id })).join('. '))
      }
    }
    known.current = new Set([...(known.current ?? []), ...ids])
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cuando cambia la lista de nuevos
  }, [newIds.join(',')])

  const timeFor = (entry: BoardComanda, key: KitchenColumn): { text: string; late: boolean } => {
    const late = key !== 'listo' && minutesSince(entry.comanda.createdAt, now) >= restaurant.staffDemo.lateMin
    const parts = [agoText(entry.comanda.statusAt, now)]
    if (late) parts.push(k.late)
    // En Nuevos: si la misma mesa tiene otra comanda en curso, se avisa (van juntas).
    if (key === 'nuevo' && entry.channel === 'mesa') {
      const other = columns.some((col) =>
        col.items.some(
          (c) => c !== entry && c.table === entry.table && c.comanda.number < entry.comanda.number,
        ),
      )
      if (other) parts.push(fmt(k.otherComanda, { mesa: tableLabel(entry.comanda.tableId) }))
    }
    return { text: parts.join(' · '), late }
  }

  return (
    <>
      <StaffBar
        area="cocina"
        user={restaurant.staff.cook}
        info={
          <>
            {sound ? (
              <span className="text-small font-medium text-texto-2">{k.soundOn}</span>
            ) : (
              <button type="button" onClick={unlockSound} className="min-h-9 text-small font-medium text-verde underline">
                {k.soundOff}
              </button>
            )}
            <span className="text-small font-medium text-texto-2">{clockNow(now)}</span>
          </>
        }
        actions={
          <Button variant="secondary" onClick={() => setSoldOutOpen(true)}>
            {k.soldOutButton}
          </Button>
        }
      />

      <main className="grid flex-1 grid-cols-1 gap-6 p-6 md:grid-cols-3">
        {columns.map((col, i) => (
          <section key={col.key} aria-labelledby={`col-${col.key}`} className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center gap-2">
              <h2 id={`col-${col.key}`} className="text-section text-texto">
                {k.columns[i]}
              </h2>
              <span className="rounded-completo border border-borde bg-fondo px-2 py-1 text-small font-medium text-texto">
                {col.items.length}
              </span>
            </div>
            {col.items.length === 0 && <p className="text-small text-texto-2">{k.empty}</p>}
            {col.items.map((entry) => {
              const time = timeFor(entry, col.key)
              return (
                <KitchenTicket
                  key={`${entry.table.source}:${entry.table.tableId}:${entry.comanda.id}`}
                  entry={entry}
                  column={col.key}
                  timeText={time.text}
                  late={time.late}
                  onAction={() => act(entry, col.next)}
                />
              )
            })}
          </section>
        ))}
      </main>

      <p role="status" className="sr-only">
        {announcement}
      </p>
      {soldOutOpen && <SoldOutDialog onClose={() => setSoldOutOpen(false)} />}
    </>
  )
}

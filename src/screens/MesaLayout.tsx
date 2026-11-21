import { useEffect, useRef } from 'react'
import { Outlet, ScrollRestoration, useLocation, useNavigate, useParams } from 'react-router'
import { WaiterButton } from '../components/WaiterButton'
import { useOpenState } from '../lib/useOpenState'
import { useUi } from '../store/ui'
import { isValidTable, restaurant } from '../lib/catalog'
import { waitForPayment, watchComanda } from '../lib/api'
import { fmt, t } from '../lib/text'
import { notifyStatus } from '../lib/notifications'
import { comandasStore, useComandas } from '../store/comandas'
import { closeTable } from '../lib/closeTable'
import { submitCart } from '../lib/orderFlow'
import { useOnline } from '../lib/useOnline'
import { paths } from '../lib/useMesa'
import { useAccount } from '../store/account'
import { useCart } from '../store/cart'
import { InvalidTable } from './InvalidTable'

/** Todas las pantallas de /m/:mesa. Si la mesa no está en la config: "Este QR no es válido". */
export function MesaLayout() {
  const { mesa } = useParams()
  if (!isValidTable(mesa)) return <InvalidTable />
  return (
    <>
      <TableSession mesa={mesa} />
      <Outlet />
      <FloatingWaiter mesa={mesa} />
      <ScrollRestoration />
    </>
  )
}

/**
 * "Llamar al mesero" flotante en todas las pantallas de la mesa, salvo en la
 * portada, en la cuenta pagada y con el local cerrado sin nada pedido.
 */
function FloatingWaiter({ mesa }: { mesa: string }) {
  const { pathname } = useLocation()
  const welcomeOpen = useUi((s) => s.welcomeOpen)
  const open = useOpenState().open
  const hasAccount = useComandas(mesa, (s) => s.comandas.length > 0)
  if (welcomeOpen || pathname === paths.paid(mesa) || (!open && !hasAccount)) return null
  return <WaiterButton mesa={mesa} />
}

/**
 * Tareas de la sesión de mesa que siguen aunque el cliente cambie de pantalla:
 * - M9: si se tocó "Enviar" sin señal, el pedido se envía solo cuando vuelve.
 * - Después de "Avisar a caja", cuando caja cobra (simulado), se cierra la
 *   mesa y se muestra el recibo (M6c).
 */
function TableSession({ mesa }: { mesa: string }) {
  const navigate = useNavigate()
  const online = useOnline()
  const pendingSend = useCart(mesa, (s) => s.pendingSend)
  const billRequestedAt = useAccount(mesa, (s) => s.billRequestedAt)
  const sending = useRef(false)

  // Reintento del envío al volver la señal.
  useEffect(() => {
    if (!online || !pendingSend || sending.current) return
    sending.current = true
    void submitCart(mesa)
      .then((result) => {
        if (result.ok) navigate(paths.tracking(mesa, result.comanda.id), { replace: true })
      })
      .finally(() => {
        sending.current = false
      })
  }, [online, pendingSend, mesa, navigate])

  useKitchenUpdates(mesa)

  useEffect(() => {
    if (!billRequestedAt) return
    let cancelled = false
    void waitForPayment(mesa, billRequestedAt).then((receipt) => {
      if (cancelled) return
      closeTable(mesa)
      navigate(paths.paid(mesa), { replace: true, state: { receipt } })
    })
    return () => {
      cancelled = true
    }
  }, [mesa, billRequestedAt, navigate])

  return null
}

/**
 * Sigue en cocina todas las órdenes de este teléfono que no se entregaron
 * (así el estado está al día en cualquier pantalla, también en la barra del
 * menú). Cuando una pasa a "¡Ya está!", el teléfono vibra (donde se pueda) y
 * la pestaña cambia de título hasta que se entrega.
 */
function useKitchenUpdates(mesa: string) {
  const store = comandasStore(mesa)
  // Clave estable: cambia solo cuando entra o sale una orden en curso.
  const pending = useComandas(mesa, (s) =>
    s.comandas
      .filter((c) => c.mine && c.status !== 'entregada')
      .map((c) => c.id)
      .join(','),
  )

  useEffect(() => {
    if (!pending) return
    const stops = pending.split(',').map((id) => {
      const comanda = store.getState().comandas.find((c) => c.id === id)
      return comanda ? watchComanda(comanda, (status) => store.getState().setStatus(id, status)) : undefined
    })
    return () => stops.forEach((stop) => stop?.())
  }, [store, pending])

  useEffect(() => {
    const originalTitle = document.title
    const unsubscribe = store.subscribe((state, prev) => {
      const before = new Map(prev.comandas.map((c) => [c.id, c.status]))
      for (const c of state.comandas) {
        if (!c.mine || before.get(c.id) === c.status || !before.has(c.id)) continue
        // Aviso del sistema en cada paso (si el cliente lo activó y el paso está en la config).
        void notifyStatus(c, c.status, mesa)
        if (c.status === 'lista') {
          try {
            navigator.vibrate?.([200, 100, 200])
          } catch {
            /* sin vibración en este teléfono */
          }
          document.title = fmt(t.tracking.readyTabTitle, { name: restaurant.name })
        } else if (c.status === 'entregada') {
          document.title = originalTitle
        }
      }
    })
    return () => {
      unsubscribe()
      document.title = originalTitle
    }
  }, [store, mesa])
}

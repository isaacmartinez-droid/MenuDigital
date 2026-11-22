import { useEffect, useRef, useState } from 'react'
import { wantsFreshTable } from '../lib/demoFlags'
import { Outlet, ScrollRestoration, useLocation, useNavigate, useParams } from 'react-router'
import { WaiterButton } from '../components/WaiterButton'
import { useOpenState } from '../lib/useOpenState'
import { useUi } from '../store/ui'
import { isValidTable } from '../lib/catalog'
import { watchPayment } from '../lib/api'
import { keepOthersOpen, loadServer } from '../lib/server'
import { useComandas } from '../store/comandas'
import { closeTable } from '../lib/closeTable'
import { submitCart } from '../lib/orderFlow'
import { useOnline } from '../lib/useOnline'
import { paths } from '../lib/useMesa'
import { useAccount } from '../store/account'
import { useCart } from '../store/cart'
import { InvalidTable } from './InvalidTable'
import { useKitchenUpdates } from '../lib/useKitchenUpdates'

/** Todas las pantallas de /m/:mesa. Si la mesa no está en la config: "Este QR no es válido". */
export function MesaLayout() {
  const { mesa } = useParams()
  if (!isValidTable(mesa)) return <InvalidTable />
  return <MesaScreens key={mesa} mesa={mesa} />
}

function MesaScreens({ mesa }: { mesa: string }) {
  const location = useLocation()
  const navigate = useNavigate()
  // Demo ?forzar=mesa-nueva: se borra todo lo de la mesa antes de que las pantallas la lean.
  const [fresh] = useState(() => {
    if (!wantsFreshTable(location.search)) return false
    closeTable(mesa)
    return true
  })
  // Después se saca el flag de la dirección (si no, cada recarga volvería a borrar).
  useEffect(() => {
    if (!fresh) return
    const params = new URLSearchParams(location.search)
    const others = params.getAll('forzar').filter((v) => v !== 'mesa-nueva')
    params.delete('forzar')
    others.forEach((v) => params.append('forzar', v))
    const search = params.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true })
    // Solo una vez, al entrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Caja cobra: al avisar a caja (simulado o desde la caja del personal) o, sin
  // aviso, cuando la caja del personal cobra la mesa directamente.
  const hasComandas = useComandas(mesa, (s) => s.comandas.some((c) => c.mine))
  useEffect(() => {
    if (!billRequestedAt && !hasComandas) return
    return watchPayment(mesa, billRequestedAt, (receipt) => {
      const before = loadServer(mesa)
      closeTable(mesa)
      keepOthersOpen(mesa, before)
      navigate(paths.paid(mesa), { replace: true, state: { receipt } })
    })
  }, [mesa, billRequestedAt, hasComandas, navigate])

  return null
}

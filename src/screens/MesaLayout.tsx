import { useEffect, useRef } from 'react'
import { Outlet, ScrollRestoration, useNavigate, useParams } from 'react-router'
import { isValidTable } from '../lib/catalog'
import { waitForPayment } from '../lib/api'
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
      <ScrollRestoration />
    </>
  )
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

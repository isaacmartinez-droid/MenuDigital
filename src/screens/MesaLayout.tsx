import { useEffect } from 'react'
import { Outlet, ScrollRestoration, useNavigate, useParams } from 'react-router'
import { isValidTable } from '../lib/catalog'
import { waitForPayment } from '../lib/api'
import { closeTable } from '../lib/closeTable'
import { paths } from '../lib/useMesa'
import { useAccount } from '../store/account'
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
 * después de "Avisar a caja", cuando caja cobra (simulado), se cierra la mesa
 * y se muestra el recibo (M6c).
 */
function TableSession({ mesa }: { mesa: string }) {
  const navigate = useNavigate()
  const billRequestedAt = useAccount(mesa, (s) => s.billRequestedAt)

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

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { TAKEOUT } from './channel'
import { restaurant } from './catalog'
import { submitCart } from './orderFlow'
import { readSource } from './source'
import { newId } from './storage'
import { paths } from './useMesa'
import { useCustomer } from '../store/customer'

export type ConfirmNotice = { kind: 'limit' | 'error'; key: string }

/**
 * "Confirmar pedido" para llevar (W6 y T4): envía el carrito con nombre,
 * WhatsApp y origen, y abre la confirmación. Si falla, deja un aviso que se
 * va solo a los timings.undoToastMs.
 */
export function useConfirmTakeout() {
  const navigate = useNavigate()
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<ConfirmNotice | null>(null)

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), restaurant.timings.undoToastMs)
    return () => window.clearTimeout(id)
  }, [notice])

  const confirm = async () => {
    if (sending) return
    setSending(true)
    const { name, phone } = useCustomer.getState()
    const result = await submitCart(TAKEOUT, { name, phone, source: readSource() })
    if (result.ok) {
      navigate(paths.confirmation(result.comanda.id), { replace: true })
      return
    }
    setSending(false)
    setNotice({ kind: result.reason === 'limit' ? 'limit' : 'error', key: newId() })
  }

  return { sending, notice, confirm }
}

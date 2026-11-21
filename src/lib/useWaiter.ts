import { useEffect, useState } from 'react'
import { restaurant } from './catalog'
import { callWaiter, watchWaiterCall } from './api'
import { newId } from './storage'
import { useNow } from './useNow'
import { accountStore, useAccount } from '../store/account'

const { waiterBannerMs, waiterCooldownMs } = restaurant.timings

export type WaiterPhase = 'idle' | 'notified' | 'coming'
export type WaiterNotice = { kind: 'cooldown' | 'offline'; key: string }

/** "1:45" */
export const formatCountdown = (ms: number) => {
  const total = Math.ceil(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/**
 * Llamar al mesero (M4d → M4e → M4f):
 *   notified  "Avisamos a los meseros" hasta que uno lo toma
 *   coming    "Carlos va en camino" durante timings.waiterBannerMs
 * Después de llamar, el botón queda bloqueado timings.waiterCooldownMs;
 * si lo tocan, se muestra cuánto falta.
 */
export function useWaiter(mesa: string) {
  const call = useAccount(mesa, (s) => s.waiterCall)
  const now = useNow(1000, Boolean(call))
  const [notice, setNotice] = useState<WaiterNotice | null>(null)

  // Espera a que un mesero tome el aviso (también después de recargar).
  useEffect(() => {
    if (!call || call.ackAt) return
    return watchWaiterCall(call.at, (waiter) => accountStore(mesa).getState().ackWaiterCall(waiter))
  }, [call, mesa])

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), 3500)
    return () => window.clearTimeout(id)
  }, [notice])

  let phase: WaiterPhase = 'idle'
  if (call && !call.ackAt) phase = 'notified'
  else if (call?.ackAt && now - call.ackAt < waiterBannerMs) phase = 'coming'

  const cooldownLeft = call ? Math.max(0, call.at + waiterCooldownMs - now) : 0
  const coolingDown = cooldownLeft > 0

  /** Devuelve false si está bloqueado (y muestra cuánto falta). */
  const tryOpen = (): boolean => {
    if (coolingDown) {
      setNotice({ kind: 'cooldown', key: newId() })
      return false
    }
    return true
  }

  const send = async (reason: string) => {
    const account = accountStore(mesa).getState()
    account.startWaiterCall(reason)
    try {
      await callWaiter(mesa, reason)
    } catch {
      account.cancelWaiterCall()
      setNotice({ kind: 'offline', key: newId() })
    }
  }

  return {
    phase,
    waiter: call?.waiter ?? restaurant.staff.waiter,
    cooldownLeft,
    coolingDown,
    notice,
    tryOpen,
    send,
  }
}

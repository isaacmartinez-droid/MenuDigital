import { useEffect, useState } from 'react'
import { restaurant } from './catalog'
import { useDemoFlags } from './demoFlags'
import { getOpenState, nextOpening, todayClosing, type OpenState } from './schedule'

const { ranges, timezone } = restaurant.schedule

/**
 * ¿Está abierto el local? Usa el horario de la config en la zona del local
 * (America/Managua) y se recalcula cada minuto. ?forzar=cerrado / abierto lo pisa.
 */
export function useOpenState(): OpenState {
  const { horario: forzar } = useDemoFlags()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  if (forzar === 'cerrado') return { open: false, opensAt: nextOpening(ranges, timezone, now) }
  if (forzar === 'abierto') {
    const real = getOpenState(ranges, timezone, now)
    return { open: true, closesAt: real.closesAt ?? todayClosing(ranges, timezone, now) }
  }
  return getOpenState(ranges, timezone, now)
}

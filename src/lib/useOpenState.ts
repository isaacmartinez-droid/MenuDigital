import { useEffect, useState } from 'react'
import { restaurant } from './catalog'
import { useDemoFlags } from './demoFlags'
import { getOpenState, nextOpening, todayClosing, zonedNow, type OpenState } from './schedule'
import { isClosedToday, usePanelSettings } from '../store/panelSettings'

const { ranges, timezone } = restaurant.schedule

/** Próxima apertura a partir de mañana (para "Cerrar hoy"). */
function openingTomorrow(now: Date): string | undefined {
  const { minutes } = zonedNow(timezone, now)
  return nextOpening(ranges, timezone, new Date(now.getTime() + (24 * 60 - minutes) * 60_000))
}

/**
 * ¿Está abierto el local? Usa el horario de la config en la zona del local
 * (America/Managua) y se recalcula cada minuto. Lo que manda, en orden:
 * 1. ?forzar=cerrado;
 * 2. "Cerrar hoy" del panel (P4 Horarios), que gana incluso a ?forzar=abierto;
 * 3. ?forzar=abierto, o la regla "Solo en horario de atención" apagada (P4b);
 * 4. el horario.
 */
export function useOpenState(): OpenState {
  const { horario: forzar } = useDemoFlags()
  const closedOn = usePanelSettings((s) => s.closedOn)
  const onlyInHours = usePanelSettings((s) => s.onlyInHours)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  if (forzar === 'cerrado') return { open: false, opensAt: nextOpening(ranges, timezone, now) }
  if (isClosedToday(closedOn, now)) return { open: false, opensAt: openingTomorrow(now) }
  if (forzar === 'abierto' || !onlyInHours) {
    const real = getOpenState(ranges, timezone, now)
    return { open: true, closesAt: real.closesAt ?? todayClosing(ranges, timezone, now) }
  }
  return getOpenState(ranges, timezone, now)
}

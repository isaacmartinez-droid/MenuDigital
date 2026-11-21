import { restaurant } from '../lib/catalog'
import { fmt, t } from '../lib/text'
import { formatCountdown, type WaiterNotice, type WaiterPhase } from '../lib/useWaiter'
import { NoticeBanner } from './NoticeBanner'

interface WaiterBannerProps {
  phase: WaiterPhase
  waiter: string
  notice: WaiterNotice | null
  cooldownLeft: number
  className?: string
}

const cooldownMinutes = Math.round(restaurant.timings.waiterCooldownMs / 60000)

/** M4e "Avisamos a los meseros" y M4f "Carlos va en camino", más el aviso de espera. */
export function WaiterBanner({ phase, waiter, notice, cooldownLeft, className }: WaiterBannerProps) {
  if (notice?.kind === 'offline') {
    return (
      <NoticeBanner
        key={notice.key}
        role="status"
        tone="aviso"
        title={t.waiter.offlineTitle}
        body={t.waiter.offlineBody}
        className={className}
      />
    )
  }
  if (notice?.kind === 'cooldown') {
    return (
      <NoticeBanner
        key={notice.key}
        role="status"
        tone="positivo"
        title={phase === 'notified' ? t.waiter.notifiedTitle : fmt(t.waiter.cooldownTitle, { waiter })}
        body={fmt(t.waiter.cooldown, { time: formatCountdown(cooldownLeft) })}
        className={className}
      />
    )
  }
  if (phase === 'notified') {
    return (
      <NoticeBanner
        role="status"
        tone="positivo"
        title={t.waiter.notifiedTitle}
        body={t.waiter.notifiedBody}
        className={className}
      />
    )
  }
  if (phase === 'coming') {
    return (
      <NoticeBanner
        role="status"
        tone="positivo"
        title={fmt(t.waiter.comingTitle, { waiter })}
        body={fmt(t.waiter.comingBody, { min: cooldownMinutes })}
        className={className}
      />
    )
  }
  return null
}

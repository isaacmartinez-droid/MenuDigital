import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { cx } from '../lib/cx'
import { t } from '../lib/text'
import { useWaiter } from '../lib/useWaiter'
import { WaiterBanner } from './WaiterBanner'
import { WaiterSheet } from './WaiterSheet'

/** true mientras la página se está desplazando (y un rato después). */
function useScrolling(idleMs = 900): boolean {
  const [scrolling, setScrolling] = useState(false)
  useEffect(() => {
    let timer = 0
    const onScroll = () => {
      setScrolling(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setScrolling(false), idleMs)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.clearTimeout(timer)
    }
  }, [idleMs])
  return scrolling
}

/**
 * "Llamar al mesero" flotante (como el de WhatsApp), a mano en todas las
 * pantallas de la mesa. Queda abajo a la derecha, por encima de la barra fija
 * de cada pantalla (--dock-h). Mientras se desplaza la lista se achica a la
 * campana para no tapar platos. Encima muestra el estado del llamado
 * (M4e "Avisamos a los meseros", M4f "Carlos va en camino") y, si ya se llamó
 * hace poco, cuánto falta para volver a llamar.
 */
export function WaiterButton({ mesa }: { mesa: string }) {
  const waiter = useWaiter(mesa)
  const [sheet, setSheet] = useState(false)
  const scrolling = useScrolling()
  const busy = waiter.phase !== 'idle'
  const compact = scrolling && !busy && !waiter.notice

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 z-40 mx-auto w-full max-w-[var(--container-app)] px-4"
        style={{ bottom: 'calc(var(--dock-h, 0px) + 16px + env(safe-area-inset-bottom))' }}
      >
        {(busy || waiter.notice) && (
          <div className="pointer-events-auto mb-2 ml-auto max-w-[320px] animate-pop-in rounded-tarjeta shadow-[0_6px_20px_rgb(42_33_27/0.14)]">
            <WaiterBanner
              phase={waiter.phase}
              waiter={waiter.waiter}
              notice={waiter.notice}
              cooldownLeft={waiter.cooldownLeft}
            />
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => waiter.tryOpen() && setSheet(true)}
            aria-label={t.menu.callWaiter}
            aria-disabled={waiter.coolingDown || undefined}
            className={cx(
              'pointer-events-auto inline-flex h-12 items-center rounded-completo border border-borde bg-tarjeta text-small font-semibold shadow-[0_4px_14px_rgb(42_33_27/0.14)] transition-[padding,background-color] duration-200',
              compact ? 'px-3.5' : 'pr-4 pl-3.5',
              waiter.coolingDown ? 'text-texto-2' : 'text-texto',
            )}
          >
            <Bell size={20} strokeWidth={2} aria-hidden className={waiter.coolingDown ? 'text-texto-2' : 'text-verde'} />
            <span
              aria-hidden
              className={cx(
                'overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-200',
                compact ? 'ml-0 max-w-0 opacity-0' : 'ml-2 max-w-[12rem] opacity-100',
              )}
            >
              {t.menu.callWaiter}
            </span>
          </button>
        </div>
      </div>

      <WaiterSheet
        open={sheet}
        onClose={() => setSheet(false)}
        onSubmit={(reason) => {
          setSheet(false)
          void waiter.send(reason)
        }}
      />
    </>
  )
}

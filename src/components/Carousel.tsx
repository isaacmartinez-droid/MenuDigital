import { Children, useEffect, useRef, useState, type ReactNode } from 'react'
import { Pause, Play } from 'lucide-react'
import { cx } from '../lib/cx'
import { scrollBehavior } from '../lib/motion'
import { t } from '../lib/text'

interface CarouselProps {
  title: string
  titleId: string
  /** Línea chica bajo el título. */
  subtitle?: string
  /** Espacio sobre el título al saltar a él desde las pestañas (las pestañas son fijas). */
  scrollMarginTop?: number
  className?: string
  /** Cada cuánto avanza solo (config: timings.carouselMs). */
  intervalMs: number
  /** Link a la derecha del título (en la web: "Ver menú →"). */
  action?: ReactNode
  /** Una tarjeta por hijo; cada una con snap-start. */
  children: ReactNode
}

const prefersReducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return true
  }
}

/** Cuánto espera después de un toque antes de seguir solo. */
const HOLD_MS = 4000

const slidesOf =(track: HTMLElement) => [...track.children] as HTMLElement[]
const padOf = (track: HTMLElement) => parseFloat(getComputedStyle(track).paddingLeft) || 0

function scrollToSlide(track: HTMLElement, index: number) {
  const slide = slidesOf(track)[index]
  if (slide) track.scrollTo({ left: slide.offsetLeft - padOf(track), behavior: scrollBehavior() })
}

/**
 * Carrusel horizontal ("Los más vendidos"): se desliza con el dedo y encaja
 * en cada tarjeta; avanza solo cada `intervalMs` mientras está a la vista.
 * No se detiene: si la persona lo toca, espera unos segundos y sigue (y no se
 * mueve mientras el foco del teclado está adentro). El botón de pausa lo para
 * del todo (WCAG 2.2.2). Con "reducir movimiento" en el sistema no arranca solo.
 */
export function Carousel({
  title,
  titleId,
  subtitle,
  scrollMarginTop,
  className,
  intervalMs,
  action,
  children,
}: CarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(0)
  const count = Children.count(children)
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(() => count > 1 && !prefersReducedMotion())
  const [visible, setVisible] = useState(false)
  // Toque reciente o foco adentro: espera y después retoma.
  const [held, setHeld] = useState(false)
  const [focused, setFocused] = useState(false)
  const holdTimer = useRef(0)
  const hold = () => {
    setHeld(true)
    window.clearTimeout(holdTimer.current)
    holdTimer.current = window.setTimeout(() => setHeld(false), HOLD_MS)
  }
  useEffect(() => () => window.clearTimeout(holdTimer.current), [])

  // Solo avanza mientras se ve (no mueve nada fuera de pantalla).
  useEffect(() => {
    const track = trackRef.current
    if (!track || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.6 })
    io.observe(track)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!playing || !visible || held || focused) return
    const id = window.setInterval(() => {
      const track = trackRef.current
      if (!track || document.hidden) return
      scrollToSlide(track, activeRef.current >= count - 1 ? 0 : activeRef.current + 1)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [playing, visible, held, focused, count, intervalMs])

  const onScroll = () => {
    const track = trackRef.current
    if (!track) return
    let index: number
    if (track.scrollLeft >= track.scrollWidth - track.clientWidth - 2) {
      index = count - 1
    } else {
      const left = track.scrollLeft + padOf(track)
      const distances = slidesOf(track).map((s) => Math.abs(s.offsetLeft - left))
      index = distances.indexOf(Math.min(...distances))
    }
    activeRef.current = index
    setActive(index)
  }

  return (
    <section aria-labelledby={titleId} aria-roledescription="carrusel" className={className}>
      <div className="flex items-center justify-between gap-3 px-4">
        <div className="min-w-0">
          <h2 id={titleId} className="text-section text-texto" style={{ scrollMarginTop }}>
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-small text-texto-2">{subtitle}</p>}
        </div>
        {action && <div className="ml-auto shrink-0">{action}</div>}
        {count > 1 && (
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? t.menu.carouselPause : t.menu.carouselPlay}
            className="-my-2.5 -mr-2.5 grid size-11 place-items-center rounded-completo text-texto-2"
          >
            {playing ? <Pause size={18} strokeWidth={2} aria-hidden /> : <Play size={18} strokeWidth={2} aria-hidden />}
          </button>
        )}
      </div>

      <div
        ref={trackRef}
        onScroll={onScroll}
        onPointerDown={hold}
        onTouchMove={hold}
        onWheel={hold}
        // Solo el foco de teclado lo frena (tocar un botón también da foco, y eso no debe pararlo).
        onFocus={(e) => {
          if ((e.target as HTMLElement).matches(':focus-visible')) setFocused(true)
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
        }}
        className="no-scrollbar relative mt-3 flex snap-x snap-mandatory scroll-px-4 gap-[13px] overflow-x-auto px-4"
      >
        {children}
      </div>

      {count > 1 && (
        <div aria-hidden className="mt-3 flex justify-center gap-1.5">
          {Array.from({ length: count }, (_, i) => (
            <span
              key={i}
              className={cx(
                'h-1.5 rounded-completo transition-[width,background-color] duration-300',
                i === active ? 'w-4 bg-verde' : 'w-1.5 bg-texto-2/30',
              )}
            />
          ))}
        </div>
      )}
    </section>
  )
}

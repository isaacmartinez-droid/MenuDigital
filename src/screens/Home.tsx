import { Link, useNavigate } from 'react-router'
import { Bike, Clock, MapPin, ShoppingBag, Star } from 'lucide-react'
import type { Dish } from '../types/menu'
import type { ScheduleRange } from '../types/restaurant'
import { Button } from '../components/Button'
import { BottomDock, DockSpacer } from '../components/CartBar'
import { Carousel } from '../components/Carousel'
import { DishCard } from '../components/DishCard'
import { PromoCard } from '../components/PromoCard'
import { WhatsAppButton } from '../components/WhatsAppButton'
import { TAKEOUT } from '../lib/channel'
import { getSide, menu, restaurant } from '../lib/catalog'
import { bestSellersFor, daysLabel, useToday } from '../lib/combos'
import { cx } from '../lib/cx'
import { formatClock } from '../lib/schedule'
import { fmt, t } from '../lib/text'
import { useOpenState } from '../lib/useOpenState'
import { paths } from '../lib/useMesa'
import { cartStore, dishQuantity, useCart } from '../store/cart'
import { useUi } from '../store/ui'

const { web } = restaurant

/** "10:00 pm" → "10 pm" (la portada usa la hora corta). */
const shortClock = (clock: string) => clock.replace(':00', '')

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** "Todos los días · 4:00 pm a 10:00 pm", una línea por franja del horario. */
function scheduleLines(ranges: ScheduleRange[]): string[] {
  return ranges.map((r) =>
    fmt(t.web.hoursRange, {
      days: r.days.length === 7 ? t.web.everyDay : daysLabel(r.days),
      open: formatClock(toMinutes(r.open)),
      close: formatClock(toMinutes(r.close)),
    }),
  )
}

function Stars({ size }: { size: number }) {
  return (
    <span aria-hidden className="flex gap-1 text-ambar">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={size} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  )
}

/** W1 Inicio de la página web: portada, cómo lo querés, promo, más vendidos, reseñas, horario y ubicación. */
export function Home() {
  const navigate = useNavigate()
  const openState = useOpenState()
  const today = useToday()
  const items = useCart(TAKEOUT, (s) => s.items)
  const bestSellers = bestSellersFor(today)
  const promo = menu.promo
  const goMenu = () => navigate(paths.menu(TAKEOUT))
  // Horario de hoy para la tablet: "Abierto hoy · 4:00 pm a 10:00 pm".
  const todayRange = restaurant.schedule.ranges.find((r) => r.days.includes(today))
  const todayHours = todayRange
    ? { open: formatClock(toMinutes(todayRange.open)), close: formatClock(toMinutes(todayRange.close)) }
    : null

  // El + de la portada agrega y lleva al menú, donde se ve el aviso con Deshacer.
  const quickAdd = (dish: Dish) => {
    const result = cartStore(TAKEOUT).getState().quickAdd(dish.id)
    if (result.ok) {
      const side = getSide(dish.defaultSide)
      useUi.getState().setFlash({
        lineId: result.lineId,
        title: fmt(t.menu.added, { dish: dish.name }),
        body: side ? fmt(t.menu.addedWithSide, { side: side.name.toLowerCase() }) : t.menu.addedPlain,
      })
    }
    goMenu()
  }

  const linkClass = 'inline-flex min-h-11 items-center text-dish text-verde'

  return (
    <>
      <div className="app-shell">
        <main>
          {/* Portada */}
          <section className="relative h-[440px] overflow-hidden text-blanco tablet:h-[420px]">
            <img
              src={web.cover}
              alt=""
              width={800}
              height={800}
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(42_33_27/0)_30%,rgb(31_23_18/0.85)_100%)] tablet:hidden"
            />
            {/* Celular: arriba a la izquierda; tablet (T1): más grande, abajo a la izquierda. */}
            <picture className="absolute top-4 left-4 block h-16 w-[84px] rounded-tarjeta bg-tarjeta p-1 tablet:top-auto tablet:bottom-6 tablet:left-8 tablet:h-[118px] tablet:w-[156px] tablet:p-2">
              {/* El navegador elige: la chica en celular (84 px), la grande en tablet (156 px). */}
              <source
                srcSet={`${restaurant.logo.small ?? restaurant.logo.webp} 192w, ${restaurant.logo.webp} 382w`}
                sizes="(min-width: 768px) 156px, 84px"
                type="image/webp"
              />
              <img
                src={restaurant.logo.png}
                alt={restaurant.logo.alt}
                width={76}
                height={56}
                className="h-full w-full object-contain"
              />
            </picture>
            <p className="absolute top-6 right-4 inline-flex items-center gap-2 rounded-completo bg-tarjeta px-3 py-2 text-small tablet:hidden">
              <span
                aria-hidden
                className={cx('size-2 rounded-completo', openState.open ? 'bg-verde' : 'bg-promo')}
              />
              <span className={openState.open ? 'text-verde' : 'text-promo'}>
                {openState.open
                  ? fmt(t.web.openUntil, { close: shortClock(openState.closesAt ?? '') })
                  : fmt(t.web.closedUntil, { open: shortClock(openState.opensAt ?? '') })}
              </span>
            </p>
            <div className="absolute inset-x-4 bottom-5 flex flex-col gap-2 tablet:hidden">
              <h1 className="text-display">{restaurant.name}</h1>
              <p className="text-body">{t.web.tagline}</p>
              <p className="flex items-center gap-2 text-small">
                <Stars size={14} />
                <span className="sr-only">{fmt(t.web.googleStars, { rating: web.google.rating })}. </span>
                <span>{fmt(t.web.googleRating, { rating: web.google.rating, count: web.google.count })}</span>
              </p>
            </div>
          </section>

          {/* T1 (tablet): el nombre y el horario de hoy, debajo de la portada. */}
          <div className="hidden px-8 pt-6 tablet:block">
            <h1 className="text-title-lg text-texto">{restaurant.name}</h1>
            <p className="mt-2 flex items-center gap-2 text-body text-texto-2">
              <span
                aria-hidden
                className={cx('size-2 rounded-completo', openState.open ? 'bg-verde' : 'bg-promo')}
              />
              {openState.open
                ? todayHours
                  ? fmt(t.web.openToday, todayHours)
                  : fmt(t.status.open, { close: openState.closesAt ?? '' })
                : fmt(t.web.closedToday, { open: openState.opensAt ?? '' })}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-6">
            {/* ¿Cómo lo querés? */}
            <section aria-labelledby="como" className="px-4 tablet:hidden">
              <h2 id="como" className="text-section text-texto">
                {t.web.howTitle}
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Link
                  to={paths.menu(TAKEOUT)}
                  className="flex flex-col gap-2 rounded-grande border-2 border-verde bg-verde-suave p-4 active:opacity-80"
                >
                  <ShoppingBag size={24} strokeWidth={1.8} aria-hidden className="text-verde" />
                  <span className="text-dish text-texto">{t.web.takeoutTitle}</span>
                  <span className="text-small text-texto-2">{t.web.takeoutHint}</span>
                </Link>
                <Link
                  to={paths.delivery}
                  className="flex flex-col gap-2 rounded-grande border border-borde bg-tarjeta p-4 active:opacity-80"
                >
                  <Bike size={24} strokeWidth={1.8} aria-hidden className="text-texto-2" />
                  <span className="text-dish text-texto-2">{t.web.deliveryTitle}</span>
                  <span className="text-small text-texto-2">{t.web.soon}</span>
                </Link>
              </div>
              <p className="mt-3 text-small text-texto-2">{t.web.qrHint}</p>
            </section>

            {/* Promo del día */}
            {promo && (
              <div className="px-4 tablet:px-8">
                <PromoCard promo={promo} subtitle={promo.homeSubtitle} onClick={goMenu} />
              </div>
            )}

            {/* Los más vendidos */}
            {bestSellers.length > 0 && (
              <Carousel
                title={t.menu.bestSellers}
                titleId="mas-vendidos"
                intervalMs={restaurant.timings.carouselMs}
                className="tablet:hidden"
                action={
                  <Link to={paths.menu(TAKEOUT)} className={cx(linkClass, '-my-2.5')}>
                    {t.web.seeMenu}
                  </Link>
                }
              >
                {bestSellers.map((dish) => (
                  <DishCard
                    key={dish.id}
                    variant="carousel"
                    dish={dish}
                    today={today}
                    quantity={dishQuantity(items, dish.id)}
                    canOrder={openState.open}
                    onAdd={() => quickAdd(dish)}
                    onDecrement={() => cartStore(TAKEOUT).getState().decrementDish(dish.id)}
                    onOpen={() => navigate(paths.dish(TAKEOUT, dish.id))}
                  />
                ))}
              </Carousel>
            )}

            {/* T1 (tablet): los más vendidos en grilla de 3. */}
            {bestSellers.length > 0 && (
              <section aria-labelledby="mas-vendidos-grilla" className="hidden px-8 tablet:block">
                <h2 id="mas-vendidos-grilla" className="text-section text-texto">
                  {t.menu.bestSellers}
                </h2>
                <div className="mt-3 grid grid-cols-3 gap-4">
                  {bestSellers.slice(0, 3).map((dish) => (
                    <DishCard
                      key={dish.id}
                      variant="carousel"
                      fluid
                      photoClassName="h-[150px]"
                      dish={dish}
                      today={today}
                      quantity={dishQuantity(items, dish.id)}
                      canOrder={openState.open}
                      onAdd={() => quickAdd(dish)}
                      onDecrement={() => cartStore(TAKEOUT).getState().decrementDish(dish.id)}
                      onOpen={() => navigate(paths.dish(TAKEOUT, dish.id))}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Reseñas de Google */}
            <section aria-labelledby="resenas">
              <div className="flex items-center justify-between gap-3 px-4 tablet:px-8">
                <h2 id="resenas" className="text-section text-texto">
                  {t.web.reviewsTitle}
                </h2>
                <p className="flex items-center gap-1 text-dish text-texto">
                  <Star size={16} fill="currentColor" strokeWidth={0} aria-hidden className="text-ambar" />
                  <span className="sr-only">{fmt(t.web.googleStars, { rating: web.google.rating })}</span>
                  <span aria-hidden>{web.google.rating}</span>
                </p>
              </div>
              {/* Tablet: dos reseñas lado a lado. */}
              <ul className="no-scrollbar mt-3 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 tablet:grid tablet:grid-cols-2 tablet:px-8 tablet:[&>li:nth-child(n+3)]:hidden">
                {web.google.reviews.map((review) => (
                  <li
                    key={review.text}
                    className="flex w-[280px] shrink-0 snap-start flex-col gap-2 rounded-grande border border-borde bg-tarjeta p-4 tablet:w-auto"
                  >
                    <Stars size={14} />
                    <p className="text-body text-texto">“{review.text}”</p>
                    <p className="text-small text-texto-2">{fmt(t.web.reviewAuthor, { when: review.when })}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex items-center justify-between gap-3 px-4 tablet:px-8">
                <p className="text-small text-texto-2">{t.web.reviewsNote}</p>
                <a href={web.google.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {t.web.seeAll}
                  <span className="sr-only"> {t.web.newTab}</span>
                </a>
              </div>
            </section>

            {/* Horario y ubicación */}
            <section className="px-4 tablet:hidden">
              <div className="rounded-grande border border-borde bg-tarjeta px-4">
                <div className="flex items-center gap-3 py-4">
                  <Clock size={20} strokeWidth={1.8} aria-hidden className="shrink-0 text-verde" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-dish text-texto">{t.web.hoursTitle}</h2>
                    {scheduleLines(restaurant.schedule.ranges).map((line) => (
                      <p key={line} className="text-small text-texto-2">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 py-4">
                  <MapPin size={20} strokeWidth={1.8} aria-hidden className="shrink-0 text-verde" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-dish text-texto">{t.web.whereTitle}</h2>
                    <p className="text-small text-texto-2">{web.address || t.web.addressPending}</p>
                  </div>
                  <a href={web.mapsUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    {t.web.directions}
                    <span className="sr-only"> {t.web.newTab}</span>
                  </a>
                </div>
              </div>
            </section>
          </div>

          <DockSpacer />
        </main>
      </div>

      <BottomDock>
        {/* T1 (tablet): "Cómo llegar" al lado de "Ver menú y pedir". */}
        <div className="flex gap-3">
          <a
            href={web.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden h-[52px] flex-1 items-center justify-center gap-2 rounded-grande border border-borde bg-tarjeta text-button text-texto tablet:inline-flex"
          >
            <MapPin size={20} strokeWidth={1.8} aria-hidden />
            {t.web.directions}
            <span className="sr-only"> {t.web.newTab}</span>
          </a>
          <Button block onClick={goMenu} className="flex-1">
            {t.web.cta}
          </Button>
        </div>
      </BottomDock>
      <WhatsAppButton />
    </>
  )
}

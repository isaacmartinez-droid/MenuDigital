import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Clock, MapPin, MessageCircle, Star } from 'lucide-react'
import type { Dish } from '../types/menu'
import { Button } from '../components/Button'
import { DesktopNav } from '../components/DesktopNav'
import { DishCard } from '../components/DishCard'
import { GoogleStars } from '../components/GoogleStars'
import { PromoRow } from '../components/PromoCard'
import { WhatsAppButton } from '../components/WhatsAppButton'
import { TAKEOUT } from '../lib/channel'
import { restaurant } from '../lib/catalog'
import { bestSellersFor, useToday } from '../lib/combos'
import { cx } from '../lib/cx'
import { hoursOn, scheduleLines } from '../lib/hours'
import { fmt, t } from '../lib/text'
import { useOpenState } from '../lib/useOpenState'
import { useActivePromos } from '../lib/promo'
import { paths } from '../lib/useMesa'
import { whatsappDisplay, whatsappHref } from '../lib/whatsapp'
import { cartStore, dishQuantity, useCart } from '../store/cart'

const { web } = restaurant

/**
 * D1 Inicio en computadora: barra de navegación, portada en dos columnas (texto,
 * botones y promo a la izquierda; foto grande a la derecha), los más vendidos en
 * grilla de 4, reseñas de Google en 3 columnas y horario, dirección y WhatsApp.
 */
export function HomeDesktop({ quickAdd }: { quickAdd: (dish: Dish) => void }) {
  const navigate = useNavigate()
  const openState = useOpenState()
  const today = useToday()
  const items = useCart(TAKEOUT, (s) => s.items)
  const bestSellers = bestSellersFor(today).slice(0, 4)
  const promos = useActivePromos()
  const todayHours = hoursOn(today)
  const goMenu = () => navigate(paths.menu(TAKEOUT))
  const linkClass = 'inline-flex min-h-11 items-center text-dish text-verde hover:underline'
  const secondary =
    'inline-flex h-[52px] items-center justify-center gap-2 rounded-grande border border-borde bg-tarjeta px-5 text-button text-texto hover:border-texto-2'

  return (
    <>
      <DesktopNav action="menu" />
      <main className="mx-auto max-w-[1440px] px-12 pb-12">
        {/* Portada */}
        <section className="flex items-center gap-12 py-12">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-6">
            <p className="flex items-center gap-2 text-body text-texto-2">
              <span aria-hidden className={cx('size-2 rounded-completo', openState.open ? 'bg-verde' : 'bg-promo')} />
              {openState.open
                ? todayHours
                  ? fmt(t.web.openToday, todayHours)
                  : fmt(t.status.open, { close: openState.closesAt ?? '' })
                : fmt(t.web.closedToday, { open: openState.opensAt ?? '' })}
            </p>
            <h1 className="text-display text-texto">{restaurant.name}</h1>
            <p className="max-w-[520px] text-section font-normal text-texto-2">{t.web.leadDesktop}</p>
            <div className="flex gap-3">
              <Button onClick={goMenu} className="px-6">
                {t.web.cta}
              </Button>
              <a href={web.mapsUrl} target="_blank" rel="noopener noreferrer" className={secondary}>
                <MapPin size={20} strokeWidth={1.8} aria-hidden />
                {t.web.directions}
                <span className="sr-only"> {t.web.newTab}</span>
              </a>
            </div>
            {promos.length > 0 && (
              <div className="w-full max-w-[560px]">
                <PromoRow promos={promos} onOpen={goMenu} />
              </div>
            )}
          </div>
          <img
            src={web.cover}
            alt=""
            width={640}
            height={480}
            fetchPriority="high"
            className="h-[480px] w-[640px] shrink-0 rounded-grande object-cover"
          />
        </section>

        {/* Los más vendidos */}
        {bestSellers.length > 0 && (
          <section aria-labelledby="mas-vendidos-d" className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 id="mas-vendidos-d" className="text-title-lg text-texto">
                {t.menu.bestSellers}
              </h2>
              <Link to={paths.menu(TAKEOUT)} className={linkClass}>
                {t.web.seeAllMenu}
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-6">
              {bestSellers.map((dish) => (
                <DishCard
                  key={dish.id}
                  variant="carousel"
                  fluid
                  photoClassName="h-[220px]"
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
        <section aria-labelledby="resenas-d" className="flex flex-col gap-4 py-12">
          <div className="flex items-center justify-between">
            <h2 id="resenas-d" className="text-section text-texto">
              {t.web.reviewsTitle}
            </h2>
            <p className="flex items-center gap-1 text-dish text-texto">
              <Star size={16} fill="currentColor" strokeWidth={0} aria-hidden className="text-ambar" />
              <span className="sr-only">{fmt(t.web.googleStars, { rating: web.google.rating })}</span>
              <span aria-hidden>{web.google.rating}</span>
            </p>
          </div>
          <ul className="grid grid-cols-3 gap-6">
            {web.google.reviews.map((review) => (
              <li key={review.text} className="flex flex-col gap-2 rounded-grande border border-borde bg-tarjeta p-4">
                <GoogleStars size={14} />
                <p className="text-body text-texto">“{review.text}”</p>
                <p className="text-small text-texto-2">{fmt(t.web.reviewAuthor, { when: review.when })}</p>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between">
            <p className="text-small text-texto-2">{t.web.reviewsNote}</p>
            <a href={web.google.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {t.web.seeAll}
              <span className="sr-only"> {t.web.newTab}</span>
            </a>
          </div>
        </section>

        {/* Horario, dirección y WhatsApp */}
        <section id="horario" className="grid scroll-mt-24 grid-cols-3 gap-6">
          <InfoCard icon={<Clock size={20} strokeWidth={1.8} />} title={t.web.hoursTitle}>
            {scheduleLines().join(' · ')}
          </InfoCard>
          <InfoCard icon={<MapPin size={20} strokeWidth={1.8} />} title={t.web.whereTitle}>
            {web.address || t.web.addressPending}{' '}
            <a href={web.mapsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-verde hover:underline">
              {t.web.directions}
              <span className="sr-only"> {t.web.newTab}</span>
            </a>
          </InfoCard>
          <InfoCard icon={<MessageCircle size={20} strokeWidth={1.8} />} title={t.web.whatsTitle}>
            {whatsappHref() ? (
              <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="hover:text-verde hover:underline">
                {fmt(t.web.whatsValue, { number: whatsappDisplay() })}
                <span className="sr-only"> {t.web.newTab}</span>
              </a>
            ) : (
              fmt(t.web.whatsValue, { number: '' })
            )}
          </InfoCard>
        </section>
      </main>
      <WhatsAppButton />
    </>
  )
}

function InfoCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-grande border border-borde bg-tarjeta p-6">
      <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-completo bg-verde-suave text-verde">
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-dish text-texto">{title}</h2>
        <p className="mt-1 text-body text-texto-2">{children}</p>
      </div>
    </div>
  )
}

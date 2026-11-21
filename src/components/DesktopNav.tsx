import { Link, useNavigate } from 'react-router'
import { ShoppingBag } from 'lucide-react'
import { TAKEOUT } from '../lib/channel'
import { restaurant } from '../lib/catalog'
import { cx } from '../lib/cx'
import { formatMoney } from '../lib/money'
import { fmt, t } from '../lib/text'
import { useOpenState } from '../lib/useOpenState'
import { paths } from '../lib/useMesa'
import { cartTotal, countItems, useCart } from '../store/cart'
import { Button } from './Button'

interface DesktopNavProps {
  /** Botón de la derecha: "Ver menú y pedir" (inicio), "Ver pedido" (menú) o ninguno (datos y confirmación). */
  action?: 'menu' | 'cart' | 'none'
  /** Enlace marcado como actual. */
  active?: 'menu'
}

/**
 * Barra de navegación de la web en computadora (D1–D5): marca con el estado del
 * local, enlaces (Menú, Promos, Cómo llegar, Horario), "Para llevar" y la acción.
 */
export function DesktopNav({ action = 'menu', active }: DesktopNavProps) {
  const navigate = useNavigate()
  const openState = useOpenState()
  const items = useCart(TAKEOUT, (s) => s.items)
  const count = countItems(items)
  const link = 'text-dish transition-colors hover:text-verde'

  return (
    <header className="sticky top-0 z-30 border-b border-borde bg-tarjeta">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-12 py-3">
        <Link to={paths.home} className="flex items-center gap-3">
          <picture className="block h-[47px] w-16 shrink-0 overflow-hidden rounded-chico bg-tarjeta">
            <source srcSet={restaurant.logo.small ?? restaurant.logo.webp} type="image/webp" />
            <img src={restaurant.logo.png} alt={restaurant.logo.alt} width={64} height={47} className="h-full w-full object-contain" />
          </picture>
          <span>
            <span className="block text-section text-texto">{restaurant.name}</span>
            <span className="flex items-center gap-1 text-small text-texto-2">
              <span aria-hidden className={cx('size-[7px] rounded-completo', openState.open ? 'bg-verde' : 'bg-promo')} />
              {openState.open
                ? fmt(t.status.open, { close: openState.closesAt ?? '' })
                : fmt(t.status.closed, { open: openState.opensAt ?? '' })}
            </span>
          </span>
        </Link>

        <nav aria-label={t.web.navLabel} className="flex items-center gap-8">
          <Link to={paths.menu(TAKEOUT)} className={cx(link, active === 'menu' ? 'text-verde' : 'text-texto')}>
            {t.web.navMenu}
          </Link>
          <Link to={`${paths.menu(TAKEOUT)}#promos`} className={cx(link, 'text-texto')}>
            {t.web.navPromos}
          </Link>
          <a href={restaurant.web.mapsUrl} target="_blank" rel="noopener noreferrer" className={cx(link, 'text-texto')}>
            {t.web.directions}
            <span className="sr-only"> {t.web.newTab}</span>
          </a>
          <Link to={`${paths.home}#horario`} className={cx(link, 'text-texto')}>
            {t.web.navHours}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-completo bg-verde-suave px-3 py-2 text-small font-medium text-verde">
            <ShoppingBag size={16} strokeWidth={1.8} aria-hidden />
            {t.web.place}
          </span>
          {action === 'menu' && <Button onClick={() => navigate(paths.menu(TAKEOUT))}>{t.web.cta}</Button>}
          {action === 'cart' && count > 0 && (
            <Button onClick={() => navigate(paths.summary)} trailing={formatMoney(cartTotal(items))} className="gap-6">
              {fmt(t.web.viewOrder, { n: count })}
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

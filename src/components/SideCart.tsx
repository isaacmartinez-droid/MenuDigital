import { useNavigate } from 'react-router'
import { CupSoda } from 'lucide-react'
import type { Dish } from '../types/menu'
import { TAKEOUT } from '../lib/channel'
import { getDish, getExtra, getSide, menu } from '../lib/catalog'
import { formatMoney } from '../lib/money'
import { fmt, t } from '../lib/text'
import { paths } from '../lib/useMesa'
import { cartStore, cartTotal, lineTotal, useCart } from '../store/cart'
import { Button } from './Button'
import { Photo } from './Photo'
import { AddButton, QuantityStepper } from './QuantityStepper'

/**
 * D2: "Tu pedido" fijo a la derecha del menú en computadora. Los platos con su
 * contador, una bebida sugerida, el total y "Continuar" (va a datos y pago, D4).
 */
export function SideCart({ canOrder }: { canOrder: boolean }) {
  const navigate = useNavigate()
  const items = useCart(TAKEOUT, (s) => s.items)
  const cart = () => cartStore(TAKEOUT).getState()
  const total = cartTotal(items)
  // Una bebida sugerida que todavía no esté en el pedido.
  const drinkCategories = new Set(menu.suggestedDrinks.map((id) => getDish(id)?.category))
  const hasDrink = items.some((i) => drinkCategories.has(getDish(i.dishId)?.category))
  const drink = hasDrink
    ? undefined
    : menu.suggestedDrinks.map(getDish).find((d): d is Dish => Boolean(d?.available))

  return (
    <section
      aria-labelledby="tu-pedido-lateral"
      className="flex max-h-[calc(100dvh-120px)] flex-col gap-4 overflow-y-auto rounded-grande border border-borde bg-tarjeta p-6"
    >
      <div>
        <h2 id="tu-pedido-lateral" className="text-section text-texto">
          {t.web.cartTitle}
        </h2>
        <p className="text-small text-texto-2">{t.web.cartSubtitle}</p>
      </div>

      {items.length === 0 ? (
        <p className="text-body text-texto-2">{t.web.cartEmpty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-borde">
          {items.map((line) => {
            const dish = getDish(line.dishId)
            if (!dish) return null
            const details = [
              getSide(line.sideId)?.name,
              ...line.extraIds.map((id) => getExtra(id)?.shortName ?? getExtra(id)?.name),
              line.note,
            ].filter(Boolean)
            return (
              <li key={line.lineId} className="flex flex-col gap-2 py-3 first:pt-0">
                <div className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-dish text-texto">{dish.name}</span>
                    {details.length > 0 && <span className="block text-small text-texto-2">{details.join(' · ')}</span>}
                  </span>
                  <span className="shrink-0 text-price text-texto">{formatMoney(lineTotal(line))}</span>
                </div>
                <QuantityStepper
                  value={line.quantity}
                  min={0}
                  onIncrement={() => cart().setLineQuantity(line.lineId, line.quantity + 1)}
                  onDecrement={() => cart().setLineQuantity(line.lineId, line.quantity - 1)}
                  itemName={dish.name}
                  size="sm"
                  className="self-start"
                />
              </li>
            )
          })}
        </ul>
      )}

      {drink && canOrder && items.length > 0 && (
        <div className="flex items-center gap-2 rounded-tarjeta bg-fondo p-2">
          {drink.image ? (
            <Photo src={drink.image} className="size-10 shrink-0 rounded-chico" />
          ) : (
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-chico bg-verde-suave text-verde">
              <CupSoda size={20} strokeWidth={2} />
            </span>
          )}
          <span className="min-w-0 flex-1 text-small">
            <span className="block text-texto">{fmt(t.web.cartDrink, { drink: drink.name.toLowerCase() })}</span>
            <span className="block text-texto-2">{formatMoney(drink.price)}</span>
          </span>
          <AddButton onClick={() => cart().quickAdd(drink.id)} label={fmt(t.menu.add, { dish: drink.name })} />
        </div>
      )}

      {items.length > 0 && (
        <>
          <p className="flex justify-between text-section text-texto">
            <span>{t.web.total}</span>
            <span>{formatMoney(total)}</span>
          </p>
          <Button block onClick={() => navigate(paths.summary)} disabled={!canOrder} trailing={formatMoney(total)}>
            {t.web.continue}
          </Button>
        </>
      )}
    </section>
  )
}

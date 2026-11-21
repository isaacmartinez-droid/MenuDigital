import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Banknote, Bell } from 'lucide-react'
import type { Dish } from '../types/menu'
import { Header } from '../components/Header'
import { Button } from '../components/Button'
import { SearchBar } from '../components/SearchBar'
import { CategoryTabs } from '../components/CategoryTabs'
import { DishCard } from '../components/DishCard'
import { CartBar, BottomDock, DockSpacer } from '../components/CartBar'
import { Toast } from '../components/Toast'
import { NoticeBanner } from '../components/NoticeBanner'
import { dishesByCategory, getDish, getSide, menu, restaurant } from '../lib/catalog'
import { formatMoney } from '../lib/money'
import { fmt, platos, t, tableLabel } from '../lib/text'
import { readItem, tableKey, writeItem, newId } from '../lib/storage'
import { useOpenState } from '../lib/useOpenState'
import { useScrollSpy } from '../lib/useScrollSpy'
import { scrollBehavior } from '../lib/motion'
import { paths, useMesa } from '../lib/useMesa'
import { cartStore, cartTotal, countItems, dishQuantity, useCart } from '../store/cart'
import { useUi } from '../store/ui'
import { Welcome } from './Welcome'

type ToastState =
  | { kind: 'added'; key: string; lineId: string; title: string; body: string }
  | { kind: 'limit'; key: string }

const TABS_HEIGHT = 52
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** M1 Menú (y M1b: agregado con un toque). */
export function Menu() {
  const mesa = useMesa()
  const navigate = useNavigate()
  const items = useCart(mesa, (s) => s.items)
  const openState = useOpenState()
  const canOrder = openState.open

  // M0: solo la primera vez de esta sesión en esta mesa.
  const welcomeKey = tableKey(mesa, 'bienvenida')
  const [showWelcome, setShowWelcome] = useState(() => readItem('session', welcomeKey) !== '1')
  const finishWelcome = () => {
    writeItem('session', welcomeKey, '1')
    setShowWelcome(false)
  }

  // Aviso "Agregaste…" con Deshacer durante timings.undoToastMs.
  // Si viene del detalle con un plato recién agregado, arranca mostrando ese aviso.
  const [toast, setToast] = useState<ToastState | null>(() => {
    const flash = useUi.getState().flash
    return flash ? { kind: 'added', key: flash.lineId, ...flash } : null
  })
  useEffect(() => {
    useUi.getState().takeFlash()
  }, [])
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), restaurant.timings.undoToastMs)
    return () => window.clearTimeout(id)
  }, [toast])

  const quickAdd = (dish: Dish) => {
    const result = cartStore(mesa).getState().quickAdd(dish.id)
    if (!result.ok) {
      if (result.reason === 'limit') setToast({ kind: 'limit', key: newId() })
      return
    }
    const side = getSide(dish.defaultSide)
    setToast({
      kind: 'added',
      key: newId(),
      lineId: result.lineId,
      title: fmt(t.menu.added, { dish: dish.name }),
      body: side ? fmt(t.menu.addedWithSide, { side: side.name.toLowerCase() }) : t.menu.addedPlain,
    })
  }
  const decrement = (dish: Dish) => cartStore(mesa).getState().decrementDish(dish.id)
  const undo = (lineId: string) => {
    cartStore(mesa).getState().decrementLine(lineId)
    setToast(null)
  }
  const openDish = (dish: Dish) => navigate(paths.dish(mesa, dish.id))

  // Búsqueda (sin distinguir tildes ni mayúsculas).
  const [query, setQuery] = useState('')
  const searching = query.trim().length > 0
  const results = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return []
    const found = menu.dishes.filter((d) =>
      normalize(`${d.name} ${d.shortDescription} ${d.includes ?? ''}`).includes(q),
    )
    return [...found.filter((d) => d.available), ...found.filter((d) => !d.available)]
  }, [query])

  // Pestañas: la activa sigue al scroll; al tocar una, se fija mientras dura el desplazamiento.
  const sectionIds = useMemo(() => menu.categories.map((c) => `cat-${c.id}`), [])
  const spied = useScrollSpy(sectionIds, TABS_HEIGHT, !searching)
  const [pinned, setPinned] = useState<string | null>(null)
  const pinTimer = useRef(0)
  const activeCategory = (pinned ?? spied).replace(/^cat-/, '')
  const selectCategory = (id: string) => {
    const el = document.getElementById(`cat-${id}`)
    if (!el) return
    setPinned(`cat-${id}`)
    window.clearTimeout(pinTimer.current)
    pinTimer.current = window.setTimeout(() => setPinned(null), 900)
    el.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
  }
  useEffect(() => () => window.clearTimeout(pinTimer.current), [])

  const count = countItems(items)
  const total = cartTotal(items)
  const bestSellers = menu.bestSellers.map(getDish).filter((d): d is Dish => Boolean(d))

  const row = (dish: Dish) => (
    <DishCard
      key={dish.id}
      variant="row"
      dish={dish}
      quantity={dishQuantity(items, dish.id)}
      canOrder={canOrder}
      onAdd={() => quickAdd(dish)}
      onDecrement={() => decrement(dish)}
      onOpen={() => openDish(dish)}
    />
  )

  // Franja bajo el encabezado: un aviso reemplaza a los botones de mesa (como en M1b y M8).
  let slot: ReactNode
  if (toast?.kind === 'added') {
    slot = (
      <Toast
        key={toast.key}
        title={toast.title}
        body={toast.body}
        action={{ label: t.common.undo, onClick: () => undo(toast.lineId) }}
      />
    )
  } else if (toast?.kind === 'limit') {
    slot = (
      <Toast
        key={toast.key}
        tone="aviso"
        title={t.order.limitTitle}
        body={fmt(t.order.limitBody, { max: restaurant.ordering.maxItemsPerComanda })}
      />
    )
  } else if (!canOrder) {
    slot = (
      <NoticeBanner
        tone="aviso"
        title={t.closed.title}
        body={fmt(t.closed.body, { open: openState.opensAt ?? '' })}
      />
    )
  } else {
    slot = (
      <div className="grid grid-cols-2 gap-2">
        <Button variant="pill" icon={<Bell size={20} className="text-verde" aria-hidden />}>
          {t.menu.callWaiter}
        </Button>
        <Button
          variant="pill"
          icon={<Banknote size={20} className="text-verde" aria-hidden />}
          onClick={() => navigate(paths.bill(mesa))}
        >
          {t.menu.payNow}
        </Button>
      </div>
    )
  }

  return (
    <>
      {showWelcome && <Welcome mesa={mesa} onDone={finishWelcome} />}

      <div className="app-shell" aria-hidden={showWelcome || undefined}>
        <Header
          name={restaurant.name}
          logo={restaurant.logo}
          open={canOrder}
          statusText={
            canOrder
              ? fmt(t.status.open, { close: openState.closesAt ?? '' })
              : fmt(t.status.closed, { open: openState.opensAt ?? '' })
          }
          tableText={tableLabel(mesa)}
        />

        <main>
          <div className="px-4">{slot}</div>

          <div className="mt-2 px-4">
            <SearchBar value={query} onChange={setQuery} />
          </div>

          {searching ? (
            <section aria-labelledby="resultados" className="mt-4 px-4">
              <h2 id="resultados" className="sr-only">
                {t.menu.searchResults}
              </h2>
              {results.length ? (
                <div className="divide-y divide-borde">{results.map(row)}</div>
              ) : (
                <p role="status" className="py-8 text-center text-body text-texto-2">
                  {fmt(t.menu.noResults, { q: query.trim() })}
                </p>
              )}
            </section>
          ) : (
            <>
              <CategoryTabs categories={menu.categories} activeId={activeCategory} onSelect={selectCategory} />

              {bestSellers.length > 0 && (
                <section aria-labelledby="mas-vendidos">
                  <h2 id="mas-vendidos" className="px-4 text-section text-texto">
                    {t.menu.bestSellers}
                  </h2>
                  <div className="no-scrollbar mt-3 flex snap-x snap-mandatory scroll-px-4 gap-[13px] overflow-x-auto px-4">
                    {bestSellers.map((dish) => (
                      <DishCard
                        key={dish.id}
                        variant="carousel"
                        dish={dish}
                        quantity={dishQuantity(items, dish.id)}
                        canOrder={canOrder}
                        onAdd={() => quickAdd(dish)}
                        onDecrement={() => decrement(dish)}
                        onOpen={() => openDish(dish)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {menu.categories.map((category) => (
                <section key={category.id} aria-labelledby={`cat-${category.id}`} className="mt-3.5 px-4">
                  <h2
                    id={`cat-${category.id}`}
                    className="text-section text-texto"
                    style={{ scrollMarginTop: TABS_HEIGHT + 8 }}
                  >
                    {category.name}
                  </h2>
                  <div className="divide-y divide-borde [&>article:first-child]:pt-[11px]">
                    {dishesByCategory(category.id).map(row)}
                  </div>
                </section>
              ))}
            </>
          )}

          <DockSpacer />
        </main>
      </div>

      {canOrder ? (
        count > 0 && (
          <CartBar
            label={fmt(t.menu.viewOrder, { n: count, platos: platos(count) })}
            total={formatMoney(total)}
            onClick={() => navigate(paths.order(mesa))}
          />
        )
      ) : (
        <BottomDock>
          <button
            type="button"
            disabled
            className="h-[52px] w-full rounded-grande bg-foto-vacia text-button text-texto-2"
          >
            {fmt(t.closed.button, { open: openState.opensAt ?? '' })}
          </button>
        </BottomDock>
      )}
    </>
  )
}

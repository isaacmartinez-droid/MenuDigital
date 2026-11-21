import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useOutlet } from 'react-router'
import type { Dish } from '../types/menu'
import { Header } from '../components/Header'
import { Button } from '../components/Button'
import { SearchBar } from '../components/SearchBar'
import { CategoryTabs } from '../components/CategoryTabs'
import { DishCard } from '../components/DishCard'
import { Carousel } from '../components/Carousel'
import { COMBOS_CATEGORY, bestSellersFor, combosFor, isOnDay, useToday } from '../lib/combos'
import { isTakeout } from '../lib/channel'
import { PromoCard } from '../components/PromoCard'
import { WhatsAppButton } from '../components/WhatsAppButton'
import { DesktopNav } from '../components/DesktopNav'
import { SideCart } from '../components/SideCart'
import { useIsDesktop } from '../lib/useMediaQuery'
import { promoAllows, usePromoActive } from '../lib/promo'
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
import { useOnline } from '../lib/useOnline'
import { useComandas } from '../store/comandas'
import { Banknote, BellRing, ChevronRight, Clock, Flame } from 'lucide-react'
import { cx } from '../lib/cx'
import { activeComanda, statusLabel } from '../lib/comandaStatus'
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

/**
 * M1 Menú (y M1b: agregado con un toque). En la web es W3 Menú para llevar:
 * "Para llevar" en el encabezado, promo del día, "Escribinos" por WhatsApp y
 * nada de la mesa (portada con mesa, Ya vamos a pagar).
 */
export function Menu() {
  const mesa = useMesa()
  const takeout = isTakeout(mesa)
  // D2 (computadora, web): categorías a la izquierda, platos al centro y el carrito fijo a la derecha.
  const desktop = useIsDesktop() && takeout
  // Alto de lo que queda fijo arriba al saltar a una sección: las pestañas, o la barra de navegación.
  const stickyTop = desktop ? 96 : TABS_HEIGHT + 8
  // Promo del día: solo en la web y en su horario (promo.hours).
  const promoActive = usePromoActive()
  const navigate = useNavigate()
  const items = useCart(mesa, (s) => s.items)
  const openState = useOpenState()
  const canOrder = openState.open
  // Mesa con cuenta abierta: aunque pase la hora de cierre, puede llamar al mesero y pagar.
  const hasAccount = useComandas(mesa, (s) => s.comandas.length > 0)
  // "Ya vamos a pagar" solo cuando este teléfono ya envió algo (no por pedidos de otros).
  const hasMine = useComandas(mesa, (s) => s.comandas.some((c) => c.mine))
  const active = useComandas(mesa, (s) => activeComanda(s.comandas))
  const today = useToday()

  // M0: solo la primera vez de esta sesión en esta mesa (la web tiene su propia bienvenida, W0).
  const welcomeKey = tableKey(mesa, 'bienvenida')
  const [showWelcome, setShowWelcome] = useState(() => !takeout && readItem('session', welcomeKey) !== '1')
  const finishWelcome = () => {
    writeItem('session', welcomeKey, '1')
    setShowWelcome(false)
  }
  // Con la portada abierta no se muestra el botón flotante del mesero.
  useEffect(() => {
    useUi.getState().setWelcomeOpen(showWelcome)
    return () => useUi.getState().setWelcomeOpen(false)
  }, [showWelcome])

  // Aviso "Agregaste…" con Deshacer durante timings.undoToastMs.
  // Si viene del detalle con un plato recién agregado, arranca mostrando ese aviso.
  const [toast, setToast] = useState<ToastState | null>(() => {
    const flash = useUi.getState().flash
    return flash ? { kind: 'added', key: flash.lineId, ...flash } : null
  })
  useEffect(() => {
    useUi.getState().takeFlash()
    // En la web el detalle se abre encima del menú (el menú no se desmonta): el aviso
    // llega al cerrar el detalle, así que se escucha mientras el menú está montado.
    return useUi.subscribe((state) => {
      const flash = state.flash
      if (!flash) return
      useUi.getState().takeFlash()
      setToast({ kind: 'added', key: `${flash.lineId}-${newId()}`, ...flash })
    })
  }, [])
  // Web: el detalle del plato (ruta hija) se muestra encima; el menú queda inerte debajo.
  const detail = useOutlet()
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), restaurant.timings.undoToastMs)
    return () => window.clearTimeout(id)
  }, [toast])

  const quickAdd = (dish: Dish) => {
    if (!isOnDay(dish, today)) return
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
  // En la web el menú queda debajo del detalle: no se vuelve arriba al abrirlo.
  const openDish = (dish: Dish) => navigate(paths.dish(mesa, dish.id), { preventScrollReset: takeout })

  // Búsqueda (sin distinguir tildes ni mayúsculas).
  const [query, setQuery] = useState('')
  const searching = query.trim().length > 0
  const results = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return []
    // Solo lo que se puede pedir hoy (los combos de otros días no aparecen).
    const found = menu.dishes.filter(
      (d) =>
        isOnDay(d, today) &&
        promoAllows(d, takeout, promoActive) &&
        normalize(`${d.name} ${d.shortDescription} ${d.includes ?? ''}`).includes(q),
    )
    return [...found.filter((d) => d.available), ...found.filter((d) => !d.available)]
  }, [query, today, takeout, promoActive])

  // Cuando el buscador queda fuera de vista, las pestañas fijas muestran una lupa que vuelve a él.
  const searchRef = useRef<HTMLDivElement>(null)
  const [searchInView, setSearchInView] = useState(true)
  useEffect(() => {
    const el = searchRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setSearchInView(entry.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const goToSearch = () => {
    window.scrollTo({ top: 0, behavior: scrollBehavior() })
    // Foco en el mismo toque (en el teléfono abre el teclado) sin cortar el desplazamiento.
    searchRef.current?.querySelector('input')?.focus({ preventScroll: true })
  }

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

  const online = useOnline()

  const count = countItems(items)
  const total = cartTotal(items)
  // La promo es solo de la web y en su horario (en la mesa no aparece ni en Combos).
  const combos = combosFor(today).filter((d) => promoAllows(d, takeout, promoActive))
  const bestSellers = bestSellersFor(today)
  const promo = takeout && promoActive ? menu.promo : undefined
  const promoDish = promo ? getDish(promo.dishId) : undefined
  // Búsqueda sin resultados: se sugieren los más vendidos que se pueden pedir hoy.
  const suggestions = bestSellers.filter((d) => d.available && isOnDay(d, today)).slice(0, 4)
  // Sin combos cargados, la categoría "combos" no tiene pestaña ni sección.
  const categories = menu.categories.filter((c) => c.id !== COMBOS_CATEGORY || combos.length > 0)

  const card = (dish: Dish, variant: 'row' | 'carousel', eager = false) => (
    <DishCard
      key={dish.id}
      variant={variant}
      eager={eager}
      dish={dish}
      today={today}
      quantity={dishQuantity(items, dish.id)}
      canOrder={canOrder}
      onAdd={() => quickAdd(dish)}
      onDecrement={() => decrement(dish)}
      onOpen={() => openDish(dish)}
    />
  )
  const row = (dish: Dish) => card(dish, 'row')

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
  } else if (!canOrder && !hasAccount) {
    slot = (
      <NoticeBanner
        tone="aviso"
        title={t.closed.title}
        body={fmt(t.closed.body, { open: openState.opensAt ?? '' })}
      />
    )
  } else if (!online) {
    slot = <NoticeBanner role="status" tone="aviso" title={t.offline.title} body={t.offline.body} />
  } else if (hasMine && !takeout) {
    // "Llamar al mesero" es el botón flotante; acá queda pagar, solo si este teléfono ya pidió.
    slot = (
      <Button
        variant="pill"
        block
        onClick={() => navigate(paths.bill(mesa))}
        icon={<Banknote size={20} className="text-verde" aria-hidden />}
      >
        {t.menu.payNow}
      </Button>
    )
  }

  return (
    <>
      {showWelcome && <Welcome mesa={mesa} onDone={finishWelcome} />}

      {desktop && <DesktopNav action="cart" active="menu" />}

      <div className="app-shell" inert={showWelcome || Boolean(detail) || undefined}>
        <div className="desktop:hidden">
          <Header
            name={restaurant.name}
            logo={restaurant.logo}
            open={canOrder}
            statusText={
              canOrder
                ? fmt(t.status.open, { close: openState.closesAt ?? '' })
                : fmt(t.status.closed, { open: openState.opensAt ?? '' })
            }
            tableText={takeout ? t.web.place : tableLabel(mesa)}
          />
        </div>

        <main className="desktop:grid desktop:grid-cols-[220px_minmax(0,1fr)_360px] desktop:items-start desktop:gap-8 desktop:px-12 desktop:py-6">
          {desktop && (
            <nav aria-label={t.menu.categoriesLabel} className="sticky top-[96px] flex flex-col gap-1">
              <p className="mb-1 px-3 text-small tracking-[0.08em] text-texto-2 uppercase">{t.web.categoriesTitle}</p>
              {[
                ...(promo ? [{ id: 'promos', name: t.web.promosTitle }] : []),
                ...(bestSellers.length ? [{ id: 'mas-vendidos-grilla', name: t.menu.bestSellers }] : []),
                ...categories.map((c) => ({ id: `cat-${c.id}`, name: c.id === COMBOS_CATEGORY ? t.combos.title : c.name })),
              ].map((item) => {
                const on = `cat-${activeCategory}` === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={on ? 'true' : undefined}
                    onClick={() =>
                      item.id.startsWith('cat-')
                        ? selectCategory(item.id.slice(4))
                        : document.getElementById(item.id)?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
                    }
                    className={cx(
                      'flex min-h-11 items-center rounded-tarjeta px-3 text-left text-dish transition-colors',
                      on ? 'bg-verde-suave text-verde' : 'text-texto hover:bg-tarjeta',
                    )}
                  >
                    {item.name}
                  </button>
                )
              })}
            </nav>
          )}
          <div className="desktop:-mx-4 desktop:min-w-0">
            <div className="px-4">
              {/* Orden en curso de este teléfono: un toque vuelve a su seguimiento. */}
              {active && (
                <button
                  type="button"
                  onClick={() => navigate(paths.tracking(mesa, active.id))}
                  className={cx(
                    'mb-2 flex min-h-12 w-full items-center gap-2.5 rounded-tarjeta px-3 py-2 text-left text-small',
                    active.status === 'lista' ? 'bg-ambar-suave text-texto-sobre-ambar' : 'bg-verde-suave text-verde',
                  )}
                >
                  {active.status === 'lista' ? (
                    <BellRing size={18} strokeWidth={2} aria-hidden className="shrink-0" />
                  ) : active.status === 'en-el-comal' ? (
                    <Flame size={18} strokeWidth={2} aria-hidden className="shrink-0" />
                  ) : (
                    <Clock size={18} strokeWidth={2} aria-hidden className="shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 font-semibold">
                    {active.status === 'lista'
                      ? fmt(takeout ? t.web.activeBarReady : t.tracking.activeBarReady, { id: active.id })
                      : fmt(t.tracking.activeBar, { id: active.id, status: statusLabel(active.status).toLowerCase() })}
                  </span>
                  <ChevronRight size={18} strokeWidth={2} aria-hidden className="shrink-0" />
                </button>
              )}
              {slot}
            </div>

            <div ref={searchRef} className="mt-2 px-4">
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
                  <div className="py-8 text-center">
                    <p role="status" className="text-body text-texto-2">
                      {fmt(t.menu.noResults, { q: query.trim() })}
                    </p>
                    {/* Sin resultados: los más vendidos de hoy, para no dejar la pantalla vacía. */}
                    {suggestions.length > 0 && (
                      <>
                        <p className="mt-5 text-small text-texto-2">{t.menu.trySuggestions}</p>
                        <div className="mt-2 flex flex-wrap justify-center gap-2">
                          {suggestions.map((dish) => (
                            <button
                              key={dish.id}
                              type="button"
                              onClick={() => openDish(dish)}
                              className="min-h-10 rounded-completo border border-borde bg-tarjeta px-4 text-small font-medium text-texto"
                            >
                              {dish.name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </section>
            ) : (
              <>
                <CategoryTabs
                  categories={categories}
                  activeId={activeCategory}
                  onSelect={selectCategory}
                  onSearch={searchInView ? undefined : goToSearch}
                  className="desktop:hidden"
                />

                {/* W3: promo del día, arriba de los más vendidos. */}
                {promo && (
                  <div id="promos" className="mb-4 px-4 desktop:mt-6 desktop:mb-8" style={{ scrollMarginTop: stickyTop }}>
                    <PromoCard
                      promo={promo}
                      subtitle={promo.subtitle}
                      onClick={() => (promoDish ? openDish(promoDish) : undefined)}
                    />
                  </div>
                )}

                {bestSellers.length > 0 && (
                  <Carousel
                    title={t.menu.bestSellers}
                    titleId="mas-vendidos"
                    intervalMs={restaurant.timings.carouselMs}
                    className="tablet:hidden"
                  >
                    {/* Las dos primeras se ven al abrir: se piden ya, sin esperar (mejora el tiempo de carga). */}
                    {bestSellers.map((dish, i) => card(dish, 'carousel', i < 2))}
                  </Carousel>
                )}
                {/* T2 (tablet): los más vendidos en grilla de 4 en lugar del carrusel. */}
                {takeout && bestSellers.length > 0 && (
                  <section aria-labelledby="mas-vendidos-grilla" className="hidden px-4 tablet:block">
                    <h2
                      id="mas-vendidos-grilla"
                      className="text-section text-texto desktop:text-title-lg"
                      style={{ scrollMarginTop: stickyTop }}
                    >
                      {t.menu.bestSellers}
                    </h2>
                    {/* D2 (computadora): grilla de 3, con fotos más altas. */}
                    <div className="mt-3 grid grid-cols-4 gap-3 desktop:mt-4 desktop:grid-cols-3 desktop:gap-4">
                      {/* En computadora la grilla es de 3: se muestran los 3 primeros (como en el Figma). */}
                      {(desktop ? bestSellers.slice(0, 3) : bestSellers).map((dish) => (
                        <DishCard
                          key={dish.id}
                          variant="carousel"
                          fluid
                          photoClassName="h-[120px] desktop:h-[150px]"
                          dish={dish}
                          today={today}
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

                {/* Secciones en el orden de categorías de menu.json. "Combos" lleva título propio,
                    una línea de ayuda y va ordenada: el de hoy, los de siempre, los de otros días. */}
                {categories.map((category) => {
                  const isCombos = category.id === COMBOS_CATEGORY
                  return (
                    <section key={category.id} aria-labelledby={`cat-${category.id}`} className="mt-3.5 px-4 desktop:mt-8">
                      <h2
                        id={`cat-${category.id}`}
                        className="text-section text-texto desktop:text-title-lg"
                        style={{ scrollMarginTop: stickyTop }}
                      >
                        {isCombos ? t.combos.title : category.name}
                      </h2>
                      {isCombos && <p className="mt-0.5 text-small text-texto-2">{t.combos.subtitle}</p>}
                      {/* T2 (tablet): dos columnas, cada plato en su tarjeta. */}
                      <div className="divide-y divide-borde [&>article:first-child]:pt-[11px] tablet:mt-3 tablet:grid tablet:grid-cols-2 tablet:gap-3 tablet:divide-y-0 tablet:[&>article]:rounded-grande tablet:[&>article]:border tablet:[&>article]:border-borde tablet:[&>article]:bg-tarjeta tablet:[&>article]:px-3 tablet:[&>article:first-child]:pt-3">
                        {(isCombos ? combos : dishesByCategory(category.id)).map(row)}
                      </div>
                    </section>
                  )
                })}
              </>
            )}

            <div className="desktop:hidden">
              <DockSpacer />
            </div>
          </div>
          {desktop && (
            <aside className="sticky top-[96px]">
              <SideCart canOrder={canOrder} />
            </aside>
          )}
        </main>
      </div>


      {/* Con el detalle abierto encima, la barra y WhatsApp quedan inertes (no se llega con el teclado). */}
      <div inert={Boolean(detail) || undefined}>
        {/* En computadora el pedido está en el carrito lateral: no hay barra abajo. */}
        {desktop ? null : canOrder ? (
          count > 0 && (
            <CartBar
              label={fmt(t.menu.viewOrder, { n: count, platos: platos(count) })}
              total={formatMoney(total)}
              count={count}
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

        {/* Web: "Escribinos" por WhatsApp, siempre (en el QR no: el cliente está en el local). */}
        {takeout && <WhatsAppButton />}
      </div>

      {/* Web: el detalle del plato, encima del menú (pantalla completa en celular, ventana en tablet). */}
      {detail}
    </>
  )
}

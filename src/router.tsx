import { createBrowserRouter, type RouteObject } from 'react-router'
import { InvalidTable } from './screens/InvalidTable'
import { NotFound } from './screens/NotFound'
import { MesaLayout } from './screens/MesaLayout'
import { Menu } from './screens/Menu'
import { WebLayout } from './screens/WebLayout'
import { Home } from './screens/Home'
import { RouteError } from './screens/RouteError'

/*
 * El menú (lo primero que se abre al escanear el QR) va en el paquete inicial;
 * el resto de las pantallas se descarga cuando se necesita, para que la
 * primera carga sea liviana con datos prepago.
 */
const screens = {
  detail: () => import('./screens/DishDetail'),
  order: () => import('./screens/Order'),
  tracking: () => import('./screens/Tracking'),
  bill: () => import('./screens/Bill'),
  paid: () => import('./screens/Paid'),
  delivery: () => import('./screens/Delivery'),
  customerData: () => import('./screens/CustomerData'),
  summary: () => import('./screens/Summary'),
  confirmation: () => import('./screens/Confirmation'),
  rate: () => import('./screens/RateOrder'),
}

const routes: RouteObject[] = [
  // Web para llevar: / es el inicio (W1); menú, detalle y pedido son las mismas pantallas de la mesa.
  {
    path: '/',
    element: <WebLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      // El detalle se abre encima del menú (ruta hija): el menú no se desmonta ni pierde su lugar.
      {
        path: 'menu',
        element: <Menu />,
        children: [{ path: 'plato/:dishId', lazy: async () => ({ Component: (await screens.detail()).DishDetail }) }],
      },
      { path: 'pedido', lazy: async () => ({ Component: (await screens.order()).Order }) },
      { path: 'datos', lazy: async () => ({ Component: (await screens.customerData()).CustomerData }) },
      { path: 'resumen', lazy: async () => ({ Component: (await screens.summary()).Summary }) },
      { path: 'confirmacion/:comandaId', lazy: async () => ({ Component: (await screens.confirmation()).Confirmation }) },
      { path: 'orden/:comandaId', lazy: async () => ({ Component: (await screens.tracking()).Tracking }) },
      { path: 'calificar/:comandaId', lazy: async () => ({ Component: (await screens.rate()).RateOrder }) },
      { path: 'domicilio', lazy: async () => ({ Component: (await screens.delivery()).Delivery }) },
      // Web: cualquier otra dirección es "Página no encontrada" (las de /m/ siguen con "Este QR no es válido").
      { path: '*', element: <NotFound /> },
    ],
  },
  {
    path: '/m/:mesa',
    element: <MesaLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Menu /> },
      { path: 'plato/:dishId', lazy: async () => ({ Component: (await screens.detail()).DishDetail }) },
      { path: 'pedido', lazy: async () => ({ Component: (await screens.order()).Order }) },
      { path: 'orden/:comandaId', lazy: async () => ({ Component: (await screens.tracking()).Tracking }) },
      { path: 'cuenta', lazy: async () => ({ Component: (await screens.bill()).Bill }) },
      { path: 'cuenta/pagada', lazy: async () => ({ Component: (await screens.paid()).Paid }) },
      { path: '*', element: <InvalidTable /> },
    ],
  },
  // Personal: cocina, caja y panel (tablet) y meseros (celular). Se bajan solo si se abren.
  {
    lazy: async () => ({ Component: (await import('./screens/staff/StaffLayout')).StaffLayout }),
    errorElement: <RouteError />,
    children: [
      { path: '/personal', lazy: async () => ({ Component: (await import('./screens/staff/PinLogin')).PinLogin }) },
      { path: '/cocina', lazy: async () => ({ Component: (await import('./screens/staff/Kitchen')).Kitchen }) },
      { path: '/caja', lazy: async () => ({ Component: (await import('./screens/staff/Cashier')).Cashier }) },
      {
        path: '/caja/nuevo',
        lazy: async () => ({ Component: (await import('./screens/staff/ManualOrder')).CashierNewOrder }),
      },
      { path: '/caja/corte', lazy: async () => ({ Component: (await import('./screens/staff/DayClose')).DayClose }) },
      { path: '/meseros', lazy: async () => ({ Component: (await import('./screens/staff/Waiters')).Waiters }) },
      {
        path: '/meseros/mesa/:mesa',
        lazy: async () => ({ Component: (await import('./screens/staff/Waiters')).WaiterTable }),
      },
      {
        path: '/meseros/mesa/:mesa/nuevo',
        lazy: async () => ({ Component: (await import('./screens/staff/ManualOrder')).WaiterNewOrder }),
      },
      {
        path: '/panel',
        lazy: async () => ({ Component: (await import('./screens/staff/panel/PanelLayout')).PanelLayout }),
        children: [
          { index: true, lazy: async () => ({ Component: (await import('./screens/staff/OwnerPanel')).OwnerPanel }) },
          { path: 'menu', lazy: async () => ({ Component: (await import('./screens/staff/panel/PanelMenu')).PanelMenu }) },
          {
            path: 'mesas',
            lazy: async () => ({ Component: (await import('./screens/staff/panel/PanelTables')).PanelTables }),
          },
          {
            path: 'personal',
            lazy: async () => ({ Component: (await import('./screens/staff/panel/PanelPeople')).PanelPeople }),
          },
          {
            path: 'promos',
            lazy: async () => ({ Component: (await import('./screens/staff/panel/PanelPromos')).PanelPromos }),
          },
          {
            path: 'horarios',
            lazy: async () => ({ Component: (await import('./screens/staff/panel/PanelHours')).PanelHours }),
          },
          {
            path: 'resenas',
            lazy: async () => ({ Component: (await import('./screens/staff/panel/PanelReviews')).PanelReviews }),
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]

/**
 * Después de abrir el menú, baja en segundo plano el resto de las pantallas.
 * Así, si después se va la señal, igual se puede ver el pedido y enviarlo luego.
 */
export function prefetchScreens() {
  const run = () => Object.values(screens).forEach((load) => void load().catch(() => undefined))
  // Recién cuando la página terminó de cargar (fotos incluidas) y el navegador está libre:
  // así no le quita ancho de banda a lo que se ve al abrir. Safari no tiene
  // requestIdleCallback: ahí se espera un poco y listo.
  const whenIdle = () => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 3000 })
    else setTimeout(run, 1500)
  }
  if (document.readyState === 'complete') whenIdle()
  else window.addEventListener('load', whenIdle, { once: true })
}

// Muestrario de componentes, solo en desarrollo.
if (import.meta.env.DEV) {
  routes.unshift({
    path: '/componentes',
    lazy: async () => ({ Component: (await import('./screens/ComponentsPreview')).ComponentsPreview }),
  })
}

export const router = createBrowserRouter(routes)

import { createBrowserRouter, type RouteObject } from 'react-router'
import { InvalidTable } from './screens/InvalidTable'
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
}

const routes: RouteObject[] = [
  // Web para llevar: / es el inicio (W1); menú, detalle y pedido son las mismas pantallas de la mesa.
  {
    path: '/',
    element: <WebLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      { path: 'menu', element: <Menu /> },
      { path: 'plato/:dishId', lazy: async () => ({ Component: (await screens.detail()).DishDetail }) },
      { path: 'pedido', lazy: async () => ({ Component: (await screens.order()).Order }) },
      { path: 'datos', lazy: async () => ({ Component: (await screens.customerData()).CustomerData }) },
      { path: 'resumen', lazy: async () => ({ Component: (await screens.summary()).Summary }) },
      { path: 'orden/:comandaId', lazy: async () => ({ Component: (await screens.tracking()).Tracking }) },
      { path: 'domicilio', lazy: async () => ({ Component: (await screens.delivery()).Delivery }) },
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
  { path: '*', element: <InvalidTable /> },
]

/**
 * Después de abrir el menú, baja en segundo plano el resto de las pantallas.
 * Así, si después se va la señal, igual se puede ver el pedido y enviarlo luego.
 */
export function prefetchScreens() {
  const run = () => Object.values(screens).forEach((load) => void load().catch(() => undefined))
  // Safari no tiene requestIdleCallback: ahí se espera un poco y listo.
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 4000 })
  else setTimeout(run, 2000)
}

// Muestrario de componentes, solo en desarrollo.
if (import.meta.env.DEV) {
  routes.unshift({
    path: '/componentes',
    lazy: async () => ({ Component: (await import('./screens/ComponentsPreview')).ComponentsPreview }),
  })
}

export const router = createBrowserRouter(routes)

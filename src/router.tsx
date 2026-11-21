import { createBrowserRouter, Navigate, useLocation, type RouteObject } from 'react-router'
import { InvalidTable } from './screens/InvalidTable'
import { MesaLayout } from './screens/MesaLayout'
import { Menu } from './screens/Menu'
import { Bill } from './screens/Bill'
import { Paid } from './screens/Paid'
import { DishDetail } from './screens/DishDetail'
import { Order } from './screens/Order'
import { Tracking } from './screens/Tracking'
import { ComponentsPreview } from './screens/ComponentsPreview'

function RootRedirect() {
  const { search } = useLocation()
  return <Navigate to={{ pathname: '/m/5', search }} replace />
}

const routes: RouteObject[] = [
  // Demo: la raíz abre la Mesa 5 (conservando ?forzar=… y ?compas=…).
  { path: '/', element: <RootRedirect /> },
  {
    path: '/m/:mesa',
    element: <MesaLayout />,
    children: [
      { index: true, element: <Menu /> },
      { path: 'plato/:dishId', element: <DishDetail /> },
      { path: 'pedido', element: <Order /> },
      { path: 'orden/:comandaId', element: <Tracking /> },
      { path: 'cuenta', element: <Bill /> },
      { path: 'cuenta/pagada', element: <Paid /> },
      { path: '*', element: <InvalidTable /> },
    ],
  },
  { path: '*', element: <InvalidTable /> },
]

// Muestrario de componentes, solo en desarrollo.
if (import.meta.env.DEV) {
  routes.unshift({ path: '/componentes', element: <ComponentsPreview /> })
}

export const router = createBrowserRouter(routes)

import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { InvalidTable } from './screens/InvalidTable'
import { MesaLayout } from './screens/MesaLayout'
import { Menu } from './screens/Menu'
import { Pending } from './screens/Pending'
import { DishDetail } from './screens/DishDetail'
import { Order } from './screens/Order'
import { Tracking } from './screens/Tracking'
import { ComponentsPreview } from './screens/ComponentsPreview'

const routes: RouteObject[] = [
  // Demo: la raíz abre la Mesa 5.
  { path: '/', element: <Navigate to="/m/5" replace /> },
  {
    path: '/m/:mesa',
    element: <MesaLayout />,
    children: [
      { index: true, element: <Menu /> },
      { path: 'plato/:dishId', element: <DishDetail /> },
      { path: 'pedido', element: <Order /> },
      { path: 'orden/:comandaId', element: <Tracking /> },
      { path: 'cuenta', element: <Pending title="Tu cuenta" stage="e)" /> },
      { path: 'cuenta/pagada', element: <Pending title="Cuenta pagada" stage="e)" /> },
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

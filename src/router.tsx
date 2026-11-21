import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { InvalidTable } from './screens/InvalidTable'
import { MesaPlaceholder } from './screens/MesaPlaceholder'
import { ComponentsPreview } from './screens/ComponentsPreview'

const routes: RouteObject[] = [
  // Demo: la raíz abre la Mesa 5.
  { path: '/', element: <Navigate to="/m/5" replace /> },
  { path: '/m/:mesa', element: <MesaPlaceholder /> },
  { path: '*', element: <InvalidTable /> },
]

// Muestrario de componentes, solo en desarrollo.
if (import.meta.env.DEV) {
  routes.unshift({ path: '/componentes', element: <ComponentsPreview /> })
}

export const router = createBrowserRouter(routes)

import { Navigate, useLocation } from 'react-router'

/** Demo: la raíz abre la Mesa 5, conservando ?forzar=… y ?compas=… */
export function RootRedirect() {
  const { search } = useLocation()
  return <Navigate to={{ pathname: '/m/5', search }} replace />
}

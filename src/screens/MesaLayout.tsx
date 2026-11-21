import { Outlet, ScrollRestoration, useParams } from 'react-router'
import { isValidTable } from '../lib/catalog'
import { InvalidTable } from './InvalidTable'

/** Todas las pantallas de /m/:mesa. Si la mesa no está en la config: "Este QR no es válido". */
export function MesaLayout() {
  const { mesa } = useParams()
  if (!isValidTable(mesa)) return <InvalidTable />
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  )
}

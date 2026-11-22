import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { ensureSeeds } from '../../lib/staff'
import { startStaffHeartbeat } from '../../lib/staffLive'

/**
 * Pantallas del personal (cocina, caja y panel del dueño), en tablet de 1280 × 800.
 * Mientras están abiertas:
 * - avisan que el personal está mirando: los pedidos que lleguen esperan a que la
 *   cocina (y la caja, para llevar) los mueva, en vez de avanzar solos;
 * - hay pedidos de ejemplo para que no se vea vacío (?forzar=ejemplos los vuelve a crear).
 * Todavía no se entra con PIN (P0): cada pantalla se abre con su dirección.
 */
export function StaffLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  // Demo ?forzar=ejemplos: los pedidos de ejemplo empiezan de cero, antes de leerlos.
  const [fresh] = useState(() => {
    const wants = new URLSearchParams(location.search).getAll('forzar').includes('ejemplos')
    ensureSeeds(wants)
    return wants
  })

  useEffect(() => {
    if (!fresh) return
    const params = new URLSearchParams(location.search)
    const others = params.getAll('forzar').filter((v) => v !== 'ejemplos')
    params.delete('forzar')
    others.forEach((v) => params.append('forzar', v))
    const search = params.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true })
    // Solo al entrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => startStaffHeartbeat(), [])

  return (
    <div className="flex min-h-dvh flex-col bg-fondo">
      <Outlet />
    </div>
  )
}

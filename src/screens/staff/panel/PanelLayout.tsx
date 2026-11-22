import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { StaffBar } from '../../../components/staff/StaffBar'
import { restaurant } from '../../../lib/catalog'
import { cx } from '../../../lib/cx'
import { t } from '../../../lib/text'

/** Ruta de cada sección, en el orden de texts.staff.panel.sections. */
const SECTION_PATHS = ['/panel', '/panel/menu', '/panel/mesas', '/panel/personal', '/panel/promos', '/panel/horarios', '/panel/resenas']

/**
 * Panel del dueño (P4): la barra del personal, las secciones (Resumen, Menú y
 * agotados, Mesas y QR, Personal y PINs, Promos, Horarios y Reseñas) y la sección
 * abierta debajo.
 */
export function PanelLayout() {
  const p = t.staff.panel
  const { pathname } = useLocation()
  const index = Math.max(0, SECTION_PATHS.indexOf(pathname.replace(/\/$/, '')))

  useEffect(() => {
    document.title = `${p.sections[index]} · ${t.staff.areas.panel} · ${restaurant.name}`
  }, [index, p.sections])

  return (
    <>
      <StaffBar area="panel" user={restaurant.staff.owner} />
      <nav aria-label={p.sectionsLabel} className="px-6 py-1.5">
        <ul className="flex flex-wrap gap-x-2 gap-y-1">
          {p.sections.map((name, i) => (
            <li key={name}>
              <NavLink
                to={SECTION_PATHS[i]}
                end
                className={({ isActive }) =>
                  cx(
                    'flex min-h-11 items-center rounded-chico px-2 text-dish',
                    isActive ? 'text-verde' : 'text-texto-2 hover:text-texto',
                  )
                }
              >
                {name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex flex-col gap-4 px-6 pt-2 pb-6">
        <Outlet />
      </main>
    </>
  )
}

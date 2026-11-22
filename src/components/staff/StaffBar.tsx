import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { restaurant } from '../../lib/catalog'
import { cx } from '../../lib/cx'
import { t } from '../../lib/text'
import { readSession } from '../../lib/staffSession'

export type StaffArea = 'cocina' | 'caja' | 'meseros' | 'panel'

/** Rutas del personal. */
const staffPaths: Record<StaffArea, string | null> = {
  cocina: '/cocina',
  caja: '/caja',
  meseros: '/meseros',
  panel: '/panel',
}

const AREAS: StaffArea[] = ['cocina', 'caja', 'meseros', 'panel']

interface StaffBarProps {
  area: StaffArea
  /** Textos a la derecha ("Sonido activado", la hora). */
  info?: ReactNode
  /** Botones a la derecha ("Agotados", "Nuevo pedido"…). */
  actions?: ReactNode
  /** Quién entró ("Don Julio", "María", "Dueño"). */
  user: string
}

/**
 * Barra superior de las pantallas del personal: logo y área, pestañas para pasar
 * entre Cocina, Caja, Meseros y Panel, y a la derecha la información, los
 * botones y quién entró.
 */
/** Rol que corresponde a cada área (para mostrar a quien entró con PIN). */
const ROLE_OF: Record<StaffArea, string> = { cocina: 'cocina', caja: 'caja', meseros: 'mesero', panel: 'dueno' }

export function StaffBar({ area, info, actions, user }: StaffBarProps) {
  const { logo } = restaurant
  const session = readSession()
  const who = session && session.role === ROLE_OF[area] ? session.name : user
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-borde bg-tarjeta px-6 py-3">
      <div className="flex items-center gap-3">
        <picture className="block h-[41px] w-14 shrink-0">
          <source srcSet={logo.small ?? logo.webp} type="image/webp" />
          <img src={logo.png} alt={logo.alt} width={56} height={41} className="h-full w-full object-contain" />
        </picture>
        <h1 className="text-title text-texto">{t.staff.areas[area]}</h1>
      </div>

      <nav aria-label={t.staff.navLabel}>
        <ul className="flex gap-1 rounded-completo bg-fondo p-1">
          {AREAS.map((a) => {
            const to = staffPaths[a]
            const on = a === area
            const style = cx(
              'flex min-h-9 items-center rounded-completo px-4 py-2 text-small font-medium',
              on ? 'bg-verde text-blanco' : 'text-texto',
            )
            return (
              <li key={a}>
                {to ? (
                  <Link to={to} aria-current={on ? 'page' : undefined} className={style}>
                    {t.staff.areas[a]}
                  </Link>
                ) : (
                  // Meseros todavía no está: se ve, pero no lleva a ningún lado.
                  <span aria-disabled="true" title={t.staff.soon} className={cx(style, 'text-texto-2')}>
                    {t.staff.areas[a]}
                    <span className="sr-only"> ({t.staff.soon})</span>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        {info}
        {actions}
        <span className="rounded-completo bg-fondo px-3 py-2 text-small font-medium text-texto">{who}</span>
      </div>
    </header>
  )
}

import { useEffect, useRef } from 'react'
import type { Category } from '../types/menu'
import { cx } from '../lib/cx'
import { t } from '../lib/text'

interface CategoryTabsProps {
  categories: Category[]
  activeId: string
  onSelect: (id: string) => void
}

/**
 * Pestañas de categorías (fijas arriba al hacer scroll). Tocar una lleva a
 * su sección; al hacer scroll, la pestaña activa sigue a la sección visible.
 */
export function CategoryTabs({ categories, activeId, onSelect }: CategoryTabsProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // Mantiene visible la pestaña activa dentro de la fila horizontal.
  useEffect(() => {
    const list = listRef.current
    const active = list?.querySelector<HTMLElement>(`[data-cat="${activeId}"]`)
    if (!list || !active) return
    const left = active.offsetLeft - 16
    const right = active.offsetLeft + active.offsetWidth + 16
    if (left < list.scrollLeft || right > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: left, behavior: 'smooth' })
    }
  }, [activeId])

  return (
    <nav aria-label={t.menu.categoriesLabel} className="sticky top-0 z-20 bg-fondo py-2">
      <div ref={listRef} className="no-scrollbar flex gap-[8.5px] overflow-x-auto px-4">
        {categories.map((c) => {
          const active = c.id === activeId
          return (
            <a
              key={c.id}
              href={`#cat-${c.id}`}
              data-cat={c.id}
              aria-current={active ? 'true' : undefined}
              onClick={(e) => {
                e.preventDefault()
                onSelect(c.id)
              }}
              className={cx(
                'inline-flex h-9 shrink-0 items-center rounded-completo px-4 text-small font-medium transition-colors duration-150',
                active ? 'bg-verde text-blanco' : 'border border-borde bg-tarjeta text-texto',
              )}
            >
              {c.name}
            </a>
          )
        })}
      </div>
    </nav>
  )
}

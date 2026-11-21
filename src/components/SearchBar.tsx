import { useId } from 'react'
import { Search, X } from 'lucide-react'
import { t } from '../lib/text'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

/** Buscador del menú ("¿Qué se te antoja?"). */
export function SearchBar({ value, onChange }: SearchBarProps) {
  const id = useId()
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {t.menu.searchLabel}
      </label>
      <Search
        aria-hidden
        size={20}
        strokeWidth={2}
        className="pointer-events-none absolute top-1/2 left-[15px] -translate-y-1/2 text-texto-2"
      />
      <input
        id={id}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.menu.searchPlaceholder}
        className="h-11 w-full appearance-none rounded-completo border border-borde bg-tarjeta pr-12 pl-[42px] text-body text-texto placeholder:text-texto-2 focus-visible:outline-3 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t.menu.clearSearch}
          className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-completo text-texto-2"
        >
          <X size={18} aria-hidden />
        </button>
      )}
    </div>
  )
}

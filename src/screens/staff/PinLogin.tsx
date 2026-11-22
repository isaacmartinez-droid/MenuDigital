import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Delete } from 'lucide-react'
import { restaurant } from '../../lib/catalog'
import { cx } from '../../lib/cx'
import { fmt, t } from '../../lib/text'
import { peopleOf, useCatalog, type StaffRole } from '../../store/catalogEdits'

const p = t.staff.pin
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const

/** A qué pantalla entra cada rol. */
const HOME: Record<StaffRole, { path: string; area: keyof typeof t.staff.areas }> = {
  cocina: { path: '/cocina', area: 'cocina' },
  caja: { path: '/caja', area: 'caja' },
  mesero: { path: '/meseros', area: 'meseros' },
  dueno: { path: '/panel', area: 'panel' },
}

/**
 * P0 Entrar con PIN (/personal): logo, "Entrá con tu PIN", cuatro puntos y el teclado.
 * Con el PIN de una persona (P4c) entra a su pantalla: cocina, caja, meseros o panel.
 * También se puede escribir con el teclado de la computadora. En la demo, las
 * direcciones directas (/cocina, /caja…) siguen funcionando sin PIN.
 */
export function PinLogin() {
  const navigate = useNavigate()
  const people = peopleOf(useCatalog((s) => s.people))
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState(false)
  const [welcome, setWelcome] = useState('')
  const { logo } = restaurant

  useEffect(() => {
    document.title = `${p.title} · ${restaurant.name}`
  }, [])

  const press = (key: (typeof KEYS)[number]) => {
    if (welcome) return
    if (key === 'del') {
      setPin((v) => v.slice(0, -1))
      return
    }
    if (!key || pin.length >= 4) return
    setWrong(false)
    const next = pin + key
    setPin(next)
    if (next.length < 4) return
    const person = people.find((x) => x.pin === next)
    if (!person) {
      setWrong(true)
      window.setTimeout(() => setPin(''), 300)
      return
    }
    const home = HOME[person.role]
    setWelcome(fmt(p.welcome, { name: person.name, area: t.staff.areas[home.area] }))
    window.setTimeout(() => navigate(home.path), 600)
  }

  // Teclado de la computadora: números y Borrar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key as (typeof KEYS)[number])
      else if (e.key === 'Backspace') press('del')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <picture className="block h-[88px] w-[120px]">
        <source srcSet={logo.webp} type="image/webp" />
        <img src={logo.png} alt={logo.alt} width={120} height={88} className="h-full w-full object-contain" />
      </picture>
      <h1 className="text-title text-texto">{p.title}</h1>

      <div role="img" aria-label={fmt(p.progress, { n: pin.length })} className="flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cx(
              'size-4 rounded-completo border-[1.5px]',
              i < pin.length ? (wrong ? 'border-promo bg-promo' : 'border-texto bg-texto') : 'border-texto-2',
            )}
          />
        ))}
      </div>
      <p role="status" className={cx('min-h-5 text-small font-medium', wrong ? 'text-promo' : 'text-verde')}>
        {wrong ? p.wrong : welcome}
      </p>

      <div role="group" aria-label={p.keypad} className="grid grid-cols-3 gap-3">
        {KEYS.map((key, i) =>
          key === '' ? (
            <span key={i} aria-hidden />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(key)}
              aria-label={key === 'del' ? p.deleteLabel : key}
              className={cx(
                'grid h-16 w-24 place-items-center rounded-grande border border-borde bg-tarjeta text-texto active:bg-fondo',
                key === 'del' ? 'text-body' : 'text-title',
              )}
            >
              {key === 'del' ? (
                <span className="flex items-center gap-1.5">
                  <Delete aria-hidden size={18} />
                  {p.delete}
                </span>
              ) : (
                key
              )}
            </button>
          ),
        )}
      </div>
      <p className="text-small text-texto-2">{p.footnote}</p>
      <p className="text-small text-texto-2">{p.demoHint}</p>
    </main>
  )
}

import { restaurant } from '../../../lib/catalog'
import { fmt, t } from '../../../lib/text'
import { PanelCard, PanelHeader, PanelNote } from './parts'

/**
 * P4c Panel · Personal y PINs: quién trabaja, su rol y su PIN (oculto), y el
 * registro de lo que se hizo con el PIN del dueño. Todo de ejemplo; cambiar el PIN
 * y agregar personas vienen con el PIN de entrada (P0).
 */
export function PanelPeople() {
  const m = t.staff.panel.people
  const { people, pinLog } = restaurant.demo.panel

  return (
    <>
      <PanelHeader title={m.title} action={m.add} />
      <div className="flex flex-col items-start gap-4 lg:flex-row">
        <PanelCard className="w-full flex-1 px-4">
          <ul>
            {people.map((person, i) => (
              <li key={person.name} className={i ? 'border-t border-borde' : undefined}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <span className="min-w-0 flex-1 text-dish text-texto">{person.name}</span>
                  <span className="w-[200px] text-body text-texto-2">{person.role}</span>
                  <span className="text-body text-texto-2">
                    <span aria-hidden>{m.pin}</span>
                    <span className="sr-only">{m.pinLabel}</span>
                  </span>
                  <button
                    type="button"
                    disabled
                    title={t.staff.soon}
                    aria-label={`${fmt(m.changeLabel, { name: person.name })} (${t.staff.soon})`}
                    className="-my-2 min-h-11 text-dish text-verde disabled:opacity-60"
                  >
                    {m.change}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </PanelCard>
        <PanelCard className="flex w-full flex-col gap-2 p-4 lg:w-[420px]">
          <h3 className="text-dish text-texto">{m.logTitle}</h3>
          <ul className="flex flex-col gap-2">
            {pinLog.map((line) => (
              <li key={line} className="text-small text-texto-2">
                {line}
              </li>
            ))}
          </ul>
        </PanelCard>
      </div>
      <PanelNote>{m.footnote}</PanelNote>
    </>
  )
}

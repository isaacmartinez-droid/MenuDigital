import { useState, useSyncExternalStore } from 'react'
import { restaurant } from '../../../lib/catalog'
import { logLine, logSnapshot, readLog, subscribeLog } from '../../../lib/actionLog'
import { fmt, t } from '../../../lib/text'
import { peopleOf, useCatalog, type StaffPerson } from '../../../store/catalogEdits'
import { focusPanelAction, useSavedNote } from './formUtils'
import { PanelCard, PanelHeader, PanelNote } from './parts'
import { EditPersonDialog, PersonDialog, PinDialog } from './PersonDialog'

/**
 * P4c Panel · Personal y PINs: quién trabaja, su rol y su PIN (oculto), con "Editar"
 * (nombre, rol, quitar) y "Cambiar" (PIN). A la derecha, el registro de cambios real
 * del panel y de caja (en este navegador) y debajo ejemplos de cómo se verá con el
 * sistema real. Los PIN sirven para entrar desde /personal (P0).
 */
export function PanelPeople() {
  const m = t.staff.panel.people
  const people = peopleOf(useCatalog((s) => s.people))
  const { pinLog } = restaurant.demo.panel
  // El registro se vuelve a leer cuando alguien anota algo (esta pestaña u otra).
  useSyncExternalStore(subscribeLog, logSnapshot)
  const log = readLog()
  const [adding, setAdding] = useState(false)
  const [changing, setChanging] = useState<StaffPerson | null>(null)
  const [editing, setEditing] = useState<StaffPerson | null>(null)
  const [note, showNote] = useSavedNote()

  return (
    <>
      <PanelHeader title={m.title} action={m.add} onAction={() => setAdding(true)} />
      {note}
      <div className="flex flex-col items-start gap-4 lg:flex-row">
        <PanelCard className="w-full flex-1 px-4">
          <ul>
            {people.map((person, i) => (
              <li key={person.id} className={i ? 'border-t border-borde' : undefined}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <span className="min-w-0 flex-1 text-dish text-texto">{person.name}</span>
                  <span className="w-[200px] text-body text-texto-2">{t.staff.panel.roles[person.role]}</span>
                  <span className="text-body text-texto-2">
                    <span aria-hidden>{m.pin}</span>
                    <span className="sr-only">{m.pinLabel}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditing(person)}
                    aria-label={fmt(m.editLabel, { name: person.name })}
                    className="-my-2 min-h-11 text-dish text-verde"
                  >
                    {m.edit}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChanging(person)}
                    aria-label={fmt(m.changeLabel, { name: person.name })}
                    className="-my-2 min-h-11 text-dish text-verde"
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
          {log.length ? (
            <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {log.map((entry) => (
                <li key={`${entry.at}-${entry.action}`} className="text-small text-texto">
                  {logLine(entry)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-small text-texto-2">{m.logEmpty}</p>
          )}
          <p className="mt-2 border-t border-borde pt-2 text-small font-medium text-texto-2">{m.logExamples}</p>
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
      {adding && <PersonDialog onClose={() => setAdding(false)} onSaved={showNote} />}
      {changing && <PinDialog person={changing} onClose={() => setChanging(null)} onSaved={showNote} />}
      {editing && (
        <EditPersonDialog
          person={editing}
          onClose={() => setEditing(null)}
          onSaved={(text, undo) => {
            showNote(text, undo)
            if (undo) focusPanelAction()
          }}
        />
      )}
    </>
  )
}

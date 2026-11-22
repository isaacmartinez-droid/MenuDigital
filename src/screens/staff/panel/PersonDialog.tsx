import { useId, useState } from 'react'
import { fmt, t } from '../../../lib/text'
import { catalogStore, peopleOf, type StaffPerson, type StaffRole } from '../../../store/catalogEdits'
import { Field, FormDialog } from './form'
import { describedBy, inputClass } from './formUtils'

const ROLES: StaffRole[] = ['cocina', 'caja', 'mesero', 'dueno']

/** Campo de PIN: solo 4 números, oculto. */
function PinInput({
  id,
  value,
  onChange,
  error,
  hint,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  error?: string
  hint?: string
}) {
  return (
    <input
      id={id}
      type="password"
      inputMode="numeric"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
      aria-invalid={Boolean(error)}
      aria-describedby={describedBy(id, hint, error)}
      className={`${inputClass(Boolean(error))} tracking-[0.4em]`}
    />
  )
}

/** Errores de un PIN nuevo: 4 números, repetido igual y que no lo use otra persona. */
function pinErrors(pin: string, again: string, exceptId?: string) {
  const m = t.staff.panel.people
  const taken = peopleOf(catalogStore.getState().people).find((p) => p.pin === pin && p.id !== exceptId)
  return {
    pin: !/^\d{4}$/.test(pin) ? m.errorPin : taken ? fmt(m.errorTaken, { name: taken.name }) : '',
    again: /^\d{4}$/.test(pin) && again !== pin ? m.errorMatch : '',
  }
}

/** P4c "Agregar persona" (sin diseño en el Figma): nombre, rol y PIN dos veces. */
export function PersonDialog({ onClose, onSaved }: { onClose: () => void; onSaved: (text: string) => void }) {
  const m = t.staff.panel.people
  const id = useId()
  const [name, setName] = useState('')
  const [role, setRole] = useState<StaffRole>('mesero')
  const [pin, setPin] = useState('')
  const [again, setAgain] = useState('')
  const [tried, setTried] = useState(false)
  const errors = { name: !name.trim() ? m.errorName : '', ...pinErrors(pin, again) }
  const show = (key: keyof typeof errors) => (tried ? errors[key] : '')

  const save = () => {
    setTried(true)
    const first = (Object.keys(errors) as (keyof typeof errors)[]).find((k) => errors[k])
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus()
      return false
    }
    catalogStore.getState().addPerson({ name: name.trim(), role, pin })
    onSaved(fmt(m.added, { name: name.trim() }))
    return true
  }

  return (
    <FormDialog title={m.addTitle} submitLabel={m.create} onClose={onClose} onSubmit={save} width={520}>
      <Field id={`${id}-name`} label={m.name} error={show('name')}>
        <input
          id={`${id}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          autoComplete="off"
          aria-invalid={Boolean(show('name'))}
          aria-describedby={describedBy(`${id}-name`, undefined, show('name'))}
          className={inputClass(Boolean(show('name')))}
        />
      </Field>
      <Field id={`${id}-role`} label={m.role}>
        <select id={`${id}-role`} value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className={inputClass()}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {t.staff.panel.roleNames[r]}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field id={`${id}-pin`} label={m.pinField} hint={m.pinHint} error={show('pin')}>
          <PinInput id={`${id}-pin`} value={pin} onChange={setPin} error={show('pin')} hint={m.pinHint} />
        </Field>
        <Field id={`${id}-again`} label={m.pinAgain} error={show('again')}>
          <PinInput id={`${id}-again`} value={again} onChange={setAgain} error={show('again')} />
        </Field>
      </div>
    </FormDialog>
  )
}

/** P4c "Cambiar" el PIN de una persona: el nuevo, dos veces. */
export function PinDialog({
  person,
  onClose,
  onSaved,
}: {
  person: StaffPerson
  onClose: () => void
  onSaved: (text: string) => void
}) {
  const m = t.staff.panel.people
  const id = useId()
  const [pin, setPin] = useState('')
  const [again, setAgain] = useState('')
  const [tried, setTried] = useState(false)
  const errors = pinErrors(pin, again, person.id)
  const show = (key: keyof typeof errors) => (tried ? errors[key] : '')

  const save = () => {
    setTried(true)
    if (errors.pin || errors.again) {
      document.getElementById(`${id}-${errors.pin ? 'pin' : 'again'}`)?.focus()
      return false
    }
    catalogStore.getState().setPin(person.id, pin)
    onSaved(fmt(m.pinChanged, { name: person.name }))
    return true
  }

  return (
    <FormDialog title={fmt(m.changeTitle, { name: person.name })} submitLabel={m.savePin} onClose={onClose} onSubmit={save} width={520}>
      <div className="grid grid-cols-2 gap-4">
        <Field id={`${id}-pin`} label={m.pinNew} hint={m.pinHint} error={show('pin')}>
          <PinInput id={`${id}-pin`} value={pin} onChange={setPin} error={show('pin')} hint={m.pinHint} />
        </Field>
        <Field id={`${id}-again`} label={m.pinAgain} error={show('again')}>
          <PinInput id={`${id}-again`} value={again} onChange={setAgain} error={show('again')} />
        </Field>
      </div>
    </FormDialog>
  )
}

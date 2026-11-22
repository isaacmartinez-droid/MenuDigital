import type { FormEvent, ReactNode } from 'react'
import { Button } from '../../../components/Button'
import { StaffDialog } from '../../../components/staff/StaffDialog'
import { cx } from '../../../lib/cx'
import { t } from '../../../lib/text'

interface FieldProps {
  id: string
  label: string
  /** Texto de ayuda gris debajo. */
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}

/** Etiqueta, campo, ayuda y error (el campo usa `${id}-e` / `${id}-h` en aria-describedby). */
export function Field({ id, label, hint, error, children, className }: FieldProps) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-2', className)}>
      <label htmlFor={id} className="text-dish text-texto">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-h`} className="text-small text-texto-2">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-e`} className="text-small text-promo">
          {error}
        </p>
      )}
    </div>
  )
}

interface FormDialogProps {
  title: string
  submitLabel: string
  onClose: () => void
  /** Devuelve true si guardó (cierra la ventana). */
  onSubmit: () => boolean
  children: ReactNode
  /** Botón extra a la izquierda (por ejemplo, "Borrar plato"). */
  extra?: ReactNode
  width?: 520 | 560
}

/**
 * Ventana con formulario del panel: los campos se desplazan y abajo quedan
 * "Cancelar" y el botón principal. Enter guarda.
 */
export function FormDialog({ title, submitLabel, onClose, onSubmit, children, extra, width = 560 }: FormDialogProps) {
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (onSubmit()) onClose()
  }
  return (
    <StaffDialog title={title} onClose={onClose} width={width}>
      <form onSubmit={submit} noValidate className="mt-4 flex min-h-0 flex-col">
        <div className="-mx-1 flex min-h-0 flex-col gap-4 overflow-y-auto px-1 pb-1">{children}</div>
        <div className="mt-5 flex shrink-0 flex-wrap items-center gap-3">
          {extra}
          <div className="flex-1" />
          <Button variant="secondary" onClick={onClose}>
            {t.staff.panel.cancel}
          </Button>
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </StaffDialog>
  )
}

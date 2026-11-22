import { useId, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Photo } from '../../../components/Photo'
import { menu } from '../../../lib/catalog'
import { fmt, t } from '../../../lib/text'
import type { Dish } from '../../../types/menu'
import { catalogStore, isAddedDish } from '../../../store/catalogEdits'
import { Field, FormDialog } from './form'
import { describedBy, inputClass } from './formUtils'

/** Lado mayor de la foto guardada (en px): liviana para localStorage y suficiente para el detalle. */
const PHOTO_MAX = 640

/** Achica la foto elegida y la devuelve como data: URI (WebP si el navegador puede, si no JPEG). */
async function shrinkPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const scale = Math.min(1, PHOTO_MAX / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
    const webp = canvas.toDataURL('image/webp', 0.8)
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.8)
  } finally {
    URL.revokeObjectURL(url)
  }
}

interface DishDialogProps {
  /** El plato a editar, o nada para agregar uno nuevo. */
  dish?: Dish
  onClose: () => void
  onSaved: (text: string) => void
}

/**
 * P4a "Agregar plato" / editar un plato (sin diseño en el Figma; boceto aprobado):
 * nombre, categoría, precio, línea corta, descripción, etiqueta y foto. Al guardar,
 * la mesa y la web lo ven al instante. Los platos agregados se pueden borrar.
 */
export function DishDialog({ dish, onClose, onSaved }: DishDialogProps) {
  const m = t.staff.panel.menu
  const id = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(dish?.name ?? '')
  const [category, setCategory] = useState(dish?.category ?? menu.categories[0]?.id ?? '')
  const [price, setPrice] = useState(dish ? String(dish.price) : '')
  const [short, setShort] = useState(dish?.shortDescription ?? '')
  const [description, setDescription] = useState(dish?.description ?? '')
  const [tag, setTag] = useState(dish?.tags[0] ?? '')
  const [image, setImage] = useState(dish?.image ?? '')
  const [photoError, setPhotoError] = useState('')
  const [tried, setTried] = useState(false)
  const removable = dish && isAddedDish(dish.id)

  const amount = Number(price.replace(/[^\d]/g, ''))
  const errors = {
    name: !name.trim() ? m.errorName : '',
    price: !(amount > 0) ? m.errorPrice : '',
    short: !short.trim() ? m.errorShort : '',
  }
  const show = (key: keyof typeof errors) => (tried ? errors[key] : '')

  const save = () => {
    setTried(true)
    if (errors.name || errors.price || errors.short) {
      document.getElementById(`${id}-${errors.name ? 'name' : errors.price ? 'price' : 'short'}`)?.focus()
      return false
    }
    // Las etiquetas que no se editan acá (si el plato tenía más de una) se conservan.
    const rest = dish?.tags.slice(1) ?? []
    catalogStore.getState().saveDish(dish?.id ?? null, {
      name: name.trim(),
      category,
      price: amount,
      shortDescription: short.trim(),
      description: description.trim() || undefined,
      tags: tag ? [tag, ...rest.filter((x) => x !== tag)] : rest,
      image: image || undefined,
    })
    onSaved(fmt(m.saved, { name: name.trim() }))
    return true
  }

  const pick = async (file: File | undefined) => {
    if (!file) return
    setPhotoError('')
    try {
      setImage(await shrinkPhoto(file))
    } catch {
      setPhotoError(m.photoError)
    }
  }

  return (
    <FormDialog
      title={dish ? fmt(m.editTitle, { name: dish.name }) : m.addTitle}
      submitLabel={dish ? m.save : m.create}
      onClose={onClose}
      onSubmit={save}
      extra={
        removable && (
          <Button
            variant="secondary"
            icon={<Trash2 aria-hidden size={18} />}
            onClick={() => {
              catalogStore.getState().removeDish(dish.id)
              onSaved(fmt(m.deleted, { name: dish.name }))
              onClose()
            }}
          >
            {m.delete}
          </Button>
        )
      }
    >
      <Field id={`${id}-name`} label={m.name} error={show('name')}>
        <input
          id={`${id}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoComplete="off"
          aria-invalid={Boolean(show('name'))}
          aria-describedby={describedBy(`${id}-name`, undefined, show('name'))}
          className={inputClass(Boolean(show('name')))}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field id={`${id}-cat`} label={m.category}>
          <select id={`${id}-cat`} value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass()}>
            {menu.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${id}-price`} label={m.price} error={show('price')}>
          <input
            id={`${id}-price`}
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, '').slice(0, 5))}
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={Boolean(show('price'))}
            aria-describedby={describedBy(`${id}-price`, undefined, show('price'))}
            className={inputClass(Boolean(show('price')))}
          />
        </Field>
      </div>
      <Field id={`${id}-short`} label={m.short} error={show('short')}>
        <input
          id={`${id}-short`}
          value={short}
          onChange={(e) => setShort(e.target.value)}
          maxLength={70}
          autoComplete="off"
          aria-invalid={Boolean(show('short'))}
          aria-describedby={describedBy(`${id}-short`, undefined, show('short'))}
          className={inputClass(Boolean(show('short')))}
        />
      </Field>
      <Field id={`${id}-desc`} label={m.description}>
        <textarea
          id={`${id}-desc`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          rows={2}
          className={`${inputClass()} h-auto py-2`}
        />
      </Field>
      <Field id={`${id}-tag`} label={m.tag}>
        <select id={`${id}-tag`} value={tag} onChange={(e) => setTag(e.target.value)} className={inputClass()}>
          <option value="">{m.noTag}</option>
          {menu.tags.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex flex-col gap-2">
        <span className="text-dish text-texto">{m.photo}</span>
        <div className="flex flex-wrap items-center gap-3">
          <Photo src={image || undefined} size="full" className="size-20 shrink-0 rounded-chico" />
          <input
            ref={fileRef}
            id={`${id}-file`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-describedby={`${id}-file-h`}
            onChange={(e) => void pick(e.target.files?.[0])}
          />
          <Button variant="secondary" icon={<ImagePlus aria-hidden size={18} />} onClick={() => fileRef.current?.click()}>
            {image ? m.photoChange : m.photoPick}
          </Button>
          {image && (
            <Button variant="secondary" onClick={() => setImage('')}>
              {m.photoRemove}
            </Button>
          )}
        </div>
        <p id={`${id}-file-h`} className="text-small text-texto-2">
          {m.photoHint}
        </p>
        {photoError && (
          <p role="alert" className="text-small text-promo">
            {photoError}
          </p>
        )}
      </div>
    </FormDialog>
  )
}

import { useState } from 'react'
import type { ReplaceableComponent, Substitute } from '../types/menu'
import { fmt, t } from '../lib/text'
import { BottomSheet } from './BottomSheet'
import { OptionCard } from './OptionCard'
import { Button } from './Button'

interface SoldOutSheetProps {
  open: boolean
  dishName: string
  component: ReplaceableComponent
  busy: boolean
  onClose: () => void
  onSubmit: (substitute: Substitute) => void
}

/** M4g: "Se acabó el maduro", con las opciones de cambio definidas en menu.json. */
export function SoldOutSheet({ open, dishName, component, busy, onClose, onSubmit }: SoldOutSheetProps) {
  const [choice, setChoice] = useState(component.substitutes[0]?.id ?? '')
  const selected = component.substitutes.find((s) => s.id === choice)

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={fmt(t.soldOut.title, { component: component.name })}
      description={fmt(t.soldOut.body, { dish: dishName, component: component.name })}
      footer={
        <Button block disabled={!selected || busy} onClick={() => selected && onSubmit(selected)}>
          {t.soldOut.submit}
        </Button>
      }
    >
      <div role="radiogroup" aria-label={fmt(t.soldOut.title, { component: component.name })} className="space-y-4">
        {component.substitutes.map((s) => (
          <OptionCard
            key={s.id}
            name="reemplazo"
            value={s.id}
            checked={choice === s.id}
            onChange={setChoice}
            title={s.name}
            hint={s.note}
          />
        ))}
      </div>
    </BottomSheet>
  )
}

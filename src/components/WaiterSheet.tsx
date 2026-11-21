import { useState } from 'react'
import { Bell } from 'lucide-react'
import { restaurant } from '../lib/catalog'
import { t } from '../lib/text'
import { BottomSheet } from './BottomSheet'
import { OptionCard } from './OptionCard'
import { Button } from './Button'

interface WaiterSheetProps {
  open: boolean
  onClose: () => void
  onSubmit: (reason: string) => void
}

/** M4d: hoja "¿Qué necesitás?" con el motivo del llamado. */
export function WaiterSheet({ open, onClose, onSubmit }: WaiterSheetProps) {
  const reasons = restaurant.waiterReasons
  const [reason, setReason] = useState(reasons[0]?.id ?? '')

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t.waiter.sheetTitle}
      footer={
        <Button block icon={<Bell size={22} aria-hidden />} onClick={() => onSubmit(reason)}>
          {t.waiter.submit}
        </Button>
      }
    >
      <div role="radiogroup" aria-label={t.waiter.sheetTitle} className="space-y-4">
        {reasons.map((r) => (
          <OptionCard
            key={r.id}
            name="motivo-mesero"
            value={r.id}
            checked={reason === r.id}
            onChange={setReason}
            title={r.title}
            hint={r.hint}
          />
        ))}
      </div>
    </BottomSheet>
  )
}

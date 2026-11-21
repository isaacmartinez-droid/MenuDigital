import { cx } from '../lib/cx'
import { t } from '../lib/text'
import { Tag } from './Tag'

/** Forma de pago: por ahora solo al recoger; tarjeta y transferencia, "Próximamente". */
const options = [
  { id: 'recoger', title: t.web.payPickup, hint: t.web.payPickupHint, soon: false },
  { id: 'tarjeta', title: t.web.payCard, soon: true },
  { id: 'transferencia', title: t.web.payTransfer, soon: true },
] as const

/** "¿Cómo pagás?" para llevar (W6 y T4). Solo vista: se paga al recoger. */
export function PayOptions() {
  return (
    <fieldset>
      <legend className="text-section text-texto">{t.web.payTitle}</legend>
      <div className="mt-3 rounded-grande border border-borde bg-tarjeta px-3 tablet:px-4">
        {options.map((option) => (
          <label
            key={option.id}
            className={cx(
              'flex items-center gap-3 py-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-verde',
              option.soon ? 'cursor-not-allowed' : 'cursor-pointer',
            )}
          >
            <input
              type="radio"
              name="pago"
              value={option.id}
              checked={!option.soon}
              disabled={option.soon}
              readOnly
              className="sr-only"
            />
            <span
              aria-hidden
              className={cx(
                'size-[22px] shrink-0 rounded-completo bg-tarjeta',
                option.soon ? 'border-[1.5px] border-borde' : 'border-[6px] border-verde',
              )}
            />
            <span className="min-w-0 flex-1">
              <span className={cx('block text-dish', option.soon ? 'text-texto-2' : 'text-texto')}>
                {option.title}
              </span>
              {'hint' in option && <span className="block text-small text-texto-2">{option.hint}</span>}
            </span>
            {option.soon && <Tag tone="combo">{t.web.soon}</Tag>}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

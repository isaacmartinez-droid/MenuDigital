import { useEffect, useMemo, useRef, useState } from 'react'
import { Switch } from '../../../components/staff/Switch'
import { restaurant } from '../../../lib/catalog'
import { downloadQr, prettyUrl, publicBase, qrSvg } from '../../../lib/qr'
import { fmt, t, tableLabel } from '../../../lib/text'
import { panelSettingsStore, usePanelSettings } from '../../../store/panelSettings'
import { PanelCard, PanelHeader, PanelNote } from './parts'

/** Una regla de pedido en mesa con su interruptor. */
function Rule({
  title,
  body,
  checked,
  onChange,
  disabled,
}: {
  title: string
  body: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  const on = t.staff.panel.on
  const off = t.staff.panel.off
  return (
    <PanelCard className="flex flex-1 items-center gap-3 p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="text-dish text-texto">{title}</h3>
        <p className="text-small text-texto-2">{body}</p>
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        label={title}
        stateText={checked ? on : off}
        disabled={disabled}
        title={disabled ? t.staff.soon : undefined}
      />
    </PanelCard>
  )
}

/** Tarjeta de una mesa: su QR, la dirección y "Descargar QR". */
function TableCard({ mesa }: { mesa: string }) {
  const m = t.staff.panel.tables
  const url = `${publicBase()}/m/${mesa}`
  const label = tableLabel(mesa)
  const svg = useMemo(() => qrSvg(url), [url])
  return (
    <PanelCard className="flex items-center gap-3 p-3">
      <div
        role="img"
        aria-label={fmt(m.qrAlt, { mesa: label })}
        className="size-16 shrink-0 overflow-hidden rounded-chico [&_svg]:block [&_svg]:size-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-dish text-texto">{label}</h3>
        <p className="truncate text-small text-texto-2" title={prettyUrl(url)}>
          {prettyUrl(url)}
        </p>
        <button
          type="button"
          onClick={() => void downloadQr(url, `mesa-${mesa}.svg`)}
          aria-label={fmt(m.downloadLabel, { mesa: label })}
          className="-my-2 flex min-h-11 items-center self-start text-small font-medium text-verde underline-offset-2 hover:underline"
        >
          {m.download}
        </button>
      </div>
    </PanelCard>
  )
}

/** Fila de un enlace para redes con su botón "Copiar". */
function LinkRow({ label, url, onCopied }: { label: string; url: string; onCopied: (label: string) => void }) {
  const m = t.staff.panel.tables
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Sin permiso para el portapapeles: se selecciona a mano desde la pantalla.
      return
    }
    setCopied(true)
    onCopied(label)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="w-[180px] text-body text-texto">{label}</span>
      <span className="min-w-0 flex-1 text-body break-all text-texto-2">{prettyUrl(url)}</span>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={fmt(m.copyLabel, { name: label })}
        className="-my-2 flex min-h-11 min-w-16 items-center justify-end text-dish text-verde"
      >
        {copied ? m.copied : m.copy}
      </button>
    </li>
  )
}

/**
 * P4b Panel · Mesas y QR: las reglas de pedido en mesa (las dos primeras funcionan
 * de verdad en la mesa y la web), cada mesa con su QR y los enlaces para redes con
 * su ?src= para saber de dónde llega cada pedido en línea.
 */
export function PanelTables() {
  const m = t.staff.panel.tables
  const onlyInHours = usePanelSettings((s) => s.onlyInHours)
  const limit = usePanelSettings((s) => s.itemLimit)
  const { setOnlyInHours, setItemLimit } = panelSettingsStore.getState()
  const [announce, setAnnounce] = useState('')
  const base = publicBase()

  return (
    <>
      <PanelHeader title={m.title} action={m.add} />
      <section aria-label={m.rulesLabel} className="flex flex-col gap-4 lg:flex-row">
        <Rule title={m.rules.hours.title} body={m.rules.hours.body} checked={onlyInHours} onChange={setOnlyInHours} />
        <Rule
          title={m.rules.limit.title}
          body={fmt(m.rules.limit.body, { max: restaurant.ordering.maxItemsPerComanda })}
          checked={limit}
          onChange={setItemLimit}
        />
        <Rule title={m.rules.accept.title} body={m.rules.accept.body} checked={false} onChange={() => {}} disabled />
      </section>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {restaurant.tables.map((mesa) => (
          <li key={mesa}>
            <TableCard mesa={mesa} />
          </li>
        ))}
      </ul>

      <PanelCard className="flex flex-col gap-2 p-4">
        <h3 className="text-dish text-texto">{m.linksTitle}</h3>
        <ul className="flex flex-col gap-2">
          {restaurant.demo.panel.links.map((l) => (
            <LinkRow
              key={l.src}
              label={l.label}
              url={`${base}/?src=${l.src}`}
              onCopied={(name) => setAnnounce(fmt(m.copiedAlert, { name }))}
            />
          ))}
        </ul>
      </PanelCard>
      <p role="status" className="sr-only">
        {announce}
      </p>
      <PanelNote>{m.footnote}</PanelNote>
    </>
  )
}

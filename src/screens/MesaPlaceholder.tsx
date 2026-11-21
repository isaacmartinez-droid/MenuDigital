import { Link, useParams } from 'react-router'
import { isValidTable } from '../lib/catalog'
import { InvalidTable } from './InvalidTable'

/** Provisional de la etapa a): el flujo de mesa llega en la etapa b). */
export function MesaPlaceholder() {
  const { mesa } = useParams()
  if (!isValidTable(mesa)) return <InvalidTable />
  return (
    <main className="app-shell p-4">
      <p className="text-body text-texto-2">Mesa {mesa}: el menú llega en la etapa b).</p>
      {import.meta.env.DEV && (
        <Link to="/componentes" className="mt-2 inline-block text-body font-semibold text-verde underline">
          Ver componentes base
        </Link>
      )}
    </main>
  )
}

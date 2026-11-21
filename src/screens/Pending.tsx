import { useNavigate } from 'react-router'
import { PageHeader } from '../components/Header'
import { paths, useMesa } from '../lib/useMesa'

/** Provisional mientras se construyen las etapas siguientes. */
export function Pending({ title, stage }: { title: string; stage: string }) {
  const mesa = useMesa()
  const navigate = useNavigate()
  return (
    <div className="app-shell">
      <PageHeader title={title} subtitle={`Mesa ${mesa}`} onBack={() => navigate(paths.menu(mesa))} />
      <p className="px-4 text-body text-texto-2">Esta pantalla llega en la etapa {stage}.</p>
    </div>
  )
}

import { useEffect } from 'react'
import { watchComanda } from './api'
import { comandasStore, useComandas } from '../store/comandas'

/** Comanda de la mesa con su estado al día (escucha a cocina mientras no esté entregada). */
export function useLiveComanda(mesa: string, comandaId: string) {
  const comanda = useComandas(mesa, (s) => s.comandas.find((c) => c.id === comandaId))
  const createdAt = comanda?.createdAt
  const delivered = comanda?.status === 'entregada'
  const watchable = Boolean(comanda?.mine)

  useEffect(() => {
    if (!createdAt || delivered || !watchable) return
    const current = comandasStore(mesa).getState().comandas.find((c) => c.id === comandaId)
    if (!current) return
    return watchComanda(current, (status) => comandasStore(mesa).getState().setStatus(comandaId, status))
  }, [mesa, comandaId, createdAt, delivered, watchable])

  return comanda
}

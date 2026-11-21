import { useParams } from 'react-router'

/**
 * Id de la mesa actual. Solo se usa dentro de MesaLayout, que ya validó
 * que la mesa existe en la config.
 */
export function useMesa(): string {
  const { mesa } = useParams()
  return mesa ?? ''
}

/** Rutas del flujo de mesa. */
export const paths = {
  menu: (mesa: string) => `/m/${mesa}`,
  dish: (mesa: string, dishId: string) => `/m/${mesa}/plato/${dishId}`,
  editLine: (mesa: string, dishId: string, lineId: string) => `/m/${mesa}/plato/${dishId}?linea=${lineId}`,
  order: (mesa: string) => `/m/${mesa}/pedido`,
  tracking: (mesa: string, comandaId: string) => `/m/${mesa}/orden/${comandaId}`,
  bill: (mesa: string) => `/m/${mesa}/cuenta`,
  paid: (mesa: string) => `/m/${mesa}/cuenta/pagada`,
}

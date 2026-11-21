import { useParams } from 'react-router'
import { TAKEOUT, isTakeout } from './channel'

/**
 * Id de la cuenta actual: el número de mesa dentro de /m/:mesa (MesaLayout ya
 * validó que existe) o TAKEOUT en la web para llevar.
 */
export function useMesa(): string {
  const { mesa } = useParams()
  return mesa ?? TAKEOUT
}

/** Base de las rutas compartidas: "/m/5" en la mesa, "" en la web. */
const base = (id: string) => (isTakeout(id) ? '' : `/m/${id}`)

/** Rutas de las pantallas. Las compartidas sirven para la mesa y para la web. */
export const paths = {
  menu: (id: string) => (isTakeout(id) ? '/menu' : `/m/${id}`),
  dish: (id: string, dishId: string) => `${base(id)}/plato/${dishId}`,
  editLine: (id: string, dishId: string, lineId: string) => `${base(id)}/plato/${dishId}?linea=${lineId}`,
  order: (id: string) => `${base(id)}/pedido`,
  tracking: (id: string, comandaId: string) => `${base(id)}/orden/${comandaId}`,
  bill: (id: string) => `/m/${id}/cuenta`,
  paid: (id: string) => `/m/${id}/cuenta/pagada`,
  /** Solo web. */
  home: '/',
  delivery: '/domicilio',
  data: '/datos',
  summary: '/resumen',
  confirmation: (comandaId: string) => `/confirmacion/${comandaId}`,
  rate: (comandaId: string) => `/calificar/${comandaId}`,
}

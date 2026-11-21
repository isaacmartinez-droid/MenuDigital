import { clearTableStorage } from './storage'
import { resetCartStore } from '../store/cart'
import { resetComandasStore } from '../store/comandas'
import { resetAccountStore } from '../store/account'

/**
 * Cierra la sesión de la mesa: borra todo lo guardado de esa mesa
 * (carrito, comandas, cuenta, bienvenida vista) para que los próximos
 * clientes empiecen una cuenta nueva y no vean estos pedidos.
 */
export function closeTable(tableId: string): void {
  clearTableStorage(tableId)
  resetCartStore(tableId)
  resetComandasStore(tableId)
  resetAccountStore(tableId)
}

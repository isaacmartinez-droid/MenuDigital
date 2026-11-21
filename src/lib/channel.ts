/**
 * Canal del pedido. La URL lo decide:
 * - /m/:mesa → en la mesa (QR): la mesa identifica al cliente.
 * - el resto (/, /menu, /pedido…) → web para llevar: se piden nombre y WhatsApp.
 *
 * Las pantallas compartidas (menú, detalle, pedido, seguimiento) reciben el id
 * de la "cuenta": el número de mesa o TAKEOUT. Con ese id se guardan los stores
 * y se arman los links, así el mismo código sirve para los dos canales.
 */
export const TAKEOUT = 'llevar'

export const isTakeout = (id: string): boolean => id === TAKEOUT

/**
 * Modelo del menú. Hoy se lee de src/data/menu.json; mañana puede venir
 * tal cual de GET /api/menu sin tocar las pantallas.
 */

/** Tono visual de una etiqueta. */
export type TagTone = 'ambar' | 'promo' | 'combo' | 'agotado'

export interface Tag {
  id: string
  label: string
  tone: TagTone
  /**
   * Si es false, la etiqueta solo se muestra sobre la foto (carrusel y detalle)
   * y no en la fila de la lista. Ej.: "Más vendido" va en el carrusel; "Combo" va en la lista.
   */
  showInList: boolean
}

export interface Category {
  id: string
  name: string
}

/** Acompañante elegible (máx. 1 por plato). */
export interface SideOption {
  id: string
  name: string
}

export interface Extra {
  id: string
  name: string
  /** Nombre corto para el resumen del pedido ("Queso extra"). */
  shortName?: string
  price: number
}

export interface Review {
  id: string
  author: string
  rating: number
  text: string
  /** Fecha ISO (AAAA-MM-DD). */
  date: string
}

export interface Rating {
  average: number
  count: number
}

/** Reemplazo posible cuando se acaba una parte del plato (M4g). */
export interface Substitute {
  id: string
  name: string
  /** Texto de apoyo, ej. "Mismo precio". */
  note?: string
  /** Diferencia de precio por unidad; 0 o ausente = mismo precio. */
  priceDelta?: number
  /** true = no se reemplaza, solo se quita ("Sin acompañante"). */
  removes?: boolean
}

/** Parte del plato que puede agotarse en cocina y tiene reemplazos. */
export interface ReplaceableComponent {
  id: string
  /** En minúscula, para la frase: "Se acabó el {name}". */
  name: string
  substitutes: Substitute[]
}

export interface Dish {
  id: string
  name: string
  /** id de la categoría. */
  category: string
  price: number
  /** Línea corta para la lista del menú. */
  shortDescription: string
  /** Descripción del detalle. */
  description?: string
  /** "¿Qué trae?" en texto corrido. */
  includes?: string
  /** Ruta pública de la foto (WebP). Sin foto se muestra el fondo foto-vacía. */
  image?: string
  /** ids de etiquetas. */
  tags: string[]
  /** ids de acompañantes posibles. */
  sides?: string[]
  /** id del acompañante que viene por defecto (se usa al agregar con un toque). */
  defaultSide?: string
  /** ids de extras posibles. */
  extras?: string[]
  maxExtras?: number
  available: boolean
  rating?: Rating
  reviews?: Review[]
  replaceable?: ReplaceableComponent[]
}

export interface Menu {
  categories: Category[]
  tags: Tag[]
  sides: SideOption[]
  extras: Extra[]
  dishes: Dish[]
  /** ids de platos del carrusel "Los más vendidos", en orden. */
  bestSellers: string[]
  /** ids de bebidas sugeridas en "Tu pedido". */
  suggestedDrinks: string[]
}

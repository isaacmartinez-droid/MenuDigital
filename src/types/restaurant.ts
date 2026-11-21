import type restaurantJson from '../config/restaurant.json'

/**
 * Configuración del restaurante. Hoy se lee de src/config/restaurant.json;
 * mañana puede venir de GET /api/restaurant sin tocar las pantallas.
 */

export type ColorToken =
  | 'verde'
  | 'verde-suave'
  | 'ambar'
  | 'ambar-suave'
  | 'texto-sobre-ambar'
  | 'promo'
  | 'combo-fondo'
  | 'fondo'
  | 'tarjeta'
  | 'texto'
  | 'texto-2'
  | 'borde'
  | 'foto-vacia'
  | 'azul-logo'

/** Franja de atención. days: 0 = domingo … 6 = sábado. Horas en "HH:mm" (24 h). */
export interface ScheduleRange {
  days: number[]
  open: string
  close: string
}

export interface WaiterReasonOption {
  id: string
  title: string
  hint?: string
}

/** Compañero de mesa simulado para la demo (se apaga con ?compas=0). */
export interface DemoTableMate {
  /** null = no puso nombre → "Teléfono {deviceNumber}". */
  name: string | null
  deviceNumber: number
  comandaNumber: number
  items: { dishId: string; quantity: number; sideId?: string; extraIds?: string[] }[]
}

/** Textos de interfaz. Se tipan a partir del JSON para que falte uno = error de TypeScript. */
export type Texts = (typeof restaurantJson)['texts']

export interface RestaurantConfig {
  id: string
  name: string
  logo: { webp: string; png: string; alt: string }
  colors: Record<ColorToken, string>
  currency: { symbol: string; locale: string }
  /** ids de mesa válidos (lo que va en /m/:mesa). */
  tables: string[]
  whatsapp: { number: string; message: string }
  schedule: { timezone: string; ranges: ScheduleRange[] }
  ordering: {
    maxItemsPerComanda: number
    comandaPrefix: string
    firstComandaNumber: number
    /** Número de "Teléfono N" de este dispositivo si no pone nombre. */
    myDeviceNumber: number
  }
  /** Tiempos en milisegundos (salvo readyEstimateMin). */
  timings: {
    welcomeMs: number
    undoToastMs: number
    processingMs: number
    cookingMs: number
    readyMs: number
    readyEstimateMin: number
    waiterAckMs: number
    waiterBannerMs: number
    waiterCooldownMs: number
    billPaidMs: number
    apiLatencyMs: number
  }
  staff: { waiter: string; cashier: string }
  waiterReasons: WaiterReasonOption[]
  demo: {
    tableMates: DemoTableMate[]
    paymentMethod: string
  }
  texts: Texts
}

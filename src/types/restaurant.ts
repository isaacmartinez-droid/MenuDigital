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

/**
 * Mesa (o "llevar", o "mostrador") con pedidos de ejemplo para la cocina y la caja.
 * minAgo: hace cuántos minutos se pidió; billMinAgo: si ya avisaron a caja.
 */
export interface StaffSeedTable {
  table: string
  billMinAgo?: number
  /** Llamado al mesero de ejemplo: hace cuántos segundos y el motivo (id de waiterReasons). */
  callSecAgo?: number
  callReason?: string
  comandas: {
    number: number
    /** null = "Teléfono {device}". */
    name: string | null
    device?: number
    phone?: string
    minAgo: number
    status: string
    note?: string
    items: { dishId: string; quantity: number; sideId?: string; extraIds?: string[] }[]
  }[]
}

/** Barra de un gráfico del panel: color es un token de color. */
export interface PanelBar {
  label: string
  value: number
  extra?: string
  color: string
}

export interface PanelDemo {
  kpis: { label: string; value: string; detail?: string }[]
  /** Filas de tarjetas con barras (título, unidad opcional y barras). */
  rows: { title: string; unit?: string; bars: PanelBar[] }[][]
  complaint: { title: string; body: string }
  /** P4c: el personal de ejemplo y su rol. */
  people: { name: string; role: string }[]
  /** P4c: registro de acciones con PIN del dueño (de ejemplo). */
  pinLog: string[]
  /** Reseñas: la queja de ejemplo del día (la misma del Resumen), calificación rápida sin texto. */
  sampleComplaint: { dishId: string; author: string; rating: number; time: string }
  /** P4b: enlaces para redes; `src` es el ?src= que guarda el origen del pedido. */
  links: { label: string; src: string }[]
}

/** Textos de interfaz. Se tipan a partir del JSON para que falte uno = error de TypeScript. */
export type Texts = (typeof restaurantJson)['texts']

export interface RestaurantConfig {
  id: string
  name: string
  /** small: versión liviana para el encabezado (la genera `npm run images`). */
  logo: { webp: string; small?: string; png: string; alt: string }
  colors: Record<ColorToken, string>
  currency: { symbol: string; locale: string }
  /**
   * Propina voluntaria en "Tu cuenta": porcentajes que se ofrecen y el que
   * viene marcado (sugerida). Además siempre están "Otro monto" y "Sin propina".
   */
  tip: { percents: number[]; suggested: number }
  /**
   * Calificación en "Tu cuenta": con hasta `perDishMax` platos se califica cada
   * uno con estrellas (va a las reseñas); con más, una sola pregunta "¿Todo estuvo rico?".
   */
  ratings: { perDishMax: number }
  /** ids de mesa válidos (lo que va en /m/:mesa). */
  tables: string[]
  /** Dirección pública de la app (la de los QR de las placas, `npm run qr`). */
  publicUrl: string
  whatsapp: { number: string; message: string }
  /** Página web para llevar (W1 Inicio y W9 Domicilio). */
  web: {
    /** Foto de portada del inicio. */
    cover: string
    /** Dirección del local; vacía = "Dirección por confirmar". */
    address: string
    /** Link de "Cómo llegar" (Google Maps). */
    mapsUrl: string
    /** Calificación y reseñas de Google (de ejemplo hasta conectar el perfil real). */
    google: {
      rating: number
      count: number
      url: string
      /** Link para dejar una reseña (W10b). Hoy es una búsqueda: cambiarlo por el del perfil real. */
      reviewUrl: string
      reviews: { text: string; when: string }[]
    }
    /** Costo de envío a domicilio (W9, todavía no activo). */
    deliveryFee: number
    /** Dígitos del WhatsApp sin código de país (Nicaragua: 8). */
    phoneDigits: number
    /** Orígenes válidos de ?src= (Instagram, Facebook, Google, WhatsApp). */
    sources: string[]
  }
  schedule: { timezone: string; ranges: ScheduleRange[] }
  ordering: {
    maxItemsPerComanda: number
    comandaPrefix: string
    firstComandaNumber: number
    /** Número de "Teléfono N" de este dispositivo si no pone nombre. */
    myDeviceNumber: number
  }
  /**
   * Avisos del sistema (con permiso del cliente) cuando su orden pasa a estos
   * pasos. "recibida" no hace falta: pasa al instante de enviar.
   */
  notifications: { statuses: string[] }
  /** Tiempos en milisegundos (salvo readyEstimateMin y etaRangeMin, en minutos). */
  timings: {
    /** Margen del rango de hora estimada: "7:57 – 8:02 pm". */
    etaRangeMin: number
    /** W0 Bienvenida de la web: se quita sola después de este tiempo. */
    webWelcomeMs: number
    /** W7 Confirmación: pasa sola al seguimiento después de este tiempo. */
    webConfirmMs: number
    /** Avance automático de "Los más vendidos". */
    carouselMs: number
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
  /** Nombres del personal (de ejemplo): mesero, cajera, cocina y dueño. */
  staff: { waiter: string; cashier: string; cook: string; owner: string }
  /**
   * Demo de las pantallas del personal (cocina, caja, panel) en el mismo navegador.
   * heartbeatMs: cada cuánto la pantalla avisa que está abierta; liveWithinMs: hasta
   * cuándo se la considera abierta; pollMs: cada cuánto se revisan los cambios de otra
   * pestaña; lateMin: minutos desde el pedido para marcarlo "tarde"; seedsMaxAgeMin:
   * después de esto los pedidos de ejemplo se vuelven a crear.
   */
  staffDemo: { heartbeatMs: number; liveWithinMs: number; pollMs: number; lateMin: number; seedsMaxAgeMin: number }
  waiterReasons: WaiterReasonOption[]
  demo: {
    tableMates: DemoTableMate[]
    paymentMethod: string
    /** Pedidos de ejemplo de la cocina y la caja (los nombres son de ejemplo). */
    staffSeeds: StaffSeedTable[]
    /** Números de ejemplo del panel del dueño (P4). */
    panel: PanelDemo
  }
  texts: Texts
}

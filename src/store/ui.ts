import { create } from 'zustand'

/** Aviso para mostrar al volver al menú (ej. después de agregar desde el detalle). */
export interface Flash {
  lineId: string
  title: string
  body: string
}

interface UiState {
  flash: Flash | null
  setFlash: (flash: Flash) => void
  takeFlash: () => Flash | null
  /** La portada está abierta (el botón flotante del mesero no se muestra). */
  welcomeOpen: boolean
  setWelcomeOpen: (open: boolean) => void
}

/** Estado de interfaz que no se guarda (vive solo mientras la pestaña está abierta). */
export const useUi = create<UiState>()((set, get) => ({
  flash: null,
  setFlash: (flash) => set({ flash }),
  welcomeOpen: false,
  setWelcomeOpen: (welcomeOpen) => set({ welcomeOpen }),
  takeFlash: () => {
    const { flash } = get()
    if (flash) set({ flash: null })
    return flash
  },
}))

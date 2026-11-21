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
}

/** Estado de interfaz que no se guarda (vive solo mientras la pestaña está abierta). */
export const useUi = create<UiState>()((set, get) => ({
  flash: null,
  setFlash: (flash) => set({ flash }),
  takeFlash: () => {
    const { flash } = get()
    if (flash) set({ flash: null })
    return flash
  },
}))

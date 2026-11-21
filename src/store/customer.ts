import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { restaurant } from '../lib/catalog'
import { safeLocalStorage } from './tableStore'

/**
 * Datos del cliente de la web para llevar (W5 Tus datos). No hay cuenta: se
 * recuerdan en este teléfono para la próxima vez, aparte del pedido (que se
 * borra al terminar).
 */
interface CustomerState {
  name: string
  /** Solo dígitos: "88880000". */
  phone: string
  setName: (name: string) => void
  setPhone: (phone: string) => void
}

export const useCustomer = create<CustomerState>()(
  persist(
    (set) => ({
      name: '',
      phone: '',
      setName: (name) => set({ name }),
      setPhone: (phone) => set({ phone: phone.replace(/\D/g, '').slice(0, restaurant.web.phoneDigits) }),
    }),
    { name: `${restaurant.id}:web:cliente`, storage: safeLocalStorage },
  ),
)

/** "88880000" → "8888 0000" (de a 4 dígitos, como se escribe en Nicaragua). */
export const formatPhone = (digits: string) => digits.replace(/(\d{4})(?=\d)/g, '$1 ')

export const isValidName = (name: string) => name.trim().length >= 2
export const isValidPhone = (digits: string) => digits.length === restaurant.web.phoneDigits

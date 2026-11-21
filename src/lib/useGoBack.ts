import { useNavigate } from 'react-router'

/**
 * Vuelve a la pantalla anterior si se llegó navegando dentro de la app;
 * si se abrió directo (link compartido, recarga), va a `fallback`.
 */
export function useGoBack(fallback: string) {
  const navigate = useNavigate()
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }
}

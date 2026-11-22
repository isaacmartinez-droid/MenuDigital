import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'

// Fuentes self-hosted, solo el subconjunto latino y los pesos que se usan.
import '@fontsource/figtree/latin-400.css'
import '@fontsource/figtree/latin-500.css'
import '@fontsource/figtree/latin-600.css'
import '@fontsource/figtree/latin-700.css'
import '@fontsource/caveat/latin-700.css'
import './theme/index.css'

import { applyTheme } from './theme/applyTheme'
import { restaurant } from './lib/catalog'
import { prefetchScreens, router } from './router'
import { registerNotificationWorker } from './lib/notifications'
// Agotados que marca la cocina: se aplican al menú antes de dibujar.
import './store/availability'

applyTheme(restaurant)
// Avisos del seguimiento: al tocar uno, la app va a esa orden sin recargar.
registerNotificationWorker((url) => void router.navigate(url))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

prefetchScreens()

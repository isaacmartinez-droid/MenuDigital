import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Precarga las fuentes del texto (Figtree 400, 600 y 700, solo latín) desde el HTML,
 * en paralelo con el CSS: sin esto el navegador las descubre recién al leer el CSS y
 * el primer texto tarda más en verse. Caveat (número de comanda) no: se usa poco y
 * se baja solo cuando aparece.
 */
function preloadFonts(): Plugin {
  const wanted = /figtree-latin-(400|600|700)-normal-[\w-]+\.woff2$/
  return {
    name: 'precarga-fuentes',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const fonts = Object.keys(ctx.bundle ?? {}).filter((file) => wanted.test(file))
        return fonts.map((file) => ({
          tag: 'link',
          attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${file}`, crossorigin: '' },
          injectTo: 'head',
        }))
      },
    },
  }
}

/**
 * La foto de portada del inicio web es lo más grande de la primera pantalla. En una app
 * de una sola página se descubriría recién al correr el JavaScript; este script en el HTML
 * la pide desde el principio, y solo si se abre el inicio (no en la mesa ni en el menú).
 */
function preloadCover(): Plugin {
  const { web } = JSON.parse(readFileSync('src/config/restaurant.json', 'utf8')) as { web: { cover: string } }
  return {
    name: 'precarga-portada',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'script',
        children: `if(location.pathname==='/'){var l=document.createElement('link');l.rel='preload';l.as='image';l.href=${JSON.stringify(web.cover)};l.fetchPriority='high';document.head.appendChild(l)}`,
        injectTo: 'head-prepend',
      },
    ],
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadFonts(), preloadCover()],
  build: {
    rollupOptions: {
      output: {
        // Las librerías (React, React Router, Zustand, íconos) en un solo paquete, que cambia
        // poco y queda en caché entre versiones. El código de la app lo reparte Vite.
        // La librería de QR solo la usa el panel (Mesas y QR): va con él, no en vendor.
        manualChunks(id) {
          if (/node_modules\/(qrcode|dijkstrajs|encode-utf8)\//.test(id)) return undefined
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
})

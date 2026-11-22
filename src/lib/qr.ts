import { create } from 'qrcode'
import { restaurant } from './catalog'

/**
 * QR de mesa con la marca, igual que las placas de `npm run qr`: módulos redondeados
 * en verde, ojos con el azul del logo y el logo al centro (corrección H, 30 %: el
 * logo no impide leerlo). Devuelve el SVG como texto.
 * `logoHref`: la dirección del logo, o un data: URI para descargarlo y que se vea
 * sin conexión.
 */
export function qrSvg(text: string, logoHref: string = restaurant.logo.png): string {
  const { colors } = restaurant
  const qr = create(text, { errorCorrectionLevel: 'H' })
  const n = qr.modules.size
  const dark = (r: number, c: number) => qr.modules.data[r * n + c] === 1
  const quiet = 4
  const size = n + quiet * 2
  const eyes = [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ]
  const inEye = (r: number, c: number) => eyes.some(([er, ec]) => r >= er && r < er + 7 && c >= ec && c < ec + 7)
  let box = Math.round(n * 0.2)
  if (box % 2 === 0) box += 1
  const start = (n - box) / 2
  const inLogo = (r: number, c: number) => r >= start && r < start + box && c >= start && c < start + box

  const parts: string[] = []
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!dark(r, c) || inEye(r, c) || inLogo(r, c)) continue
      parts.push(`<rect x="${c + quiet + 0.03}" y="${r + quiet + 0.03}" width="0.94" height="0.94" rx="0.3"/>`)
    }
  }
  const eyeShapes = eyes
    .map(([r, c]) => {
      const x = c + quiet
      const y = r + quiet
      return (
        `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.7" fill="none" stroke="${colors.verde}" stroke-width="1"/>` +
        `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.9" fill="${colors['azul-logo']}"/>`
      )
    })
    .join('')
  const logo =
    `<rect x="${start + quiet - 0.4}" y="${start + quiet - 0.4}" width="${box + 0.8}" height="${box + 0.8}" rx="1.4" fill="#fff"/>` +
    `<image href="${logoHref}" x="${start + quiet + 0.3}" y="${start + quiet + 0.3}" width="${box - 0.6}" height="${box - 0.6}" preserveAspectRatio="xMidYMid meet"/>`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="geometricPrecision">` +
    `<title>${text}</title><rect width="${size}" height="${size}" fill="#fff"/>` +
    `<g fill="${colors.verde}">${parts.join('')}</g>${eyeShapes}${logo}</svg>`
  )
}

/** Baja el QR como mesa-<n>.svg, con el logo adentro (data: URI). */
export async function downloadQr(text: string, fileName: string): Promise<void> {
  let logo: string = restaurant.logo.png
  try {
    const blob = await (await fetch(restaurant.logo.png)).blob()
    logo = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } catch {
    // Sin el logo embebido igual se puede escanear.
  }
  const url = URL.createObjectURL(new Blob([qrSvg(text, logo)], { type: 'image/svg+xml' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.append(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** "https://x.vercel.app/m/5" → "x.vercel.app/m/5" */
export const prettyUrl = (url: string) => url.replace(/^https?:\/\//, '')

/** Dirección pública de la app, sin barra final. */
export const publicBase = () => restaurant.publicUrl.replace(/\/$/, '')

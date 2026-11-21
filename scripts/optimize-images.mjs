// Genera versiones livianas de las fotos de platos para datos prepago.
// Uso: npm run images
//
// Por cada public/img/<nombre>.webp|.jpg|.png (que no sea el logo ni una miniatura):
//   public/img/<nombre>.webp      800 px, WebP calidad 78 (detalle del plato)
//   public/img/<nombre>-400.webp  400 px, WebP calidad 72 (listas y carrusel)
// La app pide la de 400 px donde la foto es chica y la de 800 px en el detalle.
//
// Y del logo (public/img/logo.png):
//   public/img/logo-192.webp      192 px de ancho, para el encabezado (se ve de 64 px)
//   public/img/icon-32.png        ícono de la pestaña
//   public/img/icon-180.png       ícono al agregar la app a la pantalla de inicio (iPhone)
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const dir = path.resolve('public/img')
const files = await readdir(dir)
const sources = files.filter(
  (f) => /\.(webp|jpe?g|png)$/i.test(f) && !/^(logo|icon)[.-]/i.test(f) && !/-400\.webp$/i.test(f),
)

for (const file of sources) {
  const input = path.join(dir, file)
  const base = file.replace(/\.(webp|jpe?g|png)$/i, '')
  const full = path.join(dir, `${base}.webp`)
  const thumb = path.join(dir, `${base}-400.webp`)
  const source = await sharp(input).toBuffer()

  if (!/\.webp$/i.test(file)) {
    await sharp(source).resize({ width: 800, height: 800, fit: 'cover' }).webp({ quality: 78 }).toFile(full)
  }
  await sharp(source).resize({ width: 400, height: 400, fit: 'cover' }).webp({ quality: 72 }).toFile(thumb)

  const kb = async (p) => `${Math.round((await stat(p)).size / 1024)} KB`
  console.log(`${base}: ${await kb(full)} → miniatura ${await kb(thumb)}`)
}

// Logo: versión chica para el encabezado e íconos (fondo blanco, con aire alrededor).
if (files.includes('logo.png')) {
  const logo = path.join(dir, 'logo.png')
  await sharp(logo).resize({ width: 192 }).webp({ quality: 82 }).toFile(path.join(dir, 'logo-192.webp'))
  for (const size of [32, 180]) {
    const inner = Math.round(size * (size > 64 ? 0.84 : 1))
    const mark = await sharp(logo).resize({ width: inner, height: inner, fit: 'contain', background: '#ffffff' }).toBuffer()
    await sharp({ create: { width: size, height: size, channels: 3, background: '#ffffff' } })
      .composite([{ input: mark, gravity: 'center' }])
      .png({ compressionLevel: 9, palette: true })
      .toFile(path.join(dir, `icon-${size}.png`))
  }
  const kb = async (p) => `${Math.round((await stat(path.join(dir, p))).size / 1024)} KB`
  console.log(`logo: encabezado ${await kb('logo-192.webp')}, íconos ${await kb('icon-32.png')} y ${await kb('icon-180.png')}`)
}

// Genera versiones livianas de las fotos de platos para datos prepago.
// Uso: npm run images
//
// Por cada public/img/<nombre>.webp|.jpg|.png (que no sea el logo ni una miniatura):
//   public/img/<nombre>.webp      800 px, WebP calidad 78 (detalle del plato)
//   public/img/<nombre>-400.webp  400 px, WebP calidad 72 (listas y carrusel)
// La app pide la de 400 px donde la foto es chica y la de 800 px en el detalle.
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const dir = path.resolve('public/img')
const files = await readdir(dir)
const sources = files.filter(
  (f) => /\.(webp|jpe?g|png)$/i.test(f) && !/^logo\./i.test(f) && !/-400\.webp$/i.test(f),
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

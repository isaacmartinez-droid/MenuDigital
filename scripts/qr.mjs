// Genera los QR con la marca del restaurante y las placas para imprimir:
//   npm run qr
// Lee src/config/restaurant.json (publicUrl, mesas, colores, logo y textos.qr) y escribe en qr/:
//   mesa-<n>.svg          QR de cada mesa (link limpio, el que va en el local)
//   llevar.svg            QR de la web para llevar
//   placas-mesas.html     una placa por mesa, dos por hoja carta (abrir e imprimir)
//   hoja-demo.html        Mesa 5 y Para llevar con ?forzar=abierto (la mesa, también mesa-nueva
//                         y pago-rapido), para mostrarle al cliente
//   demo-mesa-5.svg, demo-llevar.svg
// Los QR usan corrección de errores H (30 %): el logo del centro no impide leerlos.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const config = JSON.parse(readFileSync(join(root, 'src/config/restaurant.json'), 'utf8'))
const { colors, publicUrl, tables, name, texts } = config
const t = texts.qr
const out = join(root, 'qr')
mkdirSync(out, { recursive: true })

const base = publicUrl.replace(/\/$/, '')
const fill = (template, vars) => template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
const dataUri = (file, type) => `data:${type};base64,${readFileSync(join(root, file)).toString('base64')}`
const logo = dataUri(`public${config.logo.png}`, 'image/png')

/** QR como SVG: módulos redondeados en verde, ojos con el azul del logo y el logo al centro. */
function qrSvg(text, { withLogo = true } = {}) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'H' })
  const n = qr.modules.size
  const dark = (r, c) => qr.modules.data[r * n + c] === 1
  const quiet = 4
  const size = n + quiet * 2
  const eyes = [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ]
  const inEye = (r, c) => eyes.some(([er, ec]) => r >= er && r < er + 7 && c >= ec && c < ec + 7)
  // Hueco del logo: un cuadrado impar centrado de ~20 % del lado.
  let box = Math.round(n * 0.2)
  if (box % 2 === 0) box += 1
  const start = (n - box) / 2
  const inLogo = (r, c) => withLogo && r >= start && r < start + box && c >= start && c < start + box

  const parts = []
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
  const logoShape = withLogo
    ? `<rect x="${start + quiet - 0.4}" y="${start + quiet - 0.4}" width="${box + 0.8}" height="${box + 0.8}" rx="1.4" fill="#fff"/>` +
      `<image href="${logo}" x="${start + quiet + 0.3}" y="${start + quiet + 0.3}" width="${box - 0.6}" height="${box - 0.6}" preserveAspectRatio="xMidYMid meet"/>`
    : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="geometricPrecision">` +
    `<title>${text}</title><rect width="${size}" height="${size}" fill="#fff"/>` +
    `<g fill="${colors.verde}">${parts.join('')}</g>${eyeShapes}${logoShape}</svg>`
  )
}

const pretty = (url) => url.replace(/^https?:\/\//, '')
const font = (weight) =>
  `@font-face{font-family:Figtree;font-weight:${weight};src:url(${dataUri(`node_modules/@fontsource/figtree/files/figtree-latin-${weight}-normal.woff2`, 'font/woff2')}) format('woff2')}`

/** Una placa: franja verde con el logo, título, QR, instrucciones y link. */
function placa({ title, url, lines, note, demo = false }) {
  return `<article class="placa">
  <header><span class="logo"><img src="${logo}" alt="${config.logo.alt}"></span>${demo ? `<span class="demo">${t.demoTitle}</span>` : ''}</header>
  <h1>${title}</h1>
  <div class="qr">${qrSvg(url)}</div>
  <p class="scan"><strong>${lines[0]}</strong><br>${lines[1]}</p>
  <p class="note">${note}</p>
  <p class="url">${pretty(url)}</p>
</article>`
}

function page(titleText, placas, footer = '') {
  const sheets = []
  // Dos placas por hoja; la nota va dentro de cada hoja (afuera se imprimiría en una página aparte).
  const pie = footer ? `<p class="pie">${footer}</p>` : ''
  for (let i = 0; i < placas.length; i += 2) sheets.push(`<section class="hoja">${placas.slice(i, i + 2).join('')}${pie}</section>`)
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titleText} · ${name}</title>
<style>
${font(400)}${font(700)}
@page{size:letter portrait;margin:0}
*{box-sizing:border-box;margin:0}
body{font-family:Figtree,system-ui,sans-serif;color:${colors.texto};background:#e9e4dc}
.hoja{position:relative;width:21.59cm;height:27.94cm;margin:0 auto 1cm;background:#fff;display:flex;gap:0.8cm;justify-content:center;align-items:flex-start;padding-top:2.2cm;page-break-after:always;break-after:page}
.placa{width:9.6cm;height:15.2cm;border:1.5px dashed #c9bfb0;border-radius:0.5cm;overflow:hidden;display:flex;flex-direction:column;align-items:center;text-align:center;background:${colors.fondo}}
header{position:relative;width:100%;height:3.1cm;background:${colors.verde};display:flex;align-items:center;justify-content:center}
.logo{display:block;background:#fff;border-radius:0.35cm;padding:0.18cm 0.3cm}
.logo img{display:block;height:2.2cm;width:auto}
.demo{position:absolute;top:0.35cm;right:0.35cm;background:${colors.ambar};color:${colors['texto-sobre-ambar']};font-weight:700;font-size:9pt;padding:0.08cm 0.3cm;border-radius:99px}
h1{margin-top:0.45cm;font-size:28pt;line-height:1;font-weight:700}
.qr{margin-top:0.4cm;width:6.6cm;height:6.6cm;background:#fff;border-radius:0.4cm;padding:0.15cm;box-shadow:0 0 0 1px ${colors.borde}}
.qr svg{display:block;width:100%;height:100%}
.scan{margin-top:0.4cm;font-size:12.5pt;line-height:1.3}
.scan strong{color:${colors.verde}}
.note{margin-top:0.2cm;font-size:9pt;color:${colors['texto-2']}}
.url{margin-top:auto;margin-bottom:0.35cm;font-size:7.5pt;color:${colors['texto-2']}}
.pie{position:absolute;left:1.5cm;right:1.5cm;top:18.2cm;font-size:9pt;color:${colors['texto-2']};text-align:center}
@media print{body{background:#fff}.hoja{margin:0}}
</style></head><body>
${sheets.join('\n')}
</body></html>`
}

const tableUrl = (mesa) => `${base}/m/${mesa}`
const takeoutUrl = `${base}/`
const tableLines = [t.scan, t.scanTable]
const takeoutLines = [t.scan, t.takeoutScan]

// QR sueltos
for (const mesa of tables) writeFileSync(join(out, `mesa-${mesa}.svg`), qrSvg(tableUrl(mesa)))
writeFileSync(join(out, 'llevar.svg'), qrSvg(takeoutUrl))

// Placas de todas las mesas (link limpio)
writeFileSync(
  join(out, 'placas-mesas.html'),
  page(
    'Placas de mesa',
    tables.map((mesa) =>
      placa({ title: fill(t.table, { mesa }), url: tableUrl(mesa), lines: tableLines, note: t.noApp }),
    ),
    t.cut,
  ),
)

// Hoja de demo: Mesa 5 (empieza de cero en cada escaneo y caja cobra a los 5 s) y Para llevar,
// abiertas a cualquier hora
const demoTable = tables.includes('5') ? '5' : tables[0]
const demoTableUrl = `${tableUrl(demoTable)}?forzar=mesa-nueva&forzar=abierto&forzar=pago-rapido`
const demoTakeoutUrl = `${base}/?forzar=abierto`
writeFileSync(join(out, `demo-mesa-${demoTable}.svg`), qrSvg(demoTableUrl))
writeFileSync(join(out, 'demo-llevar.svg'), qrSvg(demoTakeoutUrl))
writeFileSync(
  join(out, 'hoja-demo.html'),
  page(
    'Demo',
    [
      placa({ title: fill(t.table, { mesa: demoTable }), url: demoTableUrl, lines: tableLines, note: t.noApp, demo: true }),
      placa({ title: t.takeoutTitle, url: demoTakeoutUrl, lines: takeoutLines, note: t.takeoutNote, demo: true }),
    ],
    t.demoNote,
  ),
)

console.log(`QR generados en qr/ para ${base} (${tables.length} mesas, web y hoja de demo).`)

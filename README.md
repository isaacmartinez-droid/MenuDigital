# Menú digital · pedidos en mesa

Plantilla frontend para que el cliente pida desde la mesa escaneando un QR. El primer
restaurante es **Fritanga Nica** (Managua). Hoy todo se simula en el navegador: no hay
backend ni pedidos reales.

React + Vite + TypeScript · Tailwind CSS v4 · React Router · Zustand · lucide-react.

## Cómo correrla

```bash
npm install
npm run dev        # http://localhost:5173 → abre la Mesa 5
npm run build      # verifica tipos y genera dist/
npm run lint
npm run preview    # sirve el build de producción
```

Cada mesa tiene su URL: `/m/5` es la Mesa 5 (es lo que va en el QR). `/` redirige a `/m/5`
para la demo. Una mesa que no está en la config muestra "Este QR no es válido".

En desarrollo, `/componentes` muestra el muestrario de componentes base.

## Flags de la demo

Se agregan a cualquier URL y quedan activos mientras la pestaña esté abierta.

| Flag | Qué hace |
|---|---|
| `?forzar=cerrado` | Fuera de horario (M8): se ve el menú, sin + ni barra de pedido. Si la mesa ya pidió, siguen "Llamar al mesero" y "Ya vamos a pagar"; lo que no se puede es pedir algo más. |
| `?forzar=abierto` | Abierto aunque sea fuera de horario (útil para presentar de día). |
| `?forzar=agotado` | Sobre la comanda en curso, sale la hoja "Se acabó el maduro" (M4g). Se usa una vez. |
| `?forzar=ninguno` | Quita todos los forzados y vuelve al horario real. |
| `?compas=0` | Sin compañeros de mesa simulados (Carlos y Teléfono 3). Por defecto están. |
| `?dia=martes` | El menú hace de cuenta que hoy es ese día, para ver los combos del día (`?dia=jueves`, `?dia=sabado` o `?dia=0`…`6`, con 0 = domingo). `?dia=hoy` vuelve al día real. |

Sin señal (M9) no necesita flag: en Chrome, DevTools → Network → **Offline**.

Para empezar de cero: cerrar la pestaña, o borrar el almacenamiento del sitio.

## Recorrido de la demo

1. `/m/5?forzar=abierto` → bienvenida (solo la primera vez): muestra la mesa y pide el nombre
   (opcional) → **Entrar al menú**.
2. **+** agrega con el acompañante por defecto; la foto abre el detalle.
3. **Ver pedido** → nombre opcional → **Enviar a la cocina** → hoja "¿Enviamos tu pedido?":
   **Sí, enviar** (va directo, sin mesero) o **Pedir algo más**, que vuelve al menú con el
   mismo pedido abierto para que salga todo junto en una sola comanda.
4. Seguimiento: Procesando → En el comal → ¡Ya está! → Entregada (tiempos en la config).
5. **Llamar al mesero**, **Pedir algo más** (otra comanda, misma cuenta) o **Ya vamos a pagar**.
6. Cuenta de la mesa por persona → **Avisar a caja** → a los 5 s, cuenta pagada y la mesa se
   limpia (los próximos clientes no ven estos pedidos).

## Cambiar de restaurante

Todo lo del restaurante sale de dos JSON y de las fotos; no hace falta tocar componentes.

1. **`src/config/restaurant.json`**
   - `name`, `logo`, `colors` (se aplican como variables CSS al arrancar).
   - `tables`: ids de mesa válidos (lo que va después de `/m/`).
   - `schedule`: zona horaria y franjas (`days` 0 = domingo; horas `HH:mm`, pueden cruzar la medianoche).
   - `staff` (mesero y cajera de la demo), `waiterReasons`.
   - `whatsapp`: número y mensaje del botón "Escribinos" (`WhatsAppButton`). El QR de mesa no
     lo muestra; queda listo para la web para llevar.
   - `ordering`: límite de platos por envío, prefijo y número inicial de comanda.
   - `tip`: propina voluntaria de "Tu cuenta" (`percents` que se ofrecen y `suggested`, que
     viene marcada). Siempre están también "Otro monto" y "Sin propina".
   - `timings`: todos los tiempos simulados, en milisegundos.
   - `demo`: compañeros de mesa simulados y método de pago del recibo.
   - `texts`: **todos** los textos de la interfaz (voseo). Si falta uno, TypeScript da error.
2. **`src/data/menu.json`**: categorías, etiquetas, acompañantes, extras y platos
   (`price`, `tags`, `defaultSide`, `sides`, `extras`, `maxExtras`, `available`, `rating`,
   `reviews`, `replaceable` para lo que puede agotarse), más `bestSellers` y `suggestedDrinks`.
   - **Combos especiales:** los platos de la categoría `combos` salen en su sección (en el
     lugar que tenga la categoría en `categories`). Con `days` (0 = domingo … 6 = sábado) un
     combo solo se puede pedir esos días: ese día dice "Combo de hoy", va primero en su sección
     y además encabeza el carrusel "Los más vendidos"; los demás días se ve con "Solo los
     martes" y sin +. Sin `days`, está todos los días. Los combos de ejemplo están por
     confirmar con el local.
3. **Fotos en `public/img/`** (cuadradas, idealmente 800 × 800) y luego:
   ```bash
   npm run images   # genera <foto>-400.webp, la versión liviana para listas
   ```
   Si una foto no tiene versión de 400 px, se usa la original. Un plato sin `image` muestra
   el fondo gris de espera.

Los tipos están en `src/types/` (`restaurant.ts`, `menu.ts`, `order.ts`) y tienen la forma
que tendría la respuesta de una API.

## Conectar a una API real

- **`src/lib/api.ts`** concentra todo lo que hoy se simula: `sendComanda`, `fetchAccount`,
  `watchComanda`, `callWaiter`, `watchWaiterCall`, `requestBill`, `waitForPayment`,
  `rateDishes` y `replaceComponent`. Cada función indica el endpoint sugerido ("API real:").
  Cambiando su interior por `fetch` (o WebSocket para los estados), las pantallas no cambian.
- **`src/lib/catalog.ts`** es el único lugar que lee los JSON; ahí se reemplazarían por lo
  que devuelva el servidor.
- El estado por mesa vive en `src/store/` (carrito, comandas, cuenta), en localStorage con
  claves `<restaurante>:mesa:<id>:…`. Al cerrar la cuenta se borra todo lo de esa mesa.

## Publicar en Vercel

1. Subir el repo a GitHub e importarlo en [vercel.com/new](https://vercel.com/new).
2. Vercel detecta Vite; `vercel.json` ya define build (`npm run build`), salida (`dist`),
   las reescrituras para que `/m/5` y demás rutas funcionen al recargar, y caché de archivos.
3. Cada mesa queda en `https://<dominio>/m/<mesa>`: ese es el link para generar los QR.

Con la CLI: `npx vercel` (vista previa) y `npx vercel --prod`.

## Estructura

```
public/img/            fotos (WebP) y logo
scripts/               optimize-images.mjs (npm run images)
src/
  config/restaurant.json
  data/menu.json
  types/               interfaces de config, menú y pedidos
  theme/               tokens en @theme (index.css) y applyTheme.ts
  components/          Button, Tag, DishCard, QuantityStepper, CartBar, Toast, BottomSheet,
                       TrackingBar, Comanda, StarRating, Header, PaymentNotice, …
  screens/             una por pantalla (Welcome, Menu, DishDetail, Order, Tracking, Bill, Paid…)
  store/               cart, comandas, account (cuenta de mesa), ui
  lib/                 api, simulator, orderFlow, money, schedule, demoFlags, hooks…
```

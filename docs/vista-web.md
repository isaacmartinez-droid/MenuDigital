# Vista web · pedidos para llevar

Registro de lo que se construyó para la página web de **Fritanga Nica**, donde el cliente pide
para llevar desde su casa. Explica cada pantalla, por qué se decidió así, cómo comparte código
con la vista QR, la configuración y lo que falta. La vista de mesa está en
[vista-qr.md](vista-qr.md); cómo correr el proyecto, en el [README](../README.md).

- **Rama:** `plantilla-mesa` (la misma de la vista QR), todavía sin PR a `main`.
- **Estado:** en curso. Están hechos el celular (etapas a a d), la tablet (e) y la computadora
  (f); falta la ronda de correcciones (g).

## Índice

1. [Qué es y en qué se diferencia de la mesa](#1-qué-es-y-en-qué-se-diferencia-de-la-mesa)
2. [Forma de trabajo en la web](#2-forma-de-trabajo-en-la-web)
3. [Etapas](#3-etapas)
4. [Rutas](#4-rutas)
5. [El recorrido completo](#5-el-recorrido-completo)
6. [Pantallas](#6-pantallas)
7. [Cómo comparte código con la mesa](#7-cómo-comparte-código-con-la-mesa)
8. [Datos que se guardan](#8-datos-que-se-guardan)
9. [Configuración](#9-configuración)
10. [Modelo de datos: canal, WhatsApp y origen](#10-modelo-de-datos-canal-whatsapp-y-origen)
11. [Referencia de archivos](#11-referencia-de-archivos)
12. [Diferencias con el Figma y notas para corregir](#12-diferencias-con-el-figma-y-notas-para-corregir)
13. [Limitaciones conocidas](#13-limitaciones-conocidas)
14. [Bugs corregidos](#14-bugs-corregidos)
15. [Pendiente](#15-pendiente)
16. [Historial de commits](#16-historial-de-commits)

---

## 1. Qué es y en qué se diferencia de la mesa

En la web **no hay QR que identifique al cliente**, así que se piden nombre y WhatsApp y se
confirma por WhatsApp antes de cocinar. El cliente paga **al recoger**, en el local.

| | Mesa (QR) | Web para llevar |
|---|---|---|
| URL | `/m/5` | `/` |
| Quién es el cliente | La mesa (y un nombre opcional) | Nombre y WhatsApp, obligatorios |
| Bienvenida | Con botón "Entrar al menú" y nombre | Se quita sola a los 2 s, solo la primera vez |
| Antes de enviar | Hoja "¿Enviamos tu pedido?" | Tus datos y Resumen |
| Pago | En caja al terminar, con propina | Al recoger, sin propina |
| Ayuda | Llamar al mesero | Escribinos por WhatsApp |
| Seguimiento | Hasta "Entregada" | Hasta "Recogida", con el número para mostrar en caja |
| Cuenta | Cuenta de mesa compartida | No hay cuenta: cada pedido es aparte |

**Es la misma app y el mismo deploy.** La URL decide el canal: todo lo que empieza con `/m/`
es la mesa; el resto es la web. Cuando exista el backend, cada pedido llega con su canal
(`mesa`, `llevar` o `mostrador`) y el backend decide qué hacer: la mesa va directo a cocina; la
web queda "por confirmar" y avisa a caja y por WhatsApp.

**Celular, tablet y computadora.** La tablet (desde 768 px, ver 6.13) y la computadora (desde
1200 px, ver 6.14) tienen su propio layout. La mesa sigue siendo solo celular, aunque se abra en
una tablet o una computadora.

## 2. Forma de trabajo en la web

Rigen las reglas de la [sección 0 de vista-qr.md](vista-qr.md#0-forma-de-trabajo) (también en
`CLAUDE.md`), con una decisión del cliente para la web:

- **Lo compartido con la mesa** (tarjetas, carrusel, combos, detalle, notas, seguimiento) usa
  **lo ya corregido en la mesa**, no el diseño original del Figma. Así no hay dos versiones del
  mismo componente.
- **"Figma primero" aplica a lo propio de la web:** pantallas nuevas, textos de para llevar,
  promo del día, WhatsApp, datos, pago al recoger, tablet y computadora. Se pasan fieles al
  plugin de Figma, sin mejoras; las ideas de corrección se anotan en la
  [sección 12](#12-diferencias-con-el-figma-y-notas-para-corregir) y se hacen en la etapa g.
- **Excepción pedida por el cliente:** el seguimiento se corrigió antes de tiempo (línea de
  tiempo y textos nuevos, en mesa y web). Ver [6.9](#69-w8-y-w8b-seguimiento-para-llevar-trackingtsx-variante-takeout).

Las pantallas web no tienen capturas exportadas; la referencia es el plugin de Figma
(`Downloads\fritanga-nica-app-completa\code.js`), que arma la web con las mismas funciones que
la mesa (`cMenu({ web: true })`, `cPedido(llevar)`, `tracker(…, llevar)`) más las propias
(`cInicio`, `cDatos`, `cResumen`, `cConfirmacion`, `cSeguimientoLlevar`, `cCalificar`,
`cDomicilio`, `dInicio`…, `tInicio`…).

## 3. Etapas

| Etapa | Qué incluye | Estado |
|---|---|---|
| a | Canal para llevar, W0 Bienvenida, W1 Inicio, W3 Menú, W9 Domicilio | Hecha (`19a9e3a`) |
| b | W4 Tu pedido, W5 Tus datos, W6 Resumen y pago | Hecha (`e9de11f`) |
| c | W7 Confirmación, W8 y W8b Seguimiento | Hecha (`845f819`) |
| d | W10 Calificación y W10b reseña en Google, botón "Calificá tu comida" en W8b; promo con su precio y página no encontrada | Hecha |
| e | Tablet (T1–T5) | Hecha |
| f | Computadora (D1–D5) | Hecha |
| g | Revisión y correcciones | Pendiente |

## 4. Rutas

| Ruta | Pantalla | Archivo |
|---|---|---|
| `/` | W1 Inicio (con W0 Bienvenida la primera vez) | `Home.tsx`, `WebWelcome.tsx` |
| `/menu` | W3 Menú para llevar | `Menu.tsx` (compartido) |
| `/menu/plato/:dishId` | Detalle del plato, abierto encima del menú | `DishDetail.tsx` (compartido) |
| `/pedido` | W4 Tu pedido | `Order.tsx` (compartido) |
| `/datos` | W5 Tus datos | `CustomerData.tsx` |
| `/resumen` | W6 Resumen y pago; en computadora, D4 Datos y pago | `Summary.tsx`, `SummaryDesktop.tsx` |
| `/confirmacion/:comandaId` | W7 Confirmación | `Confirmation.tsx` |
| `/orden/:comandaId` | W8 y W8b Seguimiento | `Tracking.tsx` (compartido) |
| `/calificar/:comandaId` | W10 Calificación y W10b ¡Gracias! | `RateOrder.tsx` |
| `/domicilio` | W9 Domicilio (diseñado, no activo) | `Delivery.tsx` |
| cualquier otra (sin `/m/`) | "Página no encontrada" con **Ir al inicio** | `NotFound.tsx` |

- Todas cuelgan de `WebLayout`, que muestra W0 la primera vez, guarda el origen de la visita
  (`?src=`) y sigue en segundo plano los pedidos en curso.
- Los links se arman con `paths` (`lib/useMesa.ts`): con el id `llevar` dan las rutas web
  (`paths.menu('llevar')` → `/menu`) y con un número de mesa, las de la mesa.
- Antes `/` redirigía a `/m/5`; ahora es el inicio web (`RootRedirect.tsx` se borró).

## 5. El recorrido completo

```
(primera vez) W0 Bienvenida, 2 s
        │
W1 Inicio ──→ W3 Menú ──→ Detalle
   │            │
   │            └──→ W4 Tu pedido → W5 Tus datos → W6 Resumen → Confirmar pedido
   │                                                                  │
   └──→ W9 Domicilio (próximamente)                      W7 Confirmación (5 s)
                                                                      │
                                                 W8 Seguimiento → W8b Tu comida está lista
                                                                      │
                                                   W10 Calificá tu comida → W10b ¡Gracias! + Google
```

**Escribinos** por WhatsApp flota abajo a la derecha en el inicio, el menú y el seguimiento.

## 6. Pantallas

### 6.1 W0 Bienvenida (`WebWelcome.tsx`)

- Fondo verde, logo en tarjeta blanca, "Bienvenidos a", **"Fritanga Nica"** y "La fritanga de
  siempre, ahora en tu teléfono".
- Abajo, tres puntos (el primero ámbar) y "Solo la primera vez · tocá para entrar".
- **Se quita sola a los 2 s** (`timings.webWelcomeMs`), o antes al tocar en cualquier parte o
  con Enter, espacio o Esc.
- Sale **solo la primera vez en ese teléfono** (`localStorage`, `fritanga-nica:web:bienvenida`),
  aparte del pedido: no vuelve aunque se termine un pedido.
- Mientras está, lo de atrás queda inerte. *A diferencia de la mesa*, aquí se respetó el
  Figma: en la web no hace falta ver la mesa ni poner el nombre en la entrada.

### 6.2 W1 Inicio (`Home.tsx`)

- **Portada** de 440 px con foto (`web.cover`) y degradado oscuro abajo:
  - logo en tarjeta blanca arriba a la izquierda;
  - estado arriba a la derecha: "Abierto · hasta 10 pm" con punto verde, o "Cerrado · abrimos
    a las 4 pm" en rojo;
  - abajo, **"Fritanga Nica"**, "Carne asada al carbón, gallo pinto y maduro. Como la de
    siempre." y cinco estrellas con "4.8 · 120 reseñas en Google (ejemplo)".
- **¿Cómo lo querés?** Dos tarjetas:
  - **Para llevar** · "Recogés en el local" (marcada en verde) → menú;
  - **Domicilio** · "Próximamente" (en gris) → W9.
  - Debajo: "¿Estás en el local? Escaneá el QR de tu mesa: es más rápido."
- **Promo del día** (`PromoCard`): tarjeta verde con "Promo", "2 enchiladas por C$ 160",
  "Solo hoy, de 4 a 7 pm" y foto → menú. La promo es un plato real con su precio (ver 6.3).
- **Los más vendidos:** el mismo carrusel de la mesa, con **"Ver menú →"** a la derecha del
  título. Tocar una tarjeta abre el detalle; el **+** agrega el plato y lleva al menú, donde
  aparece "Agregaste… · Deshacer".
- **Lo que dicen en Google** ★ 4.8: tres reseñas en tarjetas de 280 px que se deslizan, con
  cinco estrellas, el texto y "Cliente de Google · hace 2 semanas"; abajo "Reseñas de ejemplo ·
  se cargan de Google" y **"Ver todas →"** (abre Google en otra pestaña).
- **Horario y ubicación:** "Horario · Todos los días · 4:00 pm a 10:00 pm" (se arma con
  `schedule`) y "Dónde estamos · Dirección por confirmar" con **Cómo llegar** (Google Maps).
- **Barra de abajo:** **Ver menú y pedir**. **Escribinos** flota encima.

### 6.3 W3 Menú para llevar (`Menu.tsx`, variante `takeout`)

Es el mismo menú de la mesa, con estos cambios:
- La pastilla del encabezado dice **"Para llevar"** en lugar de "Mesa 5".
- No hay portada de mesa ni píldora "Ya vamos a pagar".
- **Promo del día** arriba de "Los más vendidos", con "Hoy de 4 a 7 pm". Abre el detalle del
  plato de la promo (`promo.dishId` → **"Promo: 2 enchiladas", C$ 160**, en la categoría
  combos, con la etiqueta "Promo"), así **el carrito cobra lo mismo que anuncia la tarjeta**.
  Como es un plato del menú, también aparece en "Combos especiales" (en la mesa y en la web).
- **Escribinos** flotante, siempre.
- La barra de orden en curso, cuando está lista, dice "Tu orden FN-0142 está lista · pasá a
  recogerla".

Todo lo demás (buscador, pestañas, carrusel, combos del día, tarjetas tocables, + con
Deshacer, barra "Ver pedido") es igual a la mesa. Ver [vista-qr.md 4.2](vista-qr.md#42-menú-menutsx).

### 6.4 Detalle del plato (`DishDetail.tsx`)

Igual a la mesa; solo cambian los links (vuelve a `/menu` y edita líneas en `/pedido`).

### 6.5 W4 Tu pedido (`Order.tsx`, variante `takeout`)

- Subtítulo **"Para llevar"**.
- Sin "¿A nombre de quién?" (se pide en W5), sin el aviso de cuenta de mesa y sin la hoja
  "¿Enviamos tu pedido?" (la confirmación es el Resumen).
- Barra de abajo: **Continuar · C$ total** → W5.
- Igual a la mesa: platos con cantidad y "Con gallo pinto · cambiar", "+ Agregar más platos",
  "¿Algo para tomar?" y "Nota para la cocina" (de cada plato y para todo el pedido).

### 6.6 W5 Tus datos (`CustomerData.tsx`)

- Encabezado **"Tus datos" · "Para confirmar tu pedido"**.
- **Tu nombre** (ej.: Ana) y **Tu WhatsApp** (8888 0000), con la ayuda "Te escribimos para
  confirmar antes de cocinar."
  - El número se guarda solo con dígitos y se muestra de a 4 ("8888 0000"). Son 8 dígitos
    (`web.phoneDigits`), sin código de país.
  - Teclado numérico y autocompletado del teléfono y el nombre.
- Debajo: "No necesitás cuenta. Lo recordamos en este teléfono para la próxima."
- **Continuar** valida recién al tocarlo:
  - el campo con error queda en rojo (también con el foco) y con el mensaje debajo: "Escribí tu
    nombre: así sabemos de quién es el pedido." o "Revisá tu WhatsApp: son 8 dígitos.";
  - el cursor va al primer campo con error;
  - los mensajes están ligados al campo para los lectores de pantalla (`aria-invalid`,
    `aria-describedby`).
- Si no hay platos en el pedido, vuelve al menú.

### 6.7 W6 Resumen y pago (`Summary.tsx`)

- Encabezado **"Resumen" · "Para llevar · a nombre de Ana"**.
- **Lo que pediste:** "1× Enchilada · C$ 90", una línea por plato, y **Total**.
- **¿Cómo pagás?**
  - **Pagás al recoger** · "Efectivo o tarjeta en el local" (marcada);
  - **Tarjeta desde la app** y **Transferencia**, deshabilitadas con la etiqueta
    **Próximamente**.
- Barra de abajo: **Confirmar pedido · C$ total** (con el local cerrado: "Abrimos a las…").
- Al confirmar envía la comanda con canal `llevar`, nombre, WhatsApp y origen, y abre W7.
- **Protecciones:** sin platos vuelve al menú; sin datos válidos va a W5.
- **Errores:** si pasa el límite de platos o falla el envío (también sin señal), sale el aviso
  "No pudimos enviar tu pedido · Probá de nuevo en un momento. Tu pedido sigue guardado." y el
  cliente vuelve a confirmar. *A diferencia de la mesa*, no se envía solo al volver la señal.

### 6.8 W7 Confirmación (`Confirmation.tsx`)

- Encabezado de marca con "Para llevar" y título **"Recibimos tu orden"**.
- **Comanda "de papel":** "COMANDA · PARA LLEVAR", el número **FN-0142** escrito a mano
  (Caveat, grande), lo pedido con sus detalles (acompañante, extras, nota) y "Ana · pagás al
  recoger · C$ 310".
- "Te escribimos al WhatsApp para confirmar. Aquí te avisamos cuando esté listo."
- **Pasa sola al seguimiento a los 5 s** (`timings.webConfirmMs`), o antes con **Seguir mi
  pedido**. Reemplaza la entrada en el historial: "atrás" no vuelve a la confirmación.

### 6.9 W8 y W8b Seguimiento para llevar (`Tracking.tsx`, variante `takeout`)

**Arriba**, la misma tarjeta de la mesa: hora estimada en rango ("Lista entre 2:13 – 2:18 pm"),
título, texto y la **línea de tiempo** (`TrackingTimeline`) con **Recibida, Cocinando, Lista y
Recogida**, cada paso con su ícono (recibo, llama, bolsa, paquete) y su hora.

| Paso | Título · texto |
|---|---|
| Recibida | "Estamos procesando tu orden · Te escribimos al WhatsApp para confirmarla · la pediste a las…" |
| Cocinando | "Ya estamos cocinando tu pedido · En unos 15–20 min · la pediste a las…" |
| Lista (W8b) | "Tu comida está lista · Pasá a recogerla: te esperamos en caja con tu número" |
| Recogida | "¡Gracias por tu compra! · Esperamos verte pronto" |

*Corrección pedida por el cliente (en mesa y web):* el Figma usa una barra con checks y "En el
comal" / "¡Ya está!". Se cambió por la línea de tiempo con hora por paso y por "Cocinando" /
"Lista". No usar "en el comal" ni "¡Ya está!" en ningún texto.

**Debajo:**
- **Tu orden** (`TakeoutTicket`): "Mostrá este número al recoger", **FN-0142** a mano, la
  pastilla "Para llevar", lo pedido con sus detalles, la nota y "Ana · pagás al recoger · C$ 310".
- **Recogé en Fritanga Nica**, con la dirección y **Cómo llegar**.
- **W8b (lista):** el aviso ámbar compacto **"Pagás al recoger · No pagás nada ahora"**
  (`PaymentNotice takeout`).
- **Escribinos** flotante.
- Igual a la mesa: "¿Te avisamos en cada paso?", "Tus otras órdenes" y la hoja de plato
  agotado (`?forzar=agotado`).
- No hay "Pedir algo más", "Cuenta de la mesa" ni nada de la mesa.

**Avisos:** el pedido se sigue en segundo plano en cualquier pantalla web
(`useKitchenUpdates` en `WebLayout`). Con permiso, llegan "Ya estamos cocinando tu orden
FN-0142", "Tu orden FN-0142 está lista · Pasá a recogerla: te esperamos en caja." y "¡Gracias
por tu compra!". Al quedar lista, vibra y la pestaña dice "Tu comida está lista".

**Calificá tu comida:** cuando el pedido está listo o ya recogido, la barra de abajo lleva a
W10 (en lugar de "Escribinos", como en el Figma).

### 6.10 W10 Calificación y W10b ¡Gracias! (`RateOrder.tsx`)

Es la única vía para que quien pide para llevar deje reseña, porque no ve la placa del local.

**W10 "¿Qué tal estuvo?"** sigue la regla de la mesa (`ratings.perDishMax`, hoy 2):
- **Un plato:** igual al Figma: tarjeta con foto y nombre ("Tocá las estrellas" o "Calificaste
  con 5 estrellas"), cinco estrellas grandes (36 px) y **"Contanos más (opcional)"**. El
  comentario va en la reseña del plato.
- **Dos platos:** una tarjeta con estrellas por plato y un solo "Contanos más" (va como
  comentario general).
- **Más de dos:** **"¿Todo estuvo rico?"** con **Sí, todo rico** o **Algo no**; con "Algo no" se
  marcan los platos que no estuvieron bien (quedan con 2 estrellas), y "Contanos más".
- **Enviar calificación** se habilita al poner al menos una estrella o elegir una respuesta.

**W10b "¡Gracias!":**
- lo calificado (tarjeta y estrellas, solo lectura);
- aviso verde "Recibimos tu calificación · La cocina la ve hoy mismo. ¡Gracias por venir!";
- **"Dejá tu reseña en Google"** · "Una reseña allá hace que más gente nos encuentre. Te toma
  un minuto." con el botón **Dejar reseña en Google** (abre `web.google.reviewUrl` en otra
  pestaña);
- barra de abajo: **Volver al menú**.

**Datos:** las reseñas se guardan como las de la mesa (`fritanga-nica:resenas`, con el nombre
del cliente) y aparecen en "Lo que dicen" del plato. La orden queda marcada como calificada
(`fritanga-nica:web:calificadas`): si vuelve a entrar, ve W10b directamente.

### 6.11 Página no encontrada (`NotFound.tsx`)

Una dirección web que no existe muestra el logo, **"Página no encontrada"**, "La página que
buscás no existe o cambió de lugar." y **Ir al inicio**. Las direcciones de mesa (`/m/…`)
siguen mostrando "Este QR no es válido".

### 6.12 W9 Domicilio (`Delivery.tsx`)

- Encabezado **"Domicilio" · "Muy pronto"**, con Volver al inicio.
- Aviso azul "Pronto vas a poder pedir a domicilio · Por ahora pedí para llevar o escribinos por
  WhatsApp." (`NoticeBanner tone="pronto"`).
- Campos deshabilitados con ejemplos: **Dirección** ("De la rotonda Rubenia 2 c. al lago, casa
  esquinera portón verde") y **Referencia** ("Frente a la pulpería La Bendición").
- Lugar del mapa (gris con un pin) y **Costo de envío · C$ 50** (`web.deliveryFee`).
- Barra de abajo: **Próximamente**, deshabilitado.

### 6.13 Tablet (T1–T5)

Desde 768 px de ancho la web usa el layout de tablet del Figma (834 × 1194). Es la misma app y
las mismas rutas: cambia la disposición con la variante `tablet:` (ver sección 7).

| Pantalla | Qué cambia |
|---|---|
| **T1 Inicio** | Portada de 420 px con el logo más grande abajo a la izquierda, sin texto encima. Debajo, **"Fritanga Nica"** y "Abierto hoy · 4:00 pm a 10:00 pm". Promo con foto de 180 px, **los más vendidos en grilla de 3** y **dos reseñas lado a lado**. Barra de abajo: **Cómo llegar** y **Ver menú y pedir**. Como en el Figma, no tiene "¿Cómo lo querés?" ni la tarjeta de horario y ubicación. |
| **T2 Menú** | **Los más vendidos en grilla de 4** (en vez del carrusel) y **cada categoría en dos columnas**, con cada plato en su tarjeta. Promo con foto de 180 px. |
| **T3 Detalle** | **Ventana de 640 px** centrada sobre el menú oscurecido, con la foto arriba, **✕** para cerrar (también tocando afuera o con Esc) y el contador y "Agregar" al pie de la ventana. El menú no pierde su lugar. |
| **T4 Tu pedido** | Pedido, **"Tus datos"** (nombre y WhatsApp lado a lado, con "No necesitás cuenta. Te escribimos para confirmar antes de cocinar.") y **"¿Cómo pagás?"** en una sola pantalla. Subtítulo "Para llevar · pagás al recoger" y botón **Confirmar pedido**, que valida los datos y envía. |
| **T5 Confirmación** | "Recibimos tu orden" y el texto arriba; **la comanda de papel y el seguimiento en vivo lado a lado** (la tarjeta de estado con la línea de tiempo). No pasa sola al seguimiento, porque ya lo muestra. Abajo, **Cómo llegar** y **Escribinos**. |

Las demás pantallas (Tus datos, Resumen, Seguimiento, Calificación, Domicilio) no tienen diseño
de tablet: se ven como en celular, más anchas y con márgenes de 32 px.

**El detalle encima del menú (celular y tablet):** en la web el detalle es una ruta hija del
menú (`/menu/plato/:dishId`). El menú queda montado debajo (inerte para el teclado) y no
vuelve arriba al abrirlo ni al cerrarlo. En celular se ve igual que antes (pantalla completa);
en tablet es la ventana de T3. Al agregar, vuelve al menú con el aviso "Agregaste…".

### 6.14 Computadora (D1–D5)

Desde 1200 px la web usa el diseño de computadora (1440 px de ancho). Todas las pantallas
diseñadas llevan arriba la **barra de navegación** (`DesktopNav`): marca y estado del local,
**Menú · Promos · Cómo llegar · Horario**, la pastilla "Para llevar" y el botón de la pantalla
("Ver menú y pedir" en el inicio, **"Ver pedido · N · C$ total"** en el menú).

| Pantalla | Cómo quedó |
|---|---|
| **D1 Inicio** (`HomeDesktop.tsx`) | Portada en dos columnas: "Abierto hoy · …", **Fritanga Nica**, "Carne asada al carbón, gallo pinto y maduro. Pedí en línea y recogé en el local.", **Ver menú y pedir** y **Cómo llegar**, y la promo; a la derecha, la foto grande. **Los más vendidos en grilla de 4** con "Ver todo el menú →", **3 reseñas** de Google y tres tarjetas: **Horario**, **Dónde estamos** (con Cómo llegar) y **Escribinos** (WhatsApp con el número). |
| **D2 Menú** (`Menu.tsx`) | Tres columnas: **categorías** fijas a la izquierda (Promos, Los más vendidos y cada categoría, marcando la que se ve), los platos al centro (buscador, promo, más vendidos en grilla de 3 y categorías en dos columnas) y **"Tu pedido" fijo a la derecha** (`SideCart`): cada plato con su contador, "¿Un fresco de cacao?", total y **Continuar**. No hay barra abajo. |
| **D3 Detalle** | Ventana horizontal de 900 × 660: la foto a la izquierda y las opciones a la derecha (se desplazan por dentro), con el contador y "Agregar" al pie. |
| **D4 Datos y pago** (`SummaryDesktop.tsx`, en `/resumen`) | A la izquierda: **← Volver al menú**, **Tus datos** (nombre y WhatsApp lado a lado), "No necesitás cuenta. Lo recordamos en esta computadora para la próxima." y **¿Cómo pagás?**. A la derecha: el **Resumen** con cada plato y su detalle, total, "Para llevar · pagás al recoger", **Confirmar pedido** (valida los datos y envía) y "Te escribimos al WhatsApp para confirmar antes de cocinar." |
| **D5 Confirmación** | "Recibimos tu orden" grande y el texto; la comanda de papel y el seguimiento en vivo lado a lado, con **Cómo llegar** y **Escribinos** debajo del seguimiento. |

**Recorrido en computadora:** Inicio → Menú (el detalle se abre encima) → **Continuar** en el
carrito lateral → D4 (`/resumen`) → Confirmación. "Tu pedido" (`/pedido`) y "Tus datos"
(`/datos`) no hacen falta: el carrito y los datos están en esas pantallas.

**Pantallas sin diseño de computadora** (Tu pedido, Tus datos, Seguimiento, Calificación y
Domicilio): se ven como en tablet, centradas en 834 px, con su barra de abajo del mismo ancho.

**Cómo está hecho:** variante `desktop:` en `index.css` (desde 1200 px, solo dentro de `.web`;
`--container-app` pasa a 1440 px) y el hook `useIsDesktop()` (`lib/useMediaQuery.ts`) para las
pantallas que cambian de estructura (D1, D2, D4 y D5).

## 7. Cómo comparte código con la mesa

- **El id de la cuenta.** Las pantallas compartidas usan `useMesa()`, que devuelve el número de
  mesa en `/m/:mesa` y **`TAKEOUT` (`'llevar'`)** en la web (`lib/channel.ts`). Con ese id:
  - los stores (carrito y comandas) se guardan aparte: `fritanga-nica:llevar:…` en lugar de
    `fritanga-nica:mesa:5:…`;
  - `paths` arma los links del canal correcto;
  - cada pantalla pregunta `isTakeout(id)` para mostrar su variante.
- **Variantes en pantallas compartidas:** `Menu.tsx`, `Order.tsx` y `Tracking.tsx` tienen una
  rama `takeout`; `DishDetail.tsx` no necesita cambios.
- **Componentes que se ampliaron para la web:**
  - `Carousel`: prop `action` (el link "Ver menú →").
  - `NoticeBanner`: tono `pronto` (azul, para lo que no está activo).
  - `PaymentNotice`: prop `takeout` ("Pagás al recoger", compacto).
  - `WhatsAppButton`: ahora es flotante por sí mismo, encima de la barra de abajo
    (`--dock-h`).
- **Envío:** `submitCart(TAKEOUT, { name, phone, source })` (`lib/orderFlow.ts`). Para llevar
  no se suman los compañeros de mesa simulados y, sin señal, no queda en espera.
- **Seguimiento en segundo plano:** `useKitchenUpdates` (antes dentro de `MesaLayout`) pasó a
  `lib/useKitchenUpdates.ts`; lo usan `MesaLayout` y `WebLayout`.
- **Tablet:** la variante `tablet:` (`src/theme/index.css`) aplica desde 768 px y solo dentro
  de `.web` (la clase que pone `WebLayout`); ahí también `--container-app` pasa a 834 px, así
  la columna, las barras y los botones flotantes se ensanchan solos. La mesa no tiene `.web`:
  no cambia.
- **Piezas compartidas por W5, W6 y T4:** `CustomerFields` (nombre y WhatsApp, en una o dos
  columnas), `PayOptions` (¿Cómo pagás?), `checkCustomer` (`store/customer.ts`, valida y lleva
  el foco al campo con error) y `useConfirmTakeout` (`lib/useConfirmTakeout.ts`, envía y abre
  la confirmación).
- **`StatusCard`** (hora estimada, título y línea de tiempo) salió de `Tracking.tsx` y la usan el
  seguimiento y T5.
- **Lo que no usa la web:** `Welcome.tsx` (portada de mesa), `WaiterButton`, `Bill.tsx`,
  `Paid.tsx`, `TableSession`, propina y cuenta compartida.

## 8. Datos que se guardan

| Dato | Dónde | Clave |
|---|---|---|
| Pedido web (carrito, nota) | `localStorage` | `fritanga-nica:llevar:pedido` |
| Comandas web | `localStorage` | `fritanga-nica:llevar:comandas` |
| Servidor simulado de la web | `localStorage` | `fritanga-nica:llevar:servidor` |
| Nombre y WhatsApp del cliente | `localStorage` (no se borra con el pedido) | `fritanga-nica:web:cliente` |
| Bienvenida ya vista | `localStorage` | `fritanga-nica:web:bienvenida` |
| Origen de la visita (`?src=`) | `sessionStorage` | `fritanga-nica:web:origen` |
| "Ahora no" en los avisos | `sessionStorage` | `fritanga-nica:llevar:avisos` |
| Órdenes ya calificadas | `localStorage` | `fritanga-nica:web:calificadas` |
| Reseñas (compartidas con la mesa) | `localStorage` | `fritanga-nica:resenas` |

Para empezar de cero en la web: borrar los datos del sitio en el navegador.

## 9. Configuración

**`restaurant.json → web`:**

| Clave | Valor actual | Para qué |
|---|---|---|
| `cover` | `/img/combo-para-dos.webp` | Foto de la portada del inicio |
| `address` | `""` | Dirección del local; vacía muestra "Dirección por confirmar" |
| `mapsUrl` | búsqueda "Fritanga Nica Managua" en Google Maps | Cómo llegar |
| `google.rating`, `google.count` | 4.8 y 120 | Estrellas de la portada y de las reseñas (de ejemplo) |
| `google.url` | búsqueda en Google Maps | Ver todas → |
| `google.reviewUrl` | búsqueda en Google Maps (provisorio) | Dejar reseña en Google (W10b); cambiar por el link de reseña del perfil real |
| `google.reviews` | 3 reseñas de ejemplo (`text`, `when`) | Lo que dicen en Google |
| `deliveryFee` | 50 | Costo de envío en W9 |
| `phoneDigits` | 8 | Dígitos del WhatsApp (Nicaragua) |
| `sources` | `ig`, `fb`, `google`, `wa` | Orígenes válidos de `?src=` |

**`timings`:** `webWelcomeMs` 2000 (W0) y `webConfirmMs` 5000 (W7).

**`texts.web`:** los textos de la web (bienvenida, inicio, domicilio, datos, resumen,
confirmación, seguimiento, calificación y notificaciones para llevar). `texts.notFound` tiene
los de "Página no encontrada". Los textos compartidos siguen en sus
secciones (`menu`, `order`, `tracking`…).

**`menu.json → promo`** (opcional; sin promo no se muestra la tarjeta):

| Clave | Valor actual |
|---|---|
| `label` | Promo |
| `title` | 2 enchiladas por C$ 160 |
| `subtitle` | Hoy de 4 a 7 pm (en el menú) |
| `homeSubtitle` | Solo hoy, de 4 a 7 pm (en el inicio) |
| `image` | `/img/enchilada.webp` |
| `dishId` | `promo-2-enchiladas` (el plato de la promo, C$ 160, que abre en el menú) |

El precio de la promo es el del plato `promo-2-enchiladas`; si se cambia la promo, cambiar las
dos cosas juntas (texto de `promo` y plato).

## 10. Modelo de datos: canal, WhatsApp y origen

- **`Channel`** (`types/order.ts`): `mesa`, `llevar` o `mostrador` (este último, para cuando la
  caja tome pedidos).
- **`Comanda`** suma tres campos opcionales: `channel`, `phone` (solo dígitos) y `source`. Una
  comanda sin canal es de mesa.
- En la prueba quedó así: `FN-0142 · Ana · llevar · 88880000 · ig · C$ 310`.
- Para el backend (comentario en `sendComanda`): `POST /api/pedidos` con canal `llevar`, nombre,
  WhatsApp y origen; queda "por confirmar" hasta que caja escribe por WhatsApp.
- **Origen de la visita:** al entrar con `?src=ig` (o `fb`, `google`, `wa`), `WebLayout` lo
  guarda para la pestaña (`lib/source.ts`) y viaja con el pedido. Sirve para que el dueño vea
  qué red trae más pedidos; los links de Instagram, Facebook, Google y WhatsApp deberían llevar
  cada uno su `?src=`.

## 11. Referencia de archivos

**Nuevos:**

| Archivo | Qué es |
|---|---|
| `src/lib/channel.ts` | `TAKEOUT` e `isTakeout` |
| `src/lib/source.ts` | `captureSource` y `readSource` (origen `?src=`) |
| `src/lib/useKitchenUpdates.ts` | Sigue los pedidos en curso: notificaciones, vibración y título de la pestaña |
| `src/store/customer.ts` | `useCustomer` (nombre y WhatsApp), `formatPhone`, `isValidName`, `isValidPhone` |
| `src/components/PromoCard.tsx` | Tarjeta verde de la promo del día |
| `src/components/TakeoutTicket.tsx` | "Mostrá este número al recoger" del seguimiento |
| `src/screens/WebLayout.tsx` | Layout de la web: W0, origen y seguimiento en segundo plano |
| `src/screens/WebWelcome.tsx` | W0 Bienvenida |
| `src/screens/Home.tsx` | W1 Inicio |
| `src/screens/CustomerData.tsx` | W5 Tus datos |
| `src/screens/Summary.tsx` | W6 Resumen y pago |
| `src/screens/Confirmation.tsx` | W7 Confirmación |
| `src/screens/RateOrder.tsx` | W10 Calificación y W10b ¡Gracias! |
| `src/screens/NotFound.tsx` | Página no encontrada |
| `src/screens/Delivery.tsx` | W9 Domicilio |
| `src/components/CustomerFields.tsx` | Campos de nombre y WhatsApp (W5 y T4) |
| `src/components/PayOptions.tsx` | ¿Cómo pagás? (W6 y T4) |
| `src/components/StatusCard.tsx` | Tarjeta de estado de una orden (seguimiento y T5) |
| `src/lib/useConfirmTakeout.ts` | Confirmar el pedido para llevar (W6 y T4) |
| `src/lib/whatsapp.ts` | Link de "Escribinos" y el número legible (`whatsappDisplay`) |
| `src/lib/useMediaQuery.ts` | `useMediaQuery` y `useIsDesktop` (computadora) |
| `src/lib/hours.ts` | `scheduleLines` y `hoursOn` (horario del día) |
| `src/components/DesktopNav.tsx` | Barra de navegación de computadora |
| `src/components/SideCart.tsx` | "Tu pedido" fijo a la derecha del menú en computadora |
| `src/components/GoogleStars.tsx` | Cinco estrellas de Google |
| `src/screens/HomeDesktop.tsx` | D1 Inicio en computadora |
| `src/screens/SummaryDesktop.tsx` | D4 Datos y pago en computadora |

**Cambiados para la web:** `Menu.tsx` (detalle encima y grillas de tablet), `DishDetail.tsx`
(ventana), `Order.tsx`, `Tracking.tsx`, `Confirmation.tsx`, `MesaLayout.tsx`, `DishCard.tsx`
(`fluid` y `photoClassName` para grillas), `CartBar.tsx` (varias barras a la vez), `Header.tsx`
(subtítulo con contenido), `index.css` (variante `tablet:`),
`router.tsx`, `useMesa.ts` (`paths`), `storage.ts` (prefijo `llevar`), `orderFlow.ts`,
`api.ts`, `notifications.ts`, `combos.ts` (`bestSellersFor`), `reviews.ts` (ahora con
`reviewsToSend`, que antes estaba en `Bill.tsx`, e `isRated`/`markRated`), `tableStore.ts` (exporta
`safeLocalStorage`), `Carousel`, `NoticeBanner`, `PaymentNotice`, `WhatsAppButton` y los tipos.

**Borrado:** `src/screens/RootRedirect.tsx`.

## 12. Diferencias con el Figma y notas para corregir

**Ya distinto al Figma, a propósito:**

| Figma | Cómo quedó | Por qué |
|---|---|---|
| Menú, detalle, pedido y seguimiento con el diseño original de mesa | Con las correcciones ya aprobadas en mesa | Decisión del cliente: una sola versión de lo compartido |
| Seguimiento con barra de checks, "En el comal" y "¡Ya está!" | Línea de tiempo con hora por paso, "Cocinando" y "Lista" | Corrección pedida por el cliente |
| W10 con un solo plato | Con dos platos, estrellas por plato; con más, "¿Todo estuvo rico?" | Misma regla aprobada en la mesa |
| Promo solo como tarjeta | La promo es un plato con su precio (C$ 160) | Pedido de la reunión con los socios: que el carrito cobre lo que anuncia |
| Sin página de error web | "Página no encontrada" con Ir al inicio | Pedido de la reunión: no mostrar "Este QR no es válido" en la web |
| Tu pedido con la fila "Total" | Total en el botón Continuar | Viene de la corrección de mesa |
| Confirmación por WhatsApp sin indicar qué pasa sin señal | Aviso de error y volver a confirmar | Para llevar no puede quedar en espera sin que el cliente sepa |

**Anotado para la ronda de correcciones (etapa g):**
- La dirección dice "Dirección por confirmar"; el Figma tiene "[TEXTO PENDIENTE: dirección]".
- El **+** de los más vendidos en el inicio agrega y lleva al menú; el Figma no define qué hace.
- La promo tiene dos textos distintos en el Figma ("Solo hoy, de 4 a 7 pm" en el inicio y "Hoy
  de 4 a 7 pm" en el menú).
- El horario de la promo ("de 4 a 7 pm") no se controla: el plato se puede pedir a cualquier
  hora y también aparece en "Combos especiales" de la mesa. Si hace falta, sumar un horario a
  los platos (como `days`).
- El Resumen muestra solo nombre y precio de cada plato, sin acompañante ni notas (como el
  Figma); W7 y W8 sí los muestran.
- El estado de la portada usa la hora corta ("hasta 10 pm") y el encabezado del menú la larga
  ("cierra 10:00 pm").

## 13. Limitaciones conocidas

- **Todo es simulado:** no se manda ningún WhatsApp, la caja no confirma nada y la cocina
  avanza con tiempos fijos (`processingMs`, `cookingMs`, `readyMs`).
- **Las reseñas de Google son de ejemplo** y el link es una búsqueda, no el perfil real.
- **Sin pagos en línea:** tarjeta y transferencia están como "Próximamente".
- **Domicilio no funciona:** solo se ve el diseño.
- **Sin señal**, el pedido no se envía solo; el cliente vuelve a confirmar.
- **Notificaciones:** las mismas limitaciones que en mesa (https o `localhost`, página abierta;
  en iPhone, solo agregada a la pantalla de inicio).
- **Los datos del cliente viven en su navegador:** si borra los datos del sitio o cambia de
  teléfono, los vuelve a escribir.
- **Los links de prueba por IP** (`http://192.168.1.15:5173/…`) solo abren en la misma red
  Wi‑Fi; para mostrarla en otro lado hay que publicarla (Vercel).

## 14. Bugs corregidos

| Problema | Causa | Arreglo |
|---|---|---|
| La cuenta de un pedido web abría "Este QR no es válido" (`/m/llevar/cuenta`) | El seguimiento compartido mostraba "Cuenta de la mesa" también para llevar | La fila y el resto de lo de mesa no salen en la web (`85412a0`) |
| W7 tardaba 8 s en pasar al seguimiento en vez de 5 | El temporizador se reiniciaba cada vez que el pedido cambiaba de paso | Depende de que la comanda exista, no del objeto |
| El campo con error de W5 se ponía verde al enfocarlo | El estilo de foco pisaba el rojo | Con error queda rojo siempre |
| Los puntos de W0 casi no se veían | La animación de pulso los apagaba | Quietos, como en el Figma |
| Al cerrar el detalle encima del menú, "Escribinos" quedaba sobre la barra del pedido | La barra del detalle, al cerrarse, borraba la altura publicada (`--dock-h`) aunque la del menú seguía | Al cerrarse una barra, queda la altura de la otra |
| En el servidor de desarrollo, la mesa se veía a todo el ancho en tablet | Vite servía CSS viejo (OneDrive) | No era el código: se verificó con el build real (`vite preview`) y se reinició Vite con `--force` |
| La promo decía "2 enchiladas por C$ 160" y el carrito cobraba otro monto | La tarjeta abría la enchilada suelta (C$ 90 cada una) | La promo es un plato propio de C$ 160 |
| Una dirección web inexistente decía "Este QR no es válido" | La ruta comodín era la de mesa | `NotFound` para la web |

## 15. Pendiente

**De la web:**
- Etapa g: revisión y correcciones (ver la sección 12).

**Del cliente:**
- Dirección, número de WhatsApp y enlace real del perfil de Google (con su calificación,
  reseñas y el link para dejar reseña).
- Confirmar la promo del día y su horario, los combos y los precios.
- Fotos reales (ver [vista-qr.md 19](vista-qr.md#19-pendiente)) y una foto de portada.

**Del proyecto:**
- Pasar a `main` lo nuevo de `plantilla-mesa` para que se publique en Vercel.

## 16. Historial de commits

| Commit | Cambio |
|---|---|
| `7f37c4a` | Documentación completa de la vista QR y forma de trabajo (`CLAUDE.md`) |
| `19a9e3a` | Web etapa a: canal para llevar, bienvenida, inicio, menú y domicilio |
| `e9de11f` | Web etapa b: tu pedido para llevar, tus datos y resumen |
| `85412a0` | Seguimiento: línea de tiempo con hora por paso, textos más claros y pedido web sin cuenta de mesa |
| `845f819` | Web etapa c: confirmación, seguimiento para llevar y avisos |
| `efd7716` | Documentación de la vista web y actualización de la vista QR |
| `13f497c` | Web etapa d: calificación con reseña en Google, promo con su precio y página no encontrada |
| `e828b11` | QR con la marca y placas de mesa (`npm run qr`) |

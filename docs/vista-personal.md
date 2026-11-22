# Vista del personal · cocina, caja y panel del dueño

Registro de la demo de las pantallas del personal de **Fritanga Nica**: lo que se construyó,
cómo se conecta con la mesa y la web, y lo que falta. La mesa está en
[vista-qr.md](vista-qr.md) y la web para llevar en [vista-web.md](vista-web.md).

- **Rama:** `plantilla-mesa` (la misma de la mesa y la web).
- **Estado:** demo de Cocina (P1, P1a, P1b y P1c), Caja (P2, P2a, P2b y P2e), Meseros (P3, P3a,
  P3b, P3m y P3d) y el Panel completo: Resumen (P4), Menú y agotados (P4a), Mesas y QR (P4b),
  Personal y PINs (P4c), Promos, Horarios y Reseñas. Todo simulado en el navegador, sin backend.
- **Es un prototipo:** sirve para mostrarle al cliente cómo funciona el otro lado. Lo que solo
  importa para el sistema real se anota en [13](#13-hallazgos-de-las-pruebas-con-agentes) y no se
  arregla todavía.
- **Por qué ahora:** para mostrarle al dueño "el otro lado". El pedido que hace en el teléfono
  le llega a la cocina, la caja lo cobra y el panel le dice cuánto vendió.

## Índice

1. [Qué se hizo y qué no](#1-qué-se-hizo-y-qué-no)
2. [Rutas](#2-rutas)
3. [Cómo se conecta con la mesa y la web](#3-cómo-se-conecta-con-la-mesa-y-la-web)
4. [Pantallas](#4-pantallas)
5. [Pedidos de ejemplo](#5-pedidos-de-ejemplo)
6. [Cómo presentar la demo](#6-cómo-presentar-la-demo)
7. [Diferencias con el Figma](#7-diferencias-con-el-figma)
8. [Configuración y datos](#8-configuración-y-datos)
9. [Archivos](#9-archivos)
10. [Accesibilidad](#10-accesibilidad)
11. [Limitaciones](#11-limitaciones)
12. [Pendiente](#12-pendiente)
13. [Hallazgos de las pruebas con agentes](#13-hallazgos-de-las-pruebas-con-agentes)
14. [Revisión senior del panel](#14-revisión-senior-del-panel)

---

## 1. Qué se hizo y qué no

El Figma tiene 20 pantallas del personal: P0 PIN, cocina, caja, meseros y panel. Esta etapa pasa
las tres que más le sirven al dueño para decidir, fieles al plugin (`pCocina`, `pCaja`,
`pCobrar`, `pPanelResumen`).

| Hecho | Para después |
|---|---|
| P0 Entrar con PIN, P1 Cocina, P1a y P1b (las comandas pasan de columna), P1c Agotados | |
| P2 Caja · por cobrar, P2a por confirmar, P2b Cobrar, P2e mesa cerrada, P2c Nuevo pedido, P2d Corte del día | |
| Caja sin diseño en el Figma (boceto aprobado el 2026-11-22): Imprimir cuenta, Bloquear mesa, pestaña En curso | |
| P3 Meseros: avisos, Voy y Atendido (P3a, P3b), P3m Mesas, P3d detalle de mesa, Agregar pedido a esta mesa, Aceptar o rechazar el primer pedido | |
| P4 Panel · Resumen, P4a Menú y agotados, P4b Mesas y QR, P4c Personal y PINs | |
| Panel: Agregar y editar plato, Agregar y quitar mesa, Agregar persona, Cambiar PIN, Nueva promo y Cambiar horario (sin diseño en el Figma: boceto aprobado el 2026-11-22) | |
| Panel · Promos, Horarios y Reseñas (sin diseño en el Figma: boceto aprobado el 2026-11-21) | |

Lo que es para después **se ve, pero no hace nada**. Está deshabilitado y el lector de pantalla
dice "Próximamente". Después de las etapas del 2026-11-22 ya no queda ningún botón así en la
caja, los meseros ni el panel.

## 2. Rutas

| Ruta | Pantalla | Archivo |
|---|---|---|
| `/cocina` | P1 Cocina | `screens/staff/Kitchen.tsx` |
| `/caja` | P2 Caja | `screens/staff/Cashier.tsx` |
| `/caja/nuevo` | P2c Nuevo pedido | `screens/staff/ManualOrder.tsx` |
| `/caja/corte` | P2d Corte del día | `screens/staff/DayClose.tsx` |
| `/meseros` | P3 Meseros: Avisos y Mesas (celular) | `screens/staff/Waiters.tsx` |
| `/meseros/mesa/:mesa` | P3d Una mesa con sus pedidos | `screens/staff/Waiters.tsx` |
| `/meseros/mesa/:mesa/nuevo` | Agregar pedido a esta mesa (P2c en celular) | `screens/staff/ManualOrder.tsx` |
| `/panel` | P4 Panel · Resumen | `screens/staff/OwnerPanel.tsx` |
| `/panel/menu` | P4a Menú y agotados | `screens/staff/panel/PanelMenu.tsx` |
| `/panel/mesas` | P4b Mesas y QR | `screens/staff/panel/PanelTables.tsx` |
| `/panel/personal` | P4c Personal y PINs | `screens/staff/panel/PanelPeople.tsx` |
| `/panel/promos` | Promos | `screens/staff/panel/PanelPromos.tsx` |
| `/panel/horarios` | Horarios | `screens/staff/panel/PanelHours.tsx` |
| `/panel/resenas` | Reseñas | `screens/staff/panel/PanelReviews.tsx` |
| `/personal` | P0 Entrar con PIN: cada quien entra a su pantalla | `screens/staff/PinLogin.tsx` |

Todas cuelgan de `StaffLayout`; las del panel, además, de `PanelLayout` (la barra y las
secciones). Se bajan solo si se abren: no le suman peso a la mesa ni a la
web.

## 3. Cómo se conecta con la mesa y la web

Todo pasa **en el mismo navegador**. El cliente usa una pestaña (o ventana) y el personal otra.
Comparten el "servidor" simulado de localStorage, el mismo que ya usaban la mesa y la web
(`lib/server.ts`).

- **La cocina abierta cambia cómo avanza el pedido.** Mientras una pantalla del personal está
  abierta deja una marca (`lib/staffLive.ts`), que se borra al cerrarla y vale hasta 30 min aunque
  la pestaña quede de fondo (ahí Chrome frena los temporizadores). Si el cliente envía con esa
  marca vigente, la comanda queda con `kitchenLive` y **espera a la cocina**. No avanza sola con los
  tiempos del simulador. Sin el personal abierto, todo sigue igual que antes (15 s de punta a
  punta).
- **Mesa:** el pedido entra a **Nuevos**. "A cocinar" lo pasa a Cocinando, "Lista" a Listos y
  "Entregado" lo saca. El teléfono del cliente cambia de paso en 1 a 2 s, con la hora real de
  cada paso en la línea de tiempo.
- **Web para llevar:** el pedido queda en caja, en **Por confirmar**. "Confirmar por WhatsApp"
  abre el chat con el mensaje escrito y "Ya respondió · pasar a cocina" lo manda a Nuevos.
  Mientras tanto, el cliente ve "Estamos procesando tu orden · Te escribimos al WhatsApp para
  confirmarla".
- **Cobro:** cuando el cliente toca "Avisar a caja", la mesa aparece en **Por cobrar** como
  "Viene a pagar". Al cobrar, el teléfono pasa solo a "¡Cuenta pagada!" con el recibo real
  (método, vuelto y quién cobró). También se puede cobrar una mesa que no avisó ("Cuenta
  abierta"): el teléfono se entera igual. Con "Cada quien lo suyo", caja cobra por persona; lo
  de los demás sigue abierto en caja.
- **Panel del dueño** (`store/panelSettings.ts`, compartido entre pestañas como los agotados):
  - **Menú y agotados** usa los mismos agotados que la cocina.
  - **Promos:** apagada, la promo desaparece del inicio y del menú de la web.
  - **Horarios → Cerrar hoy:** la mesa y la web dicen "Cerrado" y no dejan pedir, incluso con
    `?forzar=abierto`. Guarda la fecha del local: al día siguiente deja de valer sola.
  - **Mesas y QR → Solo en horario de atención** apagada: se puede pedir a cualquier hora.
  - **Mesas y QR → Límite por pedido** apagado: no hay tope de 10 platos por envío.
- **Mesero:** "Llamar al mesero" queda en el servidor de la mesa y aparece en **Meseros**. Con
  **Voy**, el teléfono pasa a "Carlos va en camino"; con **Atendido**, el aviso desaparece. Sin el
  personal abierto, el mesero "va" solo a los 3 s, como antes.
- **Agotados:** lo que la cocina apaga en "¿Qué se acabó?" se marca **Agotado** al instante en el
  menú del cliente (`store/availability.ts`, compartido entre pestañas). Un acompañante agotado
  deja de ofrecerse en el detalle. A quien ya lo pidió le sale la hoja "Se acabó el maduro, ¿lo
  cambiamos?", la misma de `?forzar=agotado`.
- **Numeración:** el número de comanda ahora es único en todo el local (mesas, web y mostrador).
  Así la cocina nunca ve dos FN-0142. El primero sigue siendo FN-0142.

## 4. Pantallas

**Barra superior (todas):** logo y área, pestañas **Cocina · Caja · Meseros · Panel** (Meseros,
deshabilitada) y a la derecha la información, los botones y quién entró ("Don Julio", "María",
"Dueño", de `staff` en la config).

### 4.0 P0 Entrar con PIN (`PinLogin.tsx`)

- `/personal`: logo, "Entrá con tu PIN", cuatro puntos, el teclado (1–9, 0 y **Borrar**) y "Cada
  quien ve solo lo suyo: cocina, caja, meseros o dueño". También acepta el teclado de la
  computadora.
- Con el PIN de una persona (P4c) dice "Hola, María. Entrando a Caja…" y la lleva a su pantalla:
  Cocina → `/cocina`, Caja → `/caja`, Mesero → `/meseros`, Dueño → `/panel`. Con uno que no es de
  nadie, los puntos se ponen rojos y dice "Ese PIN no es de nadie. Probá de nuevo."
- Abajo, los PIN de la demo. Es un prototipo: las direcciones directas siguen entrando sin PIN.

### 4.1 P1 Cocina (`Kitchen.tsx`)

- Arriba a la derecha: **Sonido activado** y la hora del local. El navegador no deja sonar nada
  hasta el primer toque, así que antes dice **"Tocá para activar el sonido"**. Con cualquier
  toque en la pantalla queda activado.
- Tres columnas, cada una con su cantidad: **Nuevos**, **Cocinando** y **Listos**. Nuevos y
  Cocinando van del más viejo al más nuevo; Listos, del último en estar listo al primero.
- **Comanda** (`KitchenTicket`):
  - número a mano (Caveat) y la pastilla del canal: verde con campana para la mesa ("Mesa 2 ·
    Teléfono 1"), azul con bolsa para llevar ("Para llevar · Ana") y gris con billete para el
    mostrador;
  - hace cuánto cambió de paso ("recién", "hace 14 min"). Si pasaron 12 min desde el pedido y no
    está lista, se agrega "· tarde" en rojo y el borde se pone rojo. Una comanda nueva lleva
    borde verde;
  - en Nuevos, si la misma mesa tiene otra comanda antes: "· otra comanda de la Mesa 5";
  - los platos con cantidad y, debajo, el acompañante, los extras y los cambios ("tajadas en vez
    de maduro");
  - las notas resaltadas en ámbar: "Nota: Sin repollo" (la del pedido) y "Nota · Enchilada: sin
    crema" (la de un plato);
  - el botón: **A cocinar** (Nuevos), **Lista** (Cocinando). En Listos dice a quién se avisó
    ("Avisamos al mesero", "Avisamos a caja y por WhatsApp" o "Avisamos a caja") y el botón
    **Entregado**.
- Cuando entra un pedido nuevo suena un "din-don" y el lector de pantalla anuncia "Nuevo pedido:
  FN-0148".
- **Agotados** abre P1c.

### 4.2 P1c ¿Qué se acabó? (`SoldOutDialog.tsx`)

Ventana de 520 px con "Se oculta al instante en la app. Si alguien ya lo pidió, le preguntamos si
lo cambia." y un interruptor por plato (en el orden de las categorías del menú) y por acompañante
("Maduro (acompañante)"). Verde = hay. **Listo**, la ✕, Esc o tocar afuera la cierran.

Los platos que el JSON trae agotados (fritanga con cerdo, tajadas con queso) salen apagados y se
pueden encender.

### 4.3 P2 Caja (`Cashier.tsx`)

- Barra: **Nuevo pedido** (P2c), **Corte del día** (P2d) y "María".
- A la izquierda, las pestañas **Por confirmar · N**, **Por cobrar · N** y **En curso · N**.
  Debajo, la lista:
  - **Por cobrar:** primero las mesas que vienen a pagar ("Viene a pagar a caja · Todo junto · hace
    1 min" o "Cada quien lo suyo"), después las cuentas abiertas ("Comiendo · cuenta abierta · 3
    teléfonos · hace 25 min"), cada una con su total;
  - **Por confirmar:** los pedidos web ("FN-0144 · Ana · 8888 0000 · Para llevar · hace 2 min").
  - **En curso:** los pedidos que están en la cocina (Recibida, Cocinando o Lista), de todos los
    canales, con el detalle a la derecha. Lo mueve la cocina; al entregarse sale de la lista.
  - En **Por cobrar** también aparece el **Mostrador** si un pedido manual no se cobró al momento.
- A la derecha, el detalle de lo elegido (460 px).
  - **Mesa:** nombre y estado ("Viene a pagar" en ámbar o "Cuenta abierta" en verde), "Viene a caja
    · pagan todo junto", lo de cada persona con sus comandas y precios, el total (si el cliente
    dejó propina: consumo, propina y total) y **Cómo cobrar**: Todo junto o Por persona.
  - **Por persona:** "Tocá a quién le cobrás" y cada persona es una tarjeta para elegir. Viene
    elegida la que avisó a caja. Lo ya pagado dice "Pagado".
  - Abajo: **Imprimir cuenta** (abre la impresión del navegador con un ticket de 72 mm: platos,
    consumo, propina, total y "Atendió: María"), **Cobrar · C$ total**, el texto del PIN del dueño
    y **Bloquear mesa**. Bloqueada, la mesa dice "Bloqueada" en rojo y el botón pasa a
    **Desbloquear mesa**; en el teléfono, el menú y "Tu pedido" muestran "Esta mesa no está
    recibiendo pedidos · Llamá al mesero" y no deja enviar.
- **P2c Nuevo pedido** (`/caja/nuevo`): "Para quien no tiene celular o no quiere escanear", el canal
  (Mostrador, Mesa con su número, o Para llevar con WhatsApp), el buscador y los platos de hoy con
  su +. A la derecha el ticket ("Mostrador · Don Pedro"), con nombre, cantidades y total:
  - **Enviar a cocina:** entra directo a la cocina (ya está confirmado) y vuelve a caja con "FN-0150
    enviado a la cocina";
  - **Cobrar ahora:** abre P2b; al cobrar, lo envía y vuelve con "FN-0150 cobrado: C$ 90 con
    efectivo".
- **P2d Corte del día** (`/caja/corte`): Vendido, Efectivo, Tarjeta y Cancelados; Por canal; Efectivo
  en caja (fondo inicial `ordering.cashFloat`, ventas en efectivo, debería haber), **Contado** y la
  diferencia ("faltan C$ 40", "sobran" o "Cuadra exacto"); **Imprimir corte** y **Cerrar el día**.
  - Usa un registro de cobros (`fritanga-nica:caja:cobros`), porque la mesa se borra al cerrarse.
    Cuenta los cobros de hoy desde el último corte.
  - Sin cobros, muestra los números de ejemplo del Figma ("viernes (ejemplo)") y "Cerrar el día"
    queda deshabilitado.
- **P2a Por confirmar:** número a mano, "Para llevar", "Ana · 8888 0000", lo pedido, el aviso
  "Confirmalo antes de cocinar", **Confirmar por WhatsApp** (abre `wa.me` al número del cliente
  con "Hola Ana, recibimos tu orden FN-0144 en Fritanga Nica: 1× Combo para dos. Total C$ 380,
  pagás al recoger. ¿Te la preparamos?"), **Ya respondió · pasar a cocina** y "Si no responde en
  10 minutos…". Al pasarlo a cocina sale el aviso "FN-0144 pasó a cocina".

### 4.4 P2b Cobrar (`ChargeDialog.tsx`)

Ventana de 560 px: **Cobrar Mesa 6** (o "Cobrar a Ana"), el total grande, **Efectivo / Tarjeta**
(viene marcado lo que dijo el cliente). Con efectivo:

- **Recibido**, que viene con lo que dijo el cliente o el total;
- montos rápidos: el exacto, la centena siguiente y el billete grande siguiente (C$ 510, C$ 600 y
  C$ 1,000);
- **Cambio** en verde, o "Faltan C$ X" en ámbar si no alcanza. En ese caso no deja cobrar.

Abajo, "Imprimir ticket (si hay impresora)" (marcado, sin efecto todavía) y **Cobrar y cerrar
mesa** (o "Cobrar a Ana").

**P2e:** después de cobrar, la lista muestra el aviso verde "Mesa 6 cobrada y cerrada · C$ 510 con
tarjeta · la sesión del QR terminó; los próximos clientes empiezan una cuenta nueva." o, por
persona, "Ana pagó lo suyo · … la cuenta de la Mesa 5 sigue abierta para los demás.".

### 4.5 P3 Meseros (`Waiters.tsx`, celular)

Sin la barra de tablet: "Meseros" y "Carlos" arriba, y las pestañas **Avisos · N** y **Mesas**.

- **Avisos** (tarjetas con la mesa en verde):
  - "Te llama · "Que venga el mesero"" y "hace 30 s · si nadie va en 1 min avisamos a todos" →
    **Voy** → la tarjeta pasa a verde suave con "Vas en camino · El cliente ya ve "Carlos va en
    camino"" → **Atendido** (desaparece);
  - "Está pagando en caja · C$ 510" y "Al cobrar, la mesa queda libre" → **Mesa limpia**;
  - "FN-0137 · Lista" y "Llevar 1× Fritanga tradicional, 2× Enchilada" → **Entregado** (lo saca
    de la cocina y el teléfono pasa a Entregada). En el Figma decía "¡Ya está!": se cambió por la
    regla del cliente.
  - Abajo: "Los pedidos de las mesas van directo a la cocina. Vos solo atendés llamadas y llevás
    lo que está listo."
- **P3m Mesas:** las mesas del local en dos columnas, con el estado (Libre, Te llama, Pidiendo,
  Comiendo · 3 tel., Pagando en caja) y lo que deben. "Pidiendo" es una mesa con platos en el
  pedido sin enviar (en este navegador). Una mesa con cuenta abre P3d.
- **P3d Mesa:** "3 teléfonos · abierta hace 25 min · C$ 430", cada pedido con su persona, número,
  estado y platos, y **Agregar pedido a esta mesa**, que abre el Nuevo pedido en celular con la
  mesa fija (sin "Cobrar ahora": el mesero no cobra). Una mesa libre en P3m también lo abre.
- **Aceptar el primer pedido** (si la regla está encendida en P4b y el personal está abierto): el
  primer pedido de una mesa sin cuenta abierta llega a Avisos como "Pedido nuevo · FN-0148" con
  **Rechazar** y **Aceptar**. Hasta aceptarlo no entra a la cocina, y el teléfono dice "Esperando
  que el mesero confirme tu pedido". Rechazado, no va a la cocina ni a la cuenta, y el teléfono
  dice "El mesero no pudo confirmar tu pedido".
- Hay un llamado de ejemplo de la Mesa 2 (`callSecAgo` en `demo.staffSeeds`).

### 4.6 P4 Panel · Resumen (`OwnerPanel.tsx`)

- Secciones (todas abren su pantalla): **Resumen** · Menú y agotados · Mesas y QR · Personal y
  PINs · Promos · Horarios · Reseñas. La actual va en verde.
- Cuatro números: Vendido hoy C$ 8,450 (+12 % vs. viernes pasado), Pedidos 37 (ticket promedio
  C$ 228), Tiempo en cocina 13 min y Respuesta del mesero 45 s.
- Barras: **Pedidos por canal · ¿local o en línea?**, **¿De dónde llegan a la web?**, **Formas de
  pago**, **Horas pico** y **Más vendidos**.
- Aviso ámbar "Queja de hoy · Enchilada ★★ · Mesa 3 · 7:40 pm" y la nota "Todos los números son
  de ejemplo…".
- Los números son **de ejemplo** (`demo.panel`), como en el Figma. No cuentan los pedidos de la
  demo.

### 4.7 P4a Menú y agotados (`PanelMenu.tsx`)

- "Menú" y **Agregar plato**. Tabla con Plato (foto), Etiqueta, Precio, Disponible y un lápiz para
  editar, con **los 17 platos del menú** (el Figma dibuja 5 de ejemplo) más los agregados (con
  "Nuevo").
- **Ventana del plato** (agregar o editar): nombre, categoría, precio, línea corta, descripción,
  etiqueta y foto. La foto se elige de la computadora y el navegador la achica a 640 px (WebP) para
  guardarla en localStorage. Al guardar, la mesa y la web lo ven al instante (y la cocina en
  "Agotados"). Los platos agregados se pueden borrar; los de `menu.json`, solo editar.
- Los platos de las promos nuevas no salen acá: se manejan en Promos.
- Etiqueta: la del plato (Más vendido, La de la casa, Combo, Promo) o "Agotado" si no tiene y está
  apagado, como en el Figma.
- El interruptor es el mismo agotado de la cocina: el cliente lo ve al instante.

### 4.8 P4b Mesas y QR (`PanelTables.tsx`)

- **Agregar mesa** suma la siguiente (Mesa 9, 10…) con su QR, y `/m/9` empieza a funcionar. Las
  agregadas tienen "Nueva" y se pueden quitar.
- Las tres reglas: "Solo en horario de atención" y "Límite por
  pedido" funcionan (ver 3); "El mesero acepta el primer pedido" viene apagada y, encendida, manda
  el primer pedido de cada mesa a Meseros (ver 4.5).
- Las 8 mesas con su **QR de verdad** (el mismo diseño de `npm run qr`, hecho en el navegador con
  `lib/qr.ts`), la dirección y **Descargar QR** (baja `mesa-N.svg` con el logo adentro).
- "Enlaces para redes" con `?src=ig`, `fb`, `google` y `wa` y **Copiar** (copia de verdad; dice
  "Copiado" 2 s).
- La librería de QR solo la baja esta pantalla (no va en el paquete común).

### 4.9 P4c Personal y PINs (`PanelPeople.tsx`)

- Don Julio (Cocina), María (Caja), Carlos y Luis (Mesero) y Dueño (puede cancelar), cada uno con
  "PIN ••••" y **Cambiar**, que abre "Cambiar el PIN de María" (el nuevo, dos veces).
- **Agregar persona:** nombre, rol (Cocina, Caja, Mesero o Dueño) y PIN dos veces. El PIN son 4
  números y no puede repetirse ("Ese PIN ya lo usa Don Julio"), porque con él se entra en
  `/personal` (P0).
- PINs de ejemplo: Don Julio 1111, María 2222, Carlos 3333, Luis 4444 y Dueño 0000
  (`demo.panel.people`).
- "Registro de acciones con PIN del dueño", con tres líneas de ejemplo (`demo.panel.pinLog`).

### 4.10 Promos, Horarios y Reseñas (sin diseño en el Figma)

Se hicieron con el boceto aprobado, con las mismas piezas que el resto del panel.

- **Promos:** la promo del día y las creadas, cada una con foto, "2 enchiladas por C$ 160", dónde
  se ve y cuándo ("Solo web · Todos los días · 4 a 7 pm"), si se ve ahora ("Activa ahora", "Fuera
  de horario ahora" o "Apagada") y su interruptor. Las creadas se pueden borrar.
- **Nueva promo:** plato, cantidad, precio (con "Normal C$ 500 · ahorran C$ 80"), cómo se llama
  (se arma solo: "2 carnes asadas", y se puede cambiar), días, desde y hasta, y dónde (Solo web o
  Web y mesa), con la tarjeta tal como la verá el cliente. Al crearla:
  - se suma un plato "Promo: 2 carnes asadas" en Combos, con sus días;
  - el inicio y el menú de la web muestran las promos activas; si hay más de una, en una fila que
    se desliza de costado;
  - si es "Web y mesa", la mesa la ve en Combos (la del día sigue siendo solo web).
- **Horarios:** el horario de cada día, de lunes a domingo, con "Hoy" marcado; la tarjeta **Hoy**
  con el estado ("Abierto ahora · cierra a las 10:00 pm", "Cerrado por hoy · mañana abre a las
  4:00 pm") y **Cerrar hoy**. Si la regla "Solo en horario" está apagada, lo avisa.
- **Cambiar horario:** a qué hora abre y cierra cada día, o "Cerrado". Cambia al instante
  "Abierto / Cerrado" en la mesa y la web, y se puede volver al horario original.
- **Reseñas:** tres números (Google ★ 4.8 · 120, la app y las quejas) y la lista "Lo que dicen en
  la app": primero las de 1 y 2 estrellas (con "Queja"), después las demás, de la más nueva a la
  más vieja. Junta las de `menu.json`, las que dejan los clientes al pagar (en este navegador) y la
  queja de ejemplo del Resumen (Enchilada ★★ · Mesa 3 · hoy 7:40 pm, `demo.panel.sampleComplaint`).
  "Ver en Google" abre el perfil.

## 5. Pedidos de ejemplo

Para que la cocina y la caja no se vean vacías, al abrirlas se crean estos pedidos
(`demo.staffSeeds`, guardados aparte en `fritanga-nica:personal:ejemplos`). Usan números más
bajos que los reales (FN-0131 a FN-0139):

| Comanda | Dónde | Estado |
|---|---|---|
| FN-0139 | Mesa 2 · Teléfono 1: 2× Fritanga tradicional, 1× Fresco de cacao, "Una sin repollo" | Nuevos, hace 1 min |
| FN-0137 | Mesa 3 · Carmen: Fritanga + queso extra, 2× Enchilada, "Sin repollo" | Cocinando, tarde (14 min) |
| FN-0136 | Mostrador: 1× Carne asada | Listos, hace 18 min |
| FN-0138 | Para llevar · Ana · 8888 0000: 1× Combo para dos | Caja, por confirmar |
| FN-0131 a FN-0133 | Mesa 6 · Ana, Carlos y Teléfono 3 (C$ 510) | Caja, viene a pagar todo junto |

- Se vuelven a crear después de 3 horas (`staffDemo.seedsMaxAgeMin`) o con **`?forzar=ejemplos`**
  (por ejemplo, `/cocina?forzar=ejemplos`).
- Si alguien abre de verdad una mesa de ejemplo (`/m/6`), en caja queda la real.

## 6. Cómo presentar la demo

En una computadora, con dos ventanas lado a lado (o dos pestañas):

1. Abrir primero **`/cocina?forzar=ejemplos`**: así los pedidos que se hagan esperan a la cocina.
2. En la otra ventana, **`/m/5?forzar=mesa-nueva&forzar=abierto`** con el ancho de un celular
   (DevTools → modo dispositivo). Pedir algo y enviarlo.
3. En la cocina suena y aparece en **Nuevos** → **A cocinar** → el teléfono dice "Ya estamos
   cocinando tu pedido" → **Lista** → "Tu comida está lista" → **Entregado**.
4. **Agotados** → apagar un plato → en el menú del cliente aparece "Agotado".
5. En el teléfono, **Ya vamos a pagar → Avisar a caja**. En **Caja** aparece "Mesa 5 · Viene a
   pagar" → **Cobrar** → el teléfono pasa solo a "¡Cuenta pagada!".
6. Para llevar: en la web (`/?forzar=abierto`), pedir y confirmar. En **Caja → Por confirmar** →
   **Ya respondió · pasar a cocina** → aparece en la cocina.
7. **Meseros** (`/meseros`, con el ancho de un celular): en el teléfono de la mesa, **Llamar al
   mesero** → aparece "Mesa 5 te llama" → **Voy** → el teléfono dice "Carlos va en camino".
8. **Panel**: el resumen del día, con números de ejemplo. Después:
   - **Menú y agotados** → apagar un plato → el cliente lo ve "Agotado";
   - **Promos** → apagarla → desaparece de la web;
   - **Horarios → Cerrar hoy** → la mesa dice "Cerrado" (volver a encenderlo al terminar);
   - **Mesas y QR** → los QR de cada mesa y "Copiar" un enlace para redes.

Ojo: el link publicado funciona igual, pero **cada navegador tiene lo suyo**. Un pedido hecho
desde el celular del cliente no llega a la cocina abierta en la computadora; eso necesita el
backend.

## 7. Diferencias con el Figma

| Figma | Cómo quedó | Por qué |
|---|---|---|
| Columna "En el comal", botones "Al comal" y "¡Ya está!" | "Cocinando", **A cocinar** y **Lista** | Decisión del cliente: no usar "en el comal" ni "¡Ya está!" en ningún lado (los pasos son Recibida, Cocinando, Lista, Entregada) |
| "Sonido activado" fijo | "Tocá para activar el sonido" hasta el primer toque | El navegador no deja sonar nada antes de un toque |
| Total sin propina | Consumo, propina y total cuando el cliente dejó propina | La propina se agregó en la mesa después del Figma |
| "Por persona" sin diseño | Cada persona es una tarjeta que se elige; se cobra lo suyo | El Figma solo dibuja "Todo junto"; la mesa ya ofrece "Cada quien lo suyo" |
| "Faltan" no existe | Si lo recibido no alcanza: "Faltan C$ X" y no deja cobrar | Evita cobrar de menos |
| Mesas de ejemplo 5 y 6 | Ejemplos en las mesas 2, 3 y 6 | La Mesa 5 es la de la demo (la de la hoja con QR) |
| Lista de agotados de 5 filas | Todos los platos y acompañantes, con desplazamiento | Es el menú real |
| Botones del prototipo que no llevan a nada | Deshabilitados con "Próximamente" | No prometer lo que todavía no hace |
| P4a: 5 platos de ejemplo ("Maduro en gloria", "Fresco de cacao"…) | Los 17 platos reales del menú | Es el menú real y el interruptor funciona |
| P4b: dominio `fritanganica.com` "de ejemplo" y QR gris | El link publicado y el QR real de cada mesa | Así se puede escanear en la reunión |
| Promos, Horarios y Reseñas: solo el nombre en la barra | Pantallas con boceto aprobado | El Figma no las dibuja |

## 8. Configuración y datos

**`restaurant.json`:**

| Clave | Para qué |
|---|---|
| `staff` | Nombres de ejemplo: mesero, cajera, `cook` (Don Julio) y `owner` (Dueño) |
| `staffDemo.heartbeatMs` / `liveWithinMs` | Cada cuánto la pantalla del personal renueva su marca (4 s) y hasta cuándo vale si no se renueva (30 min; al cerrar la pantalla se borra) |
| `staffDemo.pollMs` | Cada cuánto se revisan los cambios de la otra pestaña (1,5 s; además del evento `storage`) |
| `staffDemo.lateMin` | Minutos desde el pedido para marcarlo "tarde" (12) |
| `staffDemo.seedsMaxAgeMin` | Después de esto los pedidos de ejemplo se vuelven a crear (180) |
| `demo.staffSeeds` | Pedidos de ejemplo (ver 5) |
| `demo.panel` | Números de ejemplo del panel; `people` y `pinLog` (P4c), `links` (P4b) y `sampleComplaint` (Reseñas) |
| `texts.staff` | Todos los textos del personal |

**Modelo (`types/order.ts`):** `Comanda` suma `kitchenLive`, `statusTimes` (hora de cada paso),
`confirmedAt` (para llevar, confirmado por caja) y `paid`. El servidor de cada mesa
(`ServerTable`, `lib/server.ts`) suma `billAt` y `payments` (cada cobro: comandas, total,
propina, método, recibido, vuelto, cajera y hora).

**Datos guardados (localStorage):**

| Dato | Clave |
|---|---|
| El personal está mirando | `fritanga-nica:personal:activo` |
| Pedidos de ejemplo | `fritanga-nica:personal:ejemplos` |
| Agotados de la cocina | `fritanga-nica:agotados` |
| Ajustes del panel (promo, reglas, cerrar hoy) | `fritanga-nica:panel` |
| Platos, promos, mesas, personal y horario del panel | `fritanga-nica:catalogo` |
| Registro de cobros y cortes del día | `fritanga-nica:caja:cobros`, `fritanga-nica:caja:cortes` |
| Registro de cambios (P4c) | `fritanga-nica:registro` |
| Quién entró con PIN (en la pestaña) | `fritanga-nica:personal:sesion` (sessionStorage) |
| Último número de comanda | `fritanga-nica:ultimo-numero` |

**API real:** el tablero (`lib/staff.ts`) se reemplaza por `GET /api/cocina` y `GET /api/caja`
con aviso por WebSocket, y sus acciones por `PATCH /api/comandas/:id` (estado, confirmar) y
`POST /api/mesas/:mesa/cobros`. Los agotados, por `GET/PUT /api/agotados`, y los ajustes del panel, por `GET/PUT /api/ajustes`.

## 9. Archivos

**Nuevos:**

| Archivo | Qué es |
|---|---|
| `src/lib/server.ts` | El "servidor" simulado (salió de `api.ts`), numeración única y `itemsFromIds` |
| `src/lib/staffLive.ts` | La marca de "el personal está mirando" |
| `src/lib/staff.ts` | Tablero del personal: lee todas las mesas y la web, ejemplos, acciones de cocina y caja |
| `src/lib/staffText.ts` | "Mesa 2 · Teléfono 1", "hace 14 min", la hora del local |
| `src/lib/beep.ts` | El sonido de pedido nuevo |
| `src/store/availability.ts` | Agotados compartidos entre pestañas |
| `src/store/panelSettings.ts` | Ajustes del panel compartidos entre pestañas: promo, reglas y "Cerrar hoy" |
| `src/store/catalogEdits.ts` | Lo que agrega o cambia el dueño (platos, promos, mesas, personal, horario), aplicado sobre `menu` y `restaurant` |
| `src/lib/qr.ts` | QR de mesa con la marca, en el navegador, y su descarga |
| `src/lib/actionLog.ts`, `staffSession.ts` | Registro de cambios y quién entró con PIN |
| `src/lib/useTableServer.ts` | El teléfono lee lo que marcó el personal (mesa bloqueada, pedido aceptado o rechazado) |
| `src/components/staff/PrintSheet.tsx` | Ticket de 72 mm para imprimir (cuenta y corte) |
| `src/screens/staff/ManualOrder.tsx`, `DayClose.tsx` | P2c Nuevo pedido (caja y mesero) y P2d Corte del día |
| `src/components/staff/` | `StaffBar`, `ChannelChip`, `KitchenTicket`, `Segmented`, `Switch`, `StaffDialog`, `SoldOutDialog`, `ChargeDialog` |
| `src/screens/staff/` | `StaffLayout`, `Kitchen`, `Cashier`, `Waiters`, `OwnerPanel` |
| `src/screens/staff/panel/` | `PanelLayout`, `PanelMenu`, `PanelTables`, `PanelPeople`, `PanelPromos`, `PanelHours`, `PanelReviews`, `parts`, las ventanas (`DishDialog`, `PromoDialog`, `PersonDialog`, `HoursDialog`) y el formulario (`form`, `formUtils`) |

**Cambiados:**
- `api.ts`: `sendComanda` marca `kitchenLive`; `watchComanda` sigue a la cocina cuando
  corresponde; `waitForPayment` pasó a `watchPayment` (cancelable, responde al cobro de caja o al
  tiempo simulado).
- `MesaLayout.tsx`: escucha el cobro aunque no hayan avisado a caja. Si se pagó solo lo de este
  teléfono, lo de los demás queda abierto en caja.
- `comandas.ts` y `comandaStatus.ts`: hora real de cada paso en la línea de tiempo.
- `DishCard`, `DishDetail`, `Menu` y `Tracking`: reaccionan a los agotados de la cocina.
- `router.tsx`, `main.tsx`, `storage.ts` (`listKeys`) y los tipos.
- Por el panel: `useOpenState` (Cerrar hoy y la regla de horario), `promo.ts` (`usePromoInHours`
  y varias promos: `useActivePromos`, `promoAllows`), `PromoCard` (`PromoRow`), `Home`,
  `HomeDesktop`, `Menu`, `catalog.ts` (`syncDishIndex`), `images.ts` (fotos `data:`),
  `SoldOutDialog` (platos agregados), `cart.ts`, `orderFlow.ts` y `DishDetail` (el límite sale de `itemLimit()`),
  `Switch` (puede quedar deshabilitado), `vite.config.ts` (QR fuera del paquete común) y
  `qrcode` pasó a dependencias de la app.

## 10. Accesibilidad

- Cada pantalla tiene un `h1` (el área), la barra de secciones es un `nav` con la actual marcada
  (`aria-current`) y lo que no está hecho se anuncia como "Próximamente".
- Las pestañas de caja, "Cómo cobrar", "Por persona" y "Método" son grupos de radio: Tab entra a
  la opción elegida y las flechas cambian.
- Los interruptores son `role="switch"` con el nombre del plato o la regla; el estado lo da
  `aria-checked` (sin repetirlo en el nombre).
  Lo mismo los del panel ("Cerrar hoy: Apagado").
- El panel usa tablas y listas de verdad (`th` por plato), cada QR tiene su texto ("Código QR de
  la Mesa 1"), "Copiar" y "Descargar QR" dicen de qué son, y al copiar se anuncia.
- Las ventanas (agotados, cobrar) atrapan el foco, se cierran con Esc y devuelven el foco al
  cerrar.
- Pedido nuevo y avisos de caja se anuncian (`role="status"`). El vuelto se actualiza en vivo
  (`aria-live`).
- Con "reducir movimiento" no hay animaciones (regla general del proyecto).

## 11. Limitaciones

- **Un solo navegador:** cliente y personal tienen que estar en el mismo navegador (pestañas o
  ventanas). Entre dispositivos hace falta el backend.
- **Abrir primero el personal:** un pedido hecho sin el personal abierto avanza solo, como antes.
  Igual aparece en la cocina mientras dura (15 s), y si la cocina lo toca pasa a moverlo ella,
  aunque el teléfono del cliente siga con sus tiempos.
- **Personal abierto y olvidado:** si la cocina queda abierta en una pestaña, los pedidos esperan
  a la cocina aunque nadie la mire. Para que vuelvan a avanzar solos, cerrar esa pestaña.
- **Cerrar la cocina con pedidos esperando:** quedan esperando en el teléfono del cliente hasta
  que se vuelva a abrir.
- **Para llevar al recoger:** el cobro en caja del pedido web no está diseñado; "Entregado" en
  cocina lo marca recogido.
- **Panel:** los números del Resumen, el personal y el registro son de ejemplo. Los cambios del
  panel valen solo en este navegador.
- **Sonido:** recién después del primer toque en la cocina.

## 12. Pendiente

- Del Figma: nada (las 20 pantallas del personal están pasadas).
- Que el PIN proteja de verdad las pantallas (hoy las direcciones directas entran sin PIN).
- Del panel (ver 14): editar la promo del día (días y horario), editar acompañantes y extras de
  un plato, reportes por fecha, exportar e historial completo.
- Del sistema real: backend para que los pedidos lleguen entre dispositivos, WhatsApp de
  confirmación de verdad, impresora de tickets y los números reales del panel.

## 13. Hallazgos de las pruebas con agentes

El 2026-11-21 se probó todo con cuatro agentes: dos sobre el personal (cocina y agotados; caja,
cobro y panel) y dos como clientes sin contexto (mesa con QR y web para llevar, en celular, tablet
y computadora). Como es un prototipo, se corrigió solo lo que se rompía o se veía mal **durante la
demo**:

| Corregido | Cómo |
|---|---|
| Con la cocina en una pestaña de fondo, los pedidos avanzaban solos | La marca del personal vale 30 min y se borra al cerrar |
| Doble toque en "A cocinar" o "Lista" movía también la comanda de al lado | La cocina ignora toques por 0,6 s después de cada uno |
| La ventana de cobro podía cambiar sola de mesa | Al abrirla, la mesa y la persona quedan fijas |
| Doble toque en "Enviar a la cocina" caía en "Pedir algo más" y no se enviaba | Las hojas ignoran toques en sus primeros 0,4 s (`BottomSheet`) |
| La nota "Para todo el pedido" se repetía en los pedidos siguientes | Se borra al enviar (`cart.clear`) |
| "¿Con cuánto pagás?" quedaba detrás de la barra de "Avisar a caja" | Al elegir Efectivo, el campo sube al centro |
| Para llevar: "cuando llegue a la mesa" y "Entregada" | "cuando esté lista para recoger" y "Recogida" |

**Para el sistema real (anotado, no corregido):**
- **Personal:** cobrar una mesa con platos en cocina los saca de la cocina; con "Todo junto" la
  propina de una persona se aplica a toda la mesa; los compañeros simulados (FN-0143, FN-0147) se
  repiten si hay varias mesas; "Por persona" no responde a las flechas; en "Formas de pago" las
  barras se escalan al mayor valor y no a 100 %; "Se acabó el maduro" ofrece tajadas aunque estén
  agotadas; lo que se agota estando en el carrito se envía igual; el ticket dice "con maduro ·
  tajadas en vez de maduro"; la caja a 768 px queda muy angosta; el total de la lista no incluye
  la propina.
- **Mesa:** los botones flotantes ("Llamar al mesero", "Escribinos") tapan el "+" y otros botones
  (propuesta: pasarlos al encabezado); "Avisar a caja" no pide confirmación; el aviso
  "Agregaste…" queda fuera de la pantalla; un doble toque en "+" suma 2; "Teléfono 1" como nombre;
  la propina "Otro monto" acepta cualquier valor; la categoría marcada no coincide con la sección
  que se ve.
- **Web:** el WhatsApp con "+505" se guarda mal (y acepta números que no empiezan con 5, 7 u 8);
  en tablet y computadora no se puede calificar; la promo del inicio lleva al menú y no a la
  promo; el buscador no ordena por parecido ni tolera errores; el resumen no muestra el WhatsApp
  ni la nota.
- **Contenido:** fotos que no corresponden (Sábado de fritanga), platos sin foto, "¿Qué trae?" de
  la fritanga dice gallo pinto y maduro pero se elige un solo acompañante, "orden" y "pedido"
  mezclados.

**No eran errores** (propio de una demo sin backend): navegadores distintos reciben el mismo
FN-0142; sin el personal abierto los pedidos avanzan solos; los textos "(ejemplo)"; "Abierto" a
las 11 pm con `?forzar=abierto`.

## 14. Revisión senior del panel

El 2026-11-22 un agente revisó el panel como desarrollador senior (código y app, a 1280 y 768 px).
Su veredicto: bien armado para la demo; le faltaba editar lo ya creado y había tres fallas que se
notaban. Se aplicó en la rama `revision-panel` (la rama `plantilla-mesa` ya estaba subida):

| Hallazgo | Cómo quedó |
|---|---|
| Borrar un plato dejaba viva su promo, con el nombre vacío | Se borra la promo con él; la ventana avisa antes ("Este plato está en una promo…") y se puede deshacer |
| Con el almacenamiento lleno, la foto "se guardaba" y se perdía al recargar | `saveDish` comprueba que quedó guardado; si no, deshace y dice "No hay espacio para más fotos…". Las fotos bajaron a 480 px |
| Un horario que cierra antes de abrir se guardaba sin preguntar | Avisa "cierra antes de abrir; si cierra pasada la medianoche, tocá Guardar de nuevo"; abrir y cerrar a la misma hora es error |
| No se podían editar las promos creadas | Lápiz en cada promo nueva: abre la misma ventana con sus datos |
| El Resumen no cambiaba con los cobros de la demo | Si hay cobros hoy, Vendido, Pedidos (con ticket promedio), canales y formas de pago salen del registro de caja; la nota lo aclara |
| Se borraba con un toque, sin deshacer | El aviso verde trae **Deshacer** durante 5 s (platos, promos, mesas, personas, volver al original) |
| Personas: no se podían quitar ni cambiar | **Editar** (nombre, rol y Quitar); tiene que quedar al menos un dueño |
| La promo del día se editaba también en Menú | Los platos de promo ya no salen en Menú (se manejan en Promos) |
| Una promo podía costar más que lo normal | Error: "La promo tiene que costar menos que lo normal (C$ 120)" |
| Tocar fuera de una ventana borraba el formulario | Las ventanas con formulario solo se cierran con ✕, Cancelar o Esc |
| La nota de Personal prometía un PIN para cancelar que no existe | Texto corregido; el registro ahora es **real** (lo que se cambia en el panel y en caja, con quién y a qué hora) y los ejemplos quedan aparte |
| Quitar una mesa con cuenta abierta | No se puede ("cobrala antes de quitarla"); al quitarla se limpia lo guardado de esa mesa |
| Menú sin buscar ni filtrar | Buscador y filtro por categoría; "Volver al original" para los platos de `menu.json`; la etiqueta Promo ya no se puede poner a mano |
| Las promos no podían cruzar la medianoche | Ahora sí ("Termina pasada la medianoche") |
| Accesibilidad: foco perdido al borrar, errores sin enlazar, estado repetido en los interruptores | El foco vuelve al botón principal; errores de días y horas con `aria-describedby`; interruptores sin el estado en el nombre |
| Reseñas no se actualizaban; la queja del Resumen no llevaba a Reseñas | Se actualizan solas (evento `storage`) y el Resumen tiene "Ver en Reseñas →" |
| La barra siempre decía "Dueño"; PIN como 1234 o 0000 | Muestra a quien entró con PIN (si es de esa área); los PIN nuevos no pueden ser triviales (los de la demo quedan) |

**Para el sistema real (anotado, no se hizo):** que el PIN proteja las pantallas (hoy los links
directos entran, a propósito, para la demo); reportes por fecha, exportar e historial completo;
editar la promo del día; acompañantes y extras por plato; responder y filtrar reseñas.

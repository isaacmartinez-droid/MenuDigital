# Vista QR · pedidos en mesa

Qué se construyó para el pedido en mesa de **Fritanga Nica**, cómo funciona cada pantalla y por
qué se decidió así. Para correr el proyecto, los flags de la demo y cómo cambiar de restaurante,
ver el [README](../README.md).

Rama: `plantilla-mesa` · Estado: terminada como demo, todo simulado en el navegador.

---

## 1. Qué es y qué no es

El cliente escanea el QR de su mesa, ve el menú, arma su pedido y lo manda **directo a la
cocina**, sin pasar por el mesero. Sigue su orden en vivo, puede llamar al mesero, pedir más
y, al final, avisa a caja cuánto y cómo va a pagar. **El pago siempre es en caja.**

- **Solo celular.** La vista de mesa no tiene versión de tablet ni de computadora (así lo pide
  el diseño).
- **Solo frontend.** No hay backend: los pedidos, la cocina, el mesero y la caja se simulan
  en `localStorage` con tiempos de la config.
- **Fuera de esta etapa:** cocina, caja, meseros, panel del dueño, web para llevar, servidor
  local, pagos en línea, login y reseña en Google.

Stack: React 19 · Vite 8 · TypeScript 6 · Tailwind CSS 4 · React Router 8 · Zustand 5 ·
lucide-react.

## 2. Rutas

| Ruta | Pantalla | Archivo |
|---|---|---|
| `/m/:mesa` | Portada (la primera vez) y Menú | `Welcome.tsx`, `Menu.tsx` |
| `/m/:mesa/plato/:dishId` | Detalle del plato | `DishDetail.tsx` |
| `/m/:mesa/pedido` | Tu pedido | `Order.tsx` |
| `/m/:mesa/orden/:comandaId` | Seguimiento de una orden | `Tracking.tsx` |
| `/m/:mesa/cuenta` | Tu cuenta | `Bill.tsx` |
| `/m/:mesa/cuenta/pagada` | Cuenta pagada | `Paid.tsx` |
| mesa que no existe | "Este QR no es válido" | `InvalidTable.tsx` |
| `/` | Redirige a `/m/5` (solo para la demo) | `RootRedirect.tsx` |
| `/componentes` | Muestrario de componentes (solo en desarrollo) | `ComponentsPreview.tsx` |

Las mesas válidas salen de `restaurant.json → tables` (hoy de la 1 a la 8). El menú va en el
paquete inicial; las demás pantallas se descargan en segundo plano después de abrirlo, para
que, si se va la señal, igual se pueda ver y enviar el pedido.

## 3. El recorrido completo

```
QR → Portada → Menú ─→ Detalle ─┐
                 │              │
                 └──→ Tu pedido ←┘ → ¿Enviamos tu pedido? → Seguimiento
                                        │                       │
                                 Pedir algo más            Pedir algo más (otra comanda,
                                 (vuelve al menú con        misma cuenta)
                                  el mismo pedido)              │
                                                         Ya vamos a pagar → Tu cuenta
                                                           → Avisar a caja → Pasá a caja
                                                           → ¡Cuenta pagada!
```

En todas las pantallas, salvo la portada y la cuenta pagada, está el botón flotante
**Llamar al mesero**.

## 4. Pantallas

### 4.1 Portada (`Welcome.tsx`)

- Logo, "Bienvenidos a Fritanga Nica" y **"Estás en la Mesa 5"**, para que el cliente
  confirme que escaneó el QR correcto.
- Campo **"¿A nombre de quién? (opcional)"**: si son varios en la mesa, así se sabe de quién
  es cada plato. Se guarda como nombre del pedido y se puede cambiar después en Tu pedido.
- Botón **Entrar al menú**. *Decisión:* el diseño la quitaba sola a los pocos segundos; se
  cambió por un botón para que dé tiempo a ver la mesa y poner el nombre.
- Sale solo la primera vez por mesa. En pantallas bajas se compacta (variante `short:`).

### 4.2 Menú (`Menu.tsx`)

**Arriba, en orden de prioridad** (se muestra uno solo a la vez):
1. Mensaje temporal (toast), por ejemplo "Agregado · Deshacer".
2. Fuera de horario, si la mesa todavía no tiene cuenta.
3. Sin señal.
4. Píldora **"Ya vamos a pagar"**, solo si este teléfono ya pidió algo. *Decisión:* antes
   salía aunque no se hubiera pedido nada, y no tenía sentido.

Además, mientras haya una orden en curso, una barra lleva de vuelta a su seguimiento.

**Contenido:**
- **Buscador**, que filtra platos y oculta los combos que no son de hoy. Sin resultados
  sugiere "Probá con:" y los más vendidos. Cuando el buscador sale de la vista, aparece una
  lupa en las pestañas de categorías.
- **Pestañas de categorías** fijas arriba, que marcan la sección en la que estás al bajar.
- **"Los más vendidos" en carrusel**, con tarjetas grandes (224 px, foto de 152 px y la
  descripción cortada en 2 líneas). Si hoy hay combo del día, va primero.
- **Secciones por categoría**, en el orden de `menu.json`: Fritangas, Combos, Asados,
  Antojitos, Bebidas. *Decisión:* los combos van en su lugar de la lista, no en un segundo
  carrusel ni amontonados arriba.
- **Tarjetas tocables enteras:** tocar cualquier parte abre el detalle, y el **+** agrega con
  un toque (con el acompañante por defecto). Al agregar, la barra del pedido da un saltito.
  Con el plato ya agregado, el + se vuelve un contador − / +.
- **Barra del pedido** abajo: cantidad de platos, total y **Ver pedido**.

**El carrusel:**
- Avanza solo cada 4 s (`timings.carouselMs`) y no se detiene nunca por sí mismo.
- Al tocarlo o deslizarlo, espera 4 s y sigue.
- Con el teclado dentro, se pausa.
- Tiene puntos y un botón de pausa, que sí lo detiene del todo.
- Con "reducir movimiento" activado en el teléfono, no avanza solo.

### 4.3 Combos especiales y combo del día

- Categoría `combos` con 2 combos de todos los días (Para dos y Familiar) y 3 de un día:
  Martes de enchiladas, Jueves de cerdo y Sábado de fritanga.
- Un combo con `days` solo se puede pedir ese día. **Ese día** dice "Combo de hoy", va
  primero en su sección y encabeza "Los más vendidos". **Los demás días** no aparece en el
  menú ni en la búsqueda.
- Si alguien abre el link de un combo que no es de hoy, ve "Este combo sale solo los martes"
  y dos alternativas que sí se pueden pedir.
- *Decisión:* la etiqueta genérica "promo" se quitó. El día lo indica la etiqueta del combo.
- Los combos y precios de ejemplo están **por confirmar con el local**.

### 4.4 Detalle del plato (`DishDetail.tsx`)

- Foto, nombre, precio y descripción. La calificación aparece solo si el plato tiene reseñas.
- **"Lo que dicen":** las reseñas escritas por clientes, solo si existen. *Decisión:* si un
  plato no tiene reseñas, no se muestra nada.
- **Acompañante, extras** (con un máximo por plato), **cantidad** y **nota del plato**. El
  ejemplo de la nota cambia por categoría: en bebidas dice "Ej.: sin hielo, poca azúcar".
- **Si no se puede pedir** (agotado o combo de otro día): no hay formulario. Se muestra el
  motivo, dos alternativas con + rápido y el botón **Ver el menú**.
- Desde Tu pedido, abrir un plato lo edita en lugar de agregar otro.

### 4.5 Tu pedido (`Order.tsx`)

*Decisión:* es la pantalla de servicio, así que se reorganizó en secciones claras.

- **Aviso de la cuenta** (si la mesa ya pidió): "Tu mesa ya pidió C$X · Con este pedido, la
  cuenta queda en C$Y · Ver cuenta".
- **Tus platos (n):** cada línea con cantidad, detalle y precio; **+ Agregar más platos**.
- **¿Algo para tomar?:** sugiere bebidas. Se oculta si ya hay una bebida en el pedido.
- **¿A nombre de quién?** (el mismo nombre de la portada).
- **Nota para la cocina**, en un solo lugar:
  - las notas de cada plato, editables aquí mismo o con ✕ para quitarlas;
  - una nota **"Para todo el pedido"**. Si ya hay una guardada, se ve como tarjeta con
    **Editar** y **Quitar**; si no, como campo para escribir.

  *Decisión:* antes la nota salía arriba y abajo; ahora solo aquí. La nota general se recuerda
  para el siguiente pedido, igual que el nombre.
- **Enviar a la cocina** con el tiempo estimado debajo.
- **Hoja "¿Enviamos tu pedido?":** repasa los platos, sus notas y la nota general antes de
  mandar.
  - **Sí, enviar** manda directo a la cocina.
  - **Pedir algo más** vuelve un paso, con el mismo pedido abierto, para que salga todo en
    una sola comanda.

- Límite de 10 platos por envío (`ordering.maxItemsPerComanda`).
- **Sin señal**, el pedido queda guardado y se envía solo cuando vuelve la conexión.

### 4.6 Seguimiento (`Tracking.tsx`)

- **Hora estimada en rango** mientras se cocina: "Lista entre 7:57 – 8:02 pm"
  (`readyEstimateMin` 15 y `etaRangeMin` 5), más "en X min" y la hora en que se pidió.
- **Barra de pasos:** Procesando → En el comal → ¡Ya está! → Entregada. El paso actual tiene
  una barra que se mueve y un pulso en su ícono, ambos apagados con "reducir movimiento".
- **Avisos en cada paso:** la tarjeta "¿Te avisamos en cada paso?" ofrece **Activar avisos**
  o **Ahora no**. Con permiso, llega una notificación al pasar a En el comal, Lista y
  Entregada (`notifications.statuses`); tocarla abre el seguimiento. Al quedar lista, el
  teléfono vibra (en Android) y la pestaña dice "¡Ya está!".
- **La comanda** (FN-0142…), con cada plato, su precio, el detalle y las notas.
- **Tus otras órdenes,** cada una con su estado; **Cuenta de la mesa,** con acceso directo.
- **Pedir algo más** crea otra comanda en la misma cuenta.
- **Plato agotado** (`?forzar=agotado`): si se acaba un acompañante de una orden en curso,
  sale la hoja "Se acabó el maduro · ¿Lo cambiamos?" y el cambio queda en la comanda.

### 4.7 Llamar al mesero (`WaiterButton.tsx`)

- Botón flotante tipo WhatsApp, abajo a la derecha, **en toda la app** salvo la portada y la
  cuenta pagada. Se ubica siempre sobre la barra de abajo de cada pantalla.
- Al bajar una lista se achica a la campana; al parar, vuelve a decir "Llamar al mesero".
- Al tocarlo se abre la hoja "¿Qué necesitás?", con tres opciones: Que venga el mesero,
  Servilletas o salsa, u Otra cosa.
- Después aparece la tarjeta "Avisamos a los meseros" y luego "Carlos va en camino".
- Por 2 min (`waiterCooldownMs`) queda atenuado y, si se toca, dice cuándo se puede volver a
  llamar.

### 4.8 Tu cuenta (`Bill.tsx`)

*Decisión:* cada persona paga desde su propio teléfono, así que la cuenta se centra en lo
suyo. Este es el orden de arriba abajo:

1. **"Pagás en caja al terminar":** efectivo o tarjeta, en caja, diciendo el número de mesa.
   Siempre visible arriba. *Decisión:* es lo más importante de la pantalla.
2. Si hay platos todavía en cocina, un aviso, y esos platos dicen "en cocina".
3. **Lo tuyo · {nombre}:** tus platos con su detalle.
4. **¿Qué vas a pagar?** Solo lo mío o toda la mesa, cada opción con su monto. Con "toda la
   mesa" se ve el resumen de lo que pidieron los demás.
5. **Propina voluntaria:** 10 % (sugerida y marcada), 15 %, Otro monto o Sin propina
   (`tip`).
6. **¿Cómo pagás?** (opcional): Efectivo o Tarjeta. Con efectivo, "¿Con cuánto pagás?" y el
   vuelto, para que caja lo tenga listo.
7. **Resumen "Vas a pagar":** consumo, propina y total.
8. **Calificación:**
   - Con hasta 2 platos (`ratings.perDishMax`): estrellas por plato y, después de calificar,
     un comentario corto opcional.
   - Con más platos: **"¿Todo estuvo rico?"** con Sí o Algo no, y un comentario opcional.
     Con "Algo no" se elige qué plato y se cuenta qué pasó.
   - Las reseñas se guardan aparte de la mesa y aparecen en "Lo que dicen" del detalle.
   - *Decisión:* se simplificó para que sea rápido y no se vea gigante. Es opcional, pero el
     objetivo es que todos los platos junten reseñas.
9. **Avisar a caja · C$ total** → "Pasá a caja y decí Mesa 5". Este aviso queda 10 min
   (`timings.billPaidMs`). *Decisión:* antes se quitaba demasiado rápido.

### 4.9 Cuenta pagada (`Paid.tsx`)

- "¡Cuenta pagada!", con el consumo, la propina, "Tu parte · Mesa 5" o "Mesa 5", con qué se
  pagó, el vuelto y quién cobró.
- **El teléfono se desconecta de la mesa:** se borra todo lo de esa mesa en este navegador,
  así los próximos clientes empiezan una cuenta nueva y no ven estos pedidos.

## 5. Estados especiales

| Estado | Qué pasa |
|---|---|
| **Fuera de horario** | Se ve el menú sin + ni barra de pedido. Si la mesa ya tenía cuenta, siguen Llamar al mesero y Ya vamos a pagar. *Decisión:* en el QR no sale "Escribinos" por WhatsApp (el cliente está en el local); eso queda para la web. |
| **Sin señal** | Aviso arriba; el pedido se guarda y se envía solo al volver ("Ya volvió la señal. Enviamos tu pedido."). El seguimiento sigue mostrando lo último. |
| **QR inválido** | "Este QR no es válido · Pedile ayuda al mesero". |
| **Compañeros de mesa** | Simulados por defecto: Carlos (2 enchiladas) y Teléfono 3 (2 frescos de cacao), para mostrar la cuenta compartida. Se quitan con `?compas=0`. |

## 6. Cómo está armado

- **Estado por mesa** (`src/store/`): carrito, comandas y cuenta en stores de Zustand, guardados
  en `localStorage` con claves `fritanga-nica:mesa:<id>:<nombre>`. `closeTable` los borra al
  pagar o con `?forzar=mesa-nueva`.
- **Servidor simulado** (`lib/api.ts`, `lib/simulator.ts`): el estado de cada comanda se calcula
  desde la hora en que se envió. Cada función de `api.ts` indica el endpoint que tendría en
  una API real; cambiando su interior, las pantallas no cambian.
- **Textos y datos:** todos los textos están en `restaurant.json → texts` (con voseo), y los
  platos en `menu.json`. Si falta un texto, TypeScript da error.
- **Reseñas** (`lib/reviews.ts`): se guardan en `fritanga-nica:resenas`, fuera de la mesa, para
  que sobrevivan al cierre.
- **Notificaciones** (`lib/notifications.ts`, `public/sw.js`): un service worker mínimo muestra
  las notificaciones y, al tocarlas, abre la pantalla.
  - Necesitan https o `localhost`.
  - Funcionan con la página abierta, aunque esté en segundo plano.
  - Con el navegador cerrado harían falta notificaciones push desde un backend.
- **Barra de abajo** (`CartBar.tsx`): publica su altura en `--dock-h`, así el botón del mesero
  y los avisos nunca la tapan.

## 7. Accesibilidad y rendimiento

- **Movimiento:** con "reducir movimiento" no hay animaciones (`motion-safe:`,
  `prefersReducedMotion()`) ni carrusel automático.
- **Teclado y lectores de pantalla:** todo se puede usar con teclado. Las hojas atrapan el
  foco y se cierran con Esc. Los estados se anuncian con regiones `aria-live`, y los botones
  de ícono tienen nombre accesible.
- **Fotos:** en WebP, con versión de 400 px para las listas (`npm run images`). Un plato sin
  foto muestra un fondo de espera.
- **Calidad:** `npm run build` y `npm run lint` pasan sin errores.

## 8. Flags de la demo

`?forzar=cerrado | abierto | agotado | pago-rapido | mesa-nueva | ninguno`, `?compas=0` y
`?dia=martes` (o `0`…`6`, o `hoy`). El detalle de cada uno está en el
[README](../README.md#flags-de-la-demo).

Ejemplo para presentar desde cero: `/m/5?forzar=mesa-nueva&forzar=abierto`.

## 9. Decisiones que cambian lo que dice el diseño

| Diseño (Figma) | Cómo quedó | Por qué |
|---|---|---|
| La portada se quita sola | Botón "Entrar al menú" y nombre opcional | Que se vea en qué mesa estás y se pueda diferenciar a cada persona |
| Fuera de horario con "Escribinos" | Sin WhatsApp en el QR | El cliente ya está en el local |
| Sin propina | Propina voluntaria con 10 % sugerido | Pedido del cliente |
| Se envía sin confirmar | Hoja "¿Enviamos tu pedido?" con Pedir algo más | Evitar envíos por error y juntar todo en una comanda |
| Llamar al mesero dentro de algunas pantallas | Botón flotante en toda la app | Que esté siempre a mano |
| Cuenta de toda la mesa | Lo tuyo primero, y elegís si pagás lo tuyo o toda la mesa | Cada persona paga desde su teléfono |
| Calificación por plato | "¿Todo estuvo rico?", o estrellas con hasta 2 platos | Más rápido y liviano |
| Etiqueta "promo" | Combos por día con "Combo de hoy" | Los días de combo llenan el local |

## 10. Pendiente del cliente

- **Fotos reales:** hoy solo hay 3 (fritanga tradicional, enchilada y combo para dos).
  - **Sin foto (7):** pollo asado, vigorón, tajadas con queso, fresco de cacao, chicha,
    pinolillo y gaseosa.
  - **Con foto prestada de otro plato (6):** combo familiar, los 3 combos del día, fritanga de
    cerdo y carne asada.
- **Confirmar los combos de ejemplo y sus precios.**
- **Datos para la web:** número de WhatsApp, dirección y enlace real de Google.
- **Crear el PR** de `plantilla-mesa` a `main`.

## 11. Historial

La rama se armó en etapas, con un commit por etapa:

- **Etapas a–f (base):** tokens, config y componentes; bienvenida, menú y agregar con un toque;
  detalle y Tu pedido; seguimiento, mesero y plato agotado; entregada, Ya vamos a pagar y cierre
  de la mesa; fuera de horario, sin señal, pulido y README.
- **Revisiones de cada pantalla, con el cliente:** portada con botón; fuera de horario en el QR;
  carrusel de más vendidos; combos del día; propina; confirmación antes de enviar; Tu pedido
  por secciones y nota editable; seguimiento con hora en rango y avisos; cuenta centrada en lo
  tuyo; calificación simple; detalle con alternativas; tarjetas tocables; mesero flotante;
  reseñas con comentario; notas en un solo lugar y flags de demo.

`git log --oneline main..plantilla-mesa` muestra los 28 commits.

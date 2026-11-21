# Vista QR · pedidos en mesa

Registro completo de lo que se construyó para el pedido en mesa de **Fritanga Nica**: cada
pantalla, por qué se decidió así, cómo está armado el código, la configuración, las
limitaciones y lo que queda pendiente. Para instalar y correr el proyecto, ver el
[README](../README.md). La web para llevar, que comparte buena parte del código, está en
[vista-web.md](vista-web.md).

- **Rama:** `plantilla-mesa`, todavía sin PR a `main`.
- **Estado:** terminada como demo, con todo simulado en el navegador.

## Índice

0. [Forma de trabajo](#0-forma-de-trabajo)
1. [Qué es y qué no es](#1-qué-es-y-qué-no-es)
2. [Rutas](#2-rutas)
3. [El recorrido completo](#3-el-recorrido-completo)
4. [Pantallas](#4-pantallas)
5. [Estados especiales](#5-estados-especiales)
6. [Arquitectura](#6-arquitectura)
7. [Referencia de archivos](#7-referencia-de-archivos)
8. [Configuración (`restaurant.json`)](#8-configuración-restaurantjson)
9. [Menú (`menu.json`)](#9-menú-menujson)
10. [Modelo de datos](#10-modelo-de-datos)
11. [Diseño visual (tokens)](#11-diseño-visual-tokens)
12. [Accesibilidad y rendimiento](#12-accesibilidad-y-rendimiento)
13. [Flags de la demo](#13-flags-de-la-demo)
14. [Decisiones que cambian lo que dice el diseño](#14-decisiones-que-cambian-lo-que-dice-el-diseño)
15. [Limitaciones conocidas](#15-limitaciones-conocidas)
16. [Notas para desarrollar](#16-notas-para-desarrollar)
17. [Bugs corregidos](#17-bugs-corregidos)
18. [Material de referencia](#18-material-de-referencia)
19. [Pendiente](#19-pendiente)
20. [Historial de commits](#20-historial-de-commits)

---

## 0. Forma de trabajo

Estas reglas valen para todo lo que sigue, empezando por la vista web.

1. **Primero se pasa todo tal como está en el Figma.** Cada pantalla de la etapa se construye
   fiel al diseño: textos, orden, medidas y comportamiento. No se mejora ni se cambia nada
   sobre la marcha.
2. **Las correcciones vienen después.** Recién cuando está pasado todo lo del Figma hasta ese
   momento, se revisa pantalla por pantalla y se corrige lo que haga falta.
3. **Si la documentación contradice una captura, se avisa antes de decidir.**
4. **Antes de construir, un plan corto, y se espera la aprobación.** Para cada corrección:
   propuesta con un boceto, aprobación ("Dale, hacelo así") y después la implementación.
5. **Al terminar cada etapa o corrección, siempre se sugiere:**
   - hacer el commit, con un mensaje claro;
   - actualizar la memoria del asistente;
   - si cambió algo visible, actualizar este documento y el README.
6. **Siempre:** todos los textos del restaurante salen de los JSON. Todo es accesible y
   respeta "reducir movimiento". Sin errores de TypeScript ni de lint.
7. **El material del cliente no se sube al repo:** los PDF, `fritanga-img.zip` y el prompt
   quedan fuera de git (`.gitignore`).

> En la vista QR las correcciones se hicieron pantalla por pantalla, mientras se construía.
> La sección 14 lista lo que quedó distinto al Figma por esas correcciones.

## 1. Qué es y qué no es

El cliente escanea el QR de su mesa, ve el menú, arma su pedido y lo manda **directo a la
cocina**, sin pasar por el mesero. Sigue su orden en vivo, puede llamar al mesero, pedir más
y, al final, avisa a caja cuánto y cómo va a pagar. **El pago siempre es en caja.**

- **Solo celular.** La vista de mesa no tiene versión de tablet ni de computadora (así lo pide
  el diseño). En pantallas grandes se ve centrada, con 480 px de ancho máximo.
- **Solo frontend.** No hay backend: los pedidos, la cocina, el mesero y la caja se simulan
  en `localStorage`, con tiempos de la config.
- **Fuera de esta etapa:** cocina, caja, meseros, panel del dueño, servidor local, pagos en
  línea, login y reseña en Google. La web para llevar se hizo después, en el mismo proyecto
  ([vista-web.md](vista-web.md)).

**Stack:**
- React 19, Vite 8 y TypeScript 6.
- Tailwind CSS 4, React Router 8 y Zustand 5.
- Íconos: lucide-react.
- Fuentes propias (sin Google): Figtree para el texto y Caveat para el número de comanda
  escrito a mano.

**Scripts:**

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor local en el puerto 5173 |
| `npm run build` | Revisa tipos y genera `dist/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | Solo revisa tipos |
| `npm run preview` | Sirve el build |
| `npm run images` | Genera la versión de 400 px de las fotos |

## 2. Rutas

| Ruta | Pantalla | Archivo |
|---|---|---|
| `/m/:mesa` | Portada (la primera vez) y Menú | `Welcome.tsx`, `Menu.tsx` |
| `/m/:mesa/plato/:dishId` | Detalle del plato | `DishDetail.tsx` |
| `/m/:mesa/plato/:dishId?linea=<id>` | Editar una línea del pedido | `DishDetail.tsx` |
| `/m/:mesa/pedido` | Tu pedido | `Order.tsx` |
| `/m/:mesa/orden/:comandaId` | Seguimiento de una orden | `Tracking.tsx` |
| `/m/:mesa/cuenta` | Tu cuenta | `Bill.tsx` |
| `/m/:mesa/cuenta/pagada` | Cuenta pagada | `Paid.tsx` |
| mesa o ruta de mesa que no existe | "Este QR no es válido" | `InvalidTable.tsx` |
| otra dirección (web) | "Página no encontrada" | `NotFound.tsx` (ver vista-web.md) |
| error al cargar una pantalla | Pantalla amable con "Reintentar" | `RouteError.tsx` |
| `/` y demás rutas sin `/m/` | Web para llevar (ver el README) | `WebLayout.tsx`, `Home.tsx`, … |
| `/componentes` | Muestrario de componentes (solo en desarrollo) | `ComponentsPreview.tsx` |

- Las mesas válidas salen de `restaurant.json → tables` (hoy, de la 1 a la 8).
- Las rutas se arman en `src/router.tsx` y los links, con `paths` (`lib/useMesa.ts`).
- El menú va en el paquete inicial. Las demás pantallas se descargan en segundo plano después
  de abrirlo (`prefetchScreens`), así, si se va la señal, igual se puede ver y enviar el pedido.
- El layout `MesaLayout` envuelve todas las pantallas de la mesa. Contiene la sesión de mesa,
  el botón del mesero y la restauración del scroll.

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

**Llamar al mesero** es un botón flotante que está en todas las pantallas, salvo la portada
y la cuenta pagada.

**Ciclo de vida de una mesa en este teléfono:**
1. Al primer envío se crea la cuenta. En la demo se suman los compañeros simulados.
2. Cada envío es una **comanda** nueva (FN-0142, FN-0143…). Una comanda enviada no se modifica
   nunca: "Pedir algo más" crea otra.
3. Al pagar, `closeTable` borra todo lo de esa mesa en el navegador. El próximo cliente
   empieza de cero.

## 4. Pantallas

### 4.1 Portada (`Welcome.tsx`)

- Logo, "Bienvenidos a Fritanga Nica" y **"Estás en la Mesa 5"**, para confirmar que se
  escaneó el QR correcto. Debajo, "Pedí desde aquí y te lo llevamos a la mesa."
- Campo **"¿A nombre de quién? (opcional)"**. La ayuda dice "Si son varios en la mesa, así se
  sabe de quién es cada plato." El nombre se guarda en el pedido (`cart.customerName`) y sale
  en la comanda, en la cuenta y ya escrito en Tu pedido.
- Botón **Entrar al menú**. Tocar fuera del botón no la cierra.
- Sale la primera vez que se abre esa mesa en la pestaña (`sessionStorage`, clave
  `…:bienvenida`).
- Mientras está abierta, el menú de fondo queda inerte y el botón del mesero se oculta
  (`useUi.welcomeOpen`).
- En pantallas de 700 px de alto o menos se compacta (variante `short:`), para que el botón
  entre sin scroll.
- *Decisión:* el diseño la quitaba sola a los 1,5 s. Se cambió por un botón para que dé
  tiempo a ver la mesa y poner el nombre.

### 4.2 Menú (`Menu.tsx`)

**Encabezado (`Header`):** logo, nombre, estado del local según el horario ("Abierto · cierra
10:00 pm" o "Cerrado ahora · abrimos a las 4:00 pm") y la pastilla "Mesa 5".

**Franja de arriba.** Se muestra una sola cosa a la vez, en este orden de prioridad:
1. Mensaje temporal (toast).
2. Fuera de horario, si la mesa todavía no tiene cuenta.
3. Sin señal.
4. Píldora **"Ya vamos a pagar"**, solo si este teléfono ya envió algo.
   *Decisión:* antes salía aunque no se hubiera pedido nada, o por pedidos de otros.

**Barra de orden en curso:** "Tu orden FN-0142 · cocinando", mientras haya una orden sin
entregar. Un toque abre su seguimiento.

**Buscador (`SearchBar`):** "¿Qué se te antoja?".
- Busca sin importar tildes ni mayúsculas.
- No muestra los combos que no son de hoy.
- Sin resultados dice "No encontramos 'x'" y "Probá con:", con los más vendidos como botones.
- Cuando el buscador sale de la vista, las pestañas muestran una **lupa** que vuelve arriba
  con el buscador listo.

**Pestañas de categorías (`CategoryTabs`):** fijas arriba. Llevan a cada sección y marcan la
sección en la que estás al bajar (`useScrollSpy`).

**"Los más vendidos" (`Carousel`):**
- Las tarjetas miden 224 px de ancho, con foto de 152 px, y "qué trae" cortado a 2 líneas.
- Si hoy hay combo del día, va primero.
- Avanza solo cada 4 s (`timings.carouselMs`) mientras se ve, y al llegar al final vuelve al
  inicio.
- Al tocarlo o deslizarlo, espera 4 s y sigue: nunca se queda detenido por un toque.
- Con el foco del teclado adentro no se mueve.
- Tiene puntos que marcan la tarjeta actual y un botón de pausa, que sí lo detiene del todo.
- Con "reducir movimiento" no arranca solo.

**Secciones por categoría:** siguen el orden de `menu.json → categories` (Fritangas, Combos,
Asados, Antojitos, Bebidas), con los agotados al final de cada una.

**Tarjetas (`DishCard`):**
- Tocar cualquier parte de la fila o de la tarjeta abre el detalle. Al tocar, se atenúa.
- Para teclado y lectores de pantalla, el botón es el nombre (en la fila) o la foto (en el
  carrusel).
- El **+** agrega con un toque, con el acompañante por defecto, sin abrir el detalle.
- Si el plato ya está en el pedido:
  - en la lista, el + se vuelve un contador − / +;
  - en el carrusel, aparece una pastilla con la cantidad.
- Los combos muestran su día ("Combo de hoy" o "Solo los martes") en lugar de etiquetas.
- Un plato agotado se ve atenuado, con "Agotado".

**Al agregar con el +:**
- Sale el aviso "Agregaste Fritanga tradicional · Con gallo pinto · lo cambiás en tu pedido",
  con **Deshacer**, durante 4 s (`timings.undoToastMs`).
- La barra del pedido da un saltito (no con "reducir movimiento").
- Si se pasa el límite, avisa: "Son muchos platos para un solo envío · Podés mandar hasta 10
  por vez…".

**Barra del pedido (`CartBar`):** "Ver pedido · N platos" y el total.

**Fuera de horario:** no hay + ni barra del pedido.

### 4.3 Combos especiales y combo del día

- Categoría `combos`, con dos tipos de combo:
  - **todos los días:** Combo para dos y Combo familiar;
  - **un día por semana:** Martes de enchiladas (`days: [2]`), Jueves de cerdo (`[4]`) y
    Sábado de fritanga (`[6]`).
- **El día del combo:** dice "Combo de hoy", va primero en su sección y encabeza "Los más
  vendidos".
- **Los demás días:** no aparece en el menú ni en la búsqueda.
- **Si alguien abre su link otro día:** ve "Este combo sale solo los martes" y dos
  alternativas que sí se pueden pedir.
- El día se calcula con la zona horaria del local (`useToday`) y se actualiza solo a
  medianoche. Con `?dia=` se puede simular otro día.
- Si no hay combos cargados, no aparece ni la pestaña ni la sección.
- *Decisión:* se quitó la etiqueta genérica "Promo". La sección es una lista como las demás,
  no un segundo carrusel.
- Los combos y precios de ejemplo están **por confirmar con el local**.

### 4.4 Detalle del plato (`DishDetail.tsx`)

- **Arriba:** foto grande con el botón Volver, etiqueta, nombre y precio.
- **Calificación:** "★ 4.8 (2 reseñas)" junto al nombre, solo si el plato tiene
  calificaciones. Si no tiene, no hay estrellas vacías.
- **Texto:** descripción y "¿Qué trae?".
- **Acompañante · Elegí 1:** viene marcado el de por defecto ("Viene así").
- **Extras · Hasta 3 · opcional:** al llegar al tope, los demás se deshabilitan.
- **Nota del plato:** el ejemplo cambia según la categoría (`notePlaceholder`; en bebidas,
  "Ej.: sin hielo, poca azúcar").
- **"Lo que dicen":** las reseñas con comentario, solo si existen. Incluye las de
  `menu.json` y las que dejan los clientes al pagar.
- **Barra de abajo:** contador y **Agregar · C$ total**. Al agregar, vuelve al menú con el
  aviso.
- **Si no se puede pedir** (agotado o combo de otro día):
  - no hay formulario;
  - se muestra el motivo ("Se acabó por hoy" o "Este combo sale solo los jueves");
  - hay dos alternativas, que se abren o se agregan con +;
  - la barra de abajo dice **Ver el menú**.
- **Editar desde Tu pedido:** `?linea=<id>` abre el plato con lo elegido y, al guardar,
  reemplaza esa línea en su misma posición.

### 4.5 Tu pedido (`Order.tsx`)

*Decisión:* es la pantalla de servicio, así que se reorganizó en secciones con título.

- **Aviso de la cuenta**, si la mesa ya pidió: "Tu mesa ya pidió C$ X · Con este pedido, la
  cuenta queda en C$ Y · Ver cuenta ›". Un toque abre la cuenta.
- **Tus platos (n):**
  - cada línea con foto, cantidad (− / +), detalle de extras y precio;
  - la pastilla "Con gallo pinto · cambiar" abre el detalle para cambiar el acompañante;
  - al final, **+ Agregar más platos**.
- **¿Algo para tomar?:**
  - sugiere las bebidas de `suggestedDrinks`;
  - una bebida sin foto se ve con un ícono de vaso;
  - se oculta si ya hay una bebida en el pedido.
- **¿A nombre de quién?:** es el mismo nombre de la portada. Si queda vacío, el pedido va como
  "Teléfono 1".
- **Nota para la cocina**, en un solo lugar:
  - Las notas de cada plato, editables ahí mismo y con ✕ para quitarlas. Un campo no
    desaparece mientras se vacía escribiendo.
  - **"Para todo el pedido":**
    - si no hay nota, es un campo para escribir ("Ej.: sin chile, traer todo junto…");
    - si ya hay una guardada, se ve como tarjeta con **Editar** y **Quitar**;
    - **Editar** vuelve al campo con el cursor al final, y al salir del campo se ve guardada
      otra vez.
  - La nota general se recuerda para el siguiente pedido, igual que el nombre.
  - *Decisión:* antes las notas salían en cada plato y también abajo. Ahora salen solo aquí.
- **Barra de abajo:** **Enviar a la cocina** y, debajo, "Listo en ~15 min · lo llevan a la
  Mesa 5".
- **Hoja "¿Enviamos tu pedido?":**
  - repasa los platos con sus notas, la nota general y "N platos · C$ total · a nombre de X";
  - **Sí, enviar a la cocina** manda la comanda y abre el seguimiento;
  - **Pedir algo más** cierra la hoja y vuelve un paso, con el mismo pedido abierto, para que
    salga todo junto en una comanda.
- **Límite:** 10 platos por envío (`ordering.maxItemsPerComanda`), con un aviso amable.
- **Sin señal:** queda "Sin señal: lo enviamos solito cuando vuelva", y se envía al volver la
  conexión.
- **Error:** "No pudimos enviar tu pedido · Probá de nuevo… Tu pedido sigue guardado."
- **Vacío:** "Todavía no agregaste nada." con **Ver el menú**.

### 4.6 Seguimiento (`Tracking.tsx`)

**Encabezado:** el titular cambia con cada paso.

| Paso | Titular |
|---|---|
| Recibida | "Estamos procesando tu orden · La cocina la recibe en un momento" |
| Cocinando | "Ya estamos cocinando tu pedido · Lista en unos N min" |
| Lista | "Tu comida está lista · El mesero ya la lleva a la Mesa 5" (en la web: "Pasá a recogerla") |
| Entregada | "¡Buen provecho! · Que la disfrutés" |

**Mientras se prepara:**
- La hora estimada se muestra en grande y en rango: "Lista entre 7:57 – 8:02 pm".
  `readyEstimateMin` (15) da la hora y `etaRangeMin` (5) el margen.
- Debajo, "En unos 15–20 min" (los minutos bajan con el tiempo) y la hora en que se pidió.

**Línea de tiempo (`TrackingTimeline`):** los cuatro pasos en vertical (Recibida, Cocinando,
Lista y Entregada; en la web, Recogida), cada uno con su ícono y la hora en que pasó.
- Los pasos hechos quedan en verde con su propio ícono (recibo, llama, campana o bolsa,
  cubiertos o paquete), unidos por una línea.
- El paso en curso va en ámbar, dice "ahora", tiene un pulso en el ícono y una barra que avanza;
  con "reducir movimiento" quedan quietos.
- Los que faltan van en gris; "Lista" muestra la hora estimada ("~7:57 pm").
- Al entregarse queda como la historia del pedido, con la hora de cada paso.
- En la demo los pasos duran segundos, así que las horas casi coinciden; con la cocina real
  (que manda la hora de cada cambio) se separan.
- *Decisión:* reemplazó a la barra horizontal con checks iguales, y "En el comal" y "¡Ya
  está!" pasaron a "Cocinando" y "Lista", más claros para todos.

**Avisos en cada paso:**
- La tarjeta "¿Te avisamos en cada paso?" ofrece **Activar avisos** o **Ahora no**. "Ahora
  no" se recuerda en la pestaña.
- Con permiso, llega una notificación del sistema al pasar a Cocinando, Lista y Entregada ("Ya estamos cocinando tu orden FN-0142", "Tu orden FN-0142 está lista")
  (`notifications.statuses`). Llega una por orden, y la nueva reemplaza a la anterior.
- Tocar la notificación abre ese seguimiento.
- Se siguen **todas** las órdenes de este teléfono que no se entregaron, aunque estés en otra
  pantalla.
- Al quedar lista, el teléfono vibra (en Android) y el título de la pestaña dice "Tu comida
  está lista" hasta que se entrega.

**Contenido:**
- **La comanda (`Comanda`):** el número FN-0142 escrito a mano (Caveat), la pastilla de mesa,
  cada plato con su precio y detalle (acompañante, extras, nota), la nota general y el total
  de la orden.
- **Tus otras órdenes:** cada una con su estado en vivo. Al tocar una, pasa a verse grande.
- **Cuenta de la mesa:** el total y **Ver cuenta**.
- **Pedir algo más:** crea otra comanda en la misma cuenta. No aparece con el local cerrado.

**Plato agotado** (`?forzar=agotado`):
- Si se acaba un componente de una orden en curso, sale la hoja (`SoldOutSheet`) "Se acabó el
  maduro · Tu fritanga venía con maduro… ¿Lo cambiamos?".
- Los reemplazos salen de `menu.json → replaceable`. Hoy solo los tiene la fritanga
  tradicional: tajadas, tostones o sin acompañante.
- El cambio queda registrado en la comanda sin tocar lo pedido: "Listo: cambiamos el maduro
  por Tajadas."

**Sin señal:** "Tu orden ya está en la cocina. Cuando vuelva la señal, seguimos mostrándote
cómo va."

### 4.7 Llamar al mesero (`WaiterButton.tsx`, `useWaiter`)

- **Dónde está:** es un botón flotante tipo WhatsApp, abajo a la derecha, en toda la app. No
  aparece en la portada, en la cuenta pagada ni con el local cerrado y sin cuenta.
- **Posición:** siempre por encima de la barra de abajo de cada pantalla (`--dock-h`).
- **Al bajar una lista** se achica a la campana y, al quedarse quieto, vuelve a decir "Llamar
  al mesero".
- **Al tocarlo** se abre la hoja "¿Qué necesitás?" (`WaiterSheet`), con los motivos de
  `waiterReasons`:
  - Que venga el mesero ("Para pedir algo o preguntar");
  - Servilletas o salsa;
  - Otra cosa ("Se lo decís cuando llegue").
- **Después de avisar:** encima del botón (`WaiterBanner`) sale "Avisamos a los meseros".
  A los 3 s (`waiterAckMs`) cambia a "Carlos va en camino · Podés volver a llamar en 2
  minutos".
- **Espera:** durante 2 min (`waiterCooldownMs`) queda atenuado. Si se toca, dice "Ya
  avisamos. Podés volver a llamar en 1:32".
- **Sin señal:** "No pudimos avisar · Se nos fue la señal. Probá de nuevo en un momento o
  hacele una seña al mesero."
- *Decisión:* antes estaba como botón dentro del menú y del seguimiento (`TableActions`, ya
  borrado). Ahora está en un solo lugar, siempre a mano.

### 4.8 Tu cuenta (`Bill.tsx`)

*Decisión:* cada persona paga desde su propio teléfono, así que la cuenta se centra en lo
suyo. Este es el orden de arriba abajo:

1. **"Pagás en caja al terminar · Efectivo o tarjeta, en caja. Solo decí tu número de
   mesa."** (`PaymentNotice`). Siempre arriba, antes de avisar a caja.
   *Decisión:* es lo más importante de la pantalla; en una versión se había quitado y se
   devolvió.
2. **Aviso de cocina:** si alguna orden tuya sigue en preparación, un aviso que no bloquea el
   pago. Esos platos dicen "en cocina".
3. **Lo tuyo · {nombre}:** todas las órdenes de este teléfono juntas, con detalle y precio
   por plato.
4. **¿Qué vas a pagar?** Dos opciones, cada una con su monto:
   - **Solo lo mío**, que es la opción por defecto;
   - **Toda la mesa**, que muestra lo de los demás por persona, con Ver detalle.
5. **Propina voluntaria:**
   - 10 % (sugerida y marcada), 15 %, Otro monto o Sin propina (`tip`);
   - cada porcentaje muestra cuánto es;
   - se calcula sobre lo que se paga y, si después piden algo más, se recalcula.
6. **¿Cómo pagás?** (opcional): Efectivo o Tarjeta. Con efectivo, "¿Con cuánto pagás?" y el
   vuelto, para que caja lo tenga listo.
7. **Vas a pagar:** consumo, propina y total.
8. **Calificación**, opcional:
   - **Con hasta 2 platos** (`ratings.perDishMax`): "¿Qué te pareció la comida?", con
     estrellas por plato. Al poner estrellas aparece una línea opcional "¿Qué tal estuvo?".
   - **Con más platos:** una sola pregunta, "¿Todo estuvo rico?", con **Sí, todo rico** o
     **Algo no**. Con "Algo no" se marcan los platos que no estuvieron bien y aparece "¿Qué
     pasó?". En los dos casos hay un comentario opcional.
   - **Qué se envía:** las estrellas de cada plato, 5 a todos si estuvo todo rico, o 2 a los
     marcados. Va junto con los comentarios y el nombre del cliente.
   - Las reseñas se guardan fuera de la mesa (`fritanga-nica:resenas`) y aparecen en el
     detalle del plato, con el promedio recalculado.
   - *Decisión:* se simplificó para que sea rápido y no se vea gigante. Es opcional, pero el
     objetivo es que todos los platos junten reseñas.
9. **Barra de abajo:** **Avisar a caja · C$ total** y, debajo, "Caja te prepara la cuenta
   para que no esperés".
10. **Después de avisar:** "Pasá a caja y decí Mesa 5 · María ya tiene tu cuenta lista", con
    el resumen de lo que se eligió.
    - El aviso queda **10 min** (`timings.billPaidMs`). Luego la caja "cobra" y se abre la
      cuenta pagada, aunque estés en otra pantalla.
    - *Decisión:* antes se quitaba demasiado rápido.

### 4.9 Cuenta pagada (`Paid.tsx`)

- Título: "¡Cuenta pagada! · Gracias por venir. Te esperamos pronto."
- Recibo:
  - **Consumo**, **Propina** y total;
  - **"Tu parte · Mesa 5"** si pagó solo lo suyo, o **"Mesa 5"** si pagó toda la mesa;
  - **Pagado con:** efectivo, tarjeta o lo que diga la demo;
  - **Vuelto**, si pagó con efectivo;
  - **Cobró:** "María · caja".
- **El teléfono se desconecta de la mesa:** se borra todo lo de esa mesa en este navegador.
  - Si pagó toda la mesa: "La mesa se cerró. Los próximos clientes empiezan una cuenta nueva
    y no ven estos pedidos."
  - Si pagó solo lo suyo: "Tu parte quedó pagada y este teléfono se desconectó de la mesa.
    Tus compañeros pagan lo suyo en caja."

## 5. Estados especiales

| Estado | Qué pasa |
|---|---|
| **Fuera de horario** | Se ve el menú sin + ni barra del pedido. Si la mesa ya tenía cuenta, siguen el mesero y Ya vamos a pagar, pero no "Pedir algo más". El horario sale de `schedule` (America/Managua, 4:00 a 10:00 pm todos los días). *Decisión:* en el QR no sale "Escribinos" por WhatsApp, porque el cliente ya está en el local. El componente `WhatsAppButton` se usa en la web. |
| **Sin señal** | Aviso "Se nos fue la señal · Tu pedido está guardado y se envía solito cuando vuelva" en el menú, el pedido y el seguimiento. Al volver: "Ya volvió la señal. Enviamos tu pedido." y se abre el seguimiento. Un candado por mesa evita mandar el mismo carrito dos veces. |
| **QR inválido** | "Este QR no es válido · No encontramos esta mesa. Pedile ayuda al mesero o escaneá el código de tu mesa." |
| **Pantalla que no carga** | `RouteError`, con "Reintentar". |
| **Compañeros de mesa** | Simulados por defecto al primer envío: Carlos (FN-0143, 2 enchiladas) y Teléfono 3 (FN-0147, 2 frescos de cacao). Sirven para mostrar la cuenta compartida. Se quitan con `?compas=0`. |

## 6. Arquitectura

### 6.1 Estado

**Estado por mesa** (`src/store/`). Cada store se crea con `tableStoreFactory` y se guarda en
`localStorage` con la clave `fritanga-nica:mesa:<id>:<nombre>` (la web usa los mismos stores
con `fritanga-nica:llevar:<nombre>`; ver [vista-web.md 8](vista-web.md#8-datos-que-se-guardan)):

| Store | Clave | Qué guarda |
|---|---|---|
| `cart` | `pedido` | Platos sin enviar, nombre, nota general y envío pendiente sin señal |
| `comandas` | `comandas` | Las comandas de la cuenta: las mías y las de los compañeros, con su estado y sus cambios |
| `account` | `cuenta` | Llamado al mesero, calificaciones, comentarios, qué se paga, propina, método, efectivo y aviso a caja |

**Otros datos guardados:**

| Dato | Dónde | Clave o archivo |
|---|---|---|
| Servidor simulado de la mesa | `localStorage` | `…:servidor` |
| Portada ya vista | `sessionStorage` | `…:bienvenida` |
| "Ahora no" en los avisos | `sessionStorage` | `…:avisos` |
| Flags de la demo | `sessionStorage` | `fritanga-nica:demo` |
| Reseñas | `localStorage`, fuera de la mesa | `fritanga-nica:resenas` |
| Estado de la interfaz (portada abierta, aviso temporal) | Solo en memoria | `store/ui.ts` |

- `lib/storage.ts` envuelve todo el acceso con `try/catch`, así funciona aunque el navegador
  bloquee el almacenamiento.
- `closeTable(mesa)` borra las claves de la mesa y reinicia los stores. Se usa al pagar y con
  `?forzar=mesa-nueva`.

### 6.2 Servidor simulado (`lib/api.ts`)

- Cada función tarda `apiLatencyMs` (600 ms) e indica en un comentario el endpoint que tendría
  en una API real ("API real:"). Cambiando su interior por `fetch` o WebSocket, las pantallas
  no cambian.

| Función | Qué hace |
|---|---|
| `sendComanda` | Envía el pedido y devuelve la comanda y la cuenta |
| `fetchAccount` | Trae la cuenta de la mesa |
| `watchComanda` | Avisa cada cambio de estado de una comanda |
| `callWaiter` | Llama al mesero con el motivo elegido |
| `watchWaiterCall` | Avisa cuando el mesero confirma que va |
| `requestBill` | Avisa a caja con lo que se paga, la propina, el método y el efectivo |
| `waitForPayment` | Espera el cobro y devuelve el recibo |
| `rateDishes` | Guarda las reseñas |
| `replaceComponent` | Registra el reemplazo de un plato agotado |

**Estados de una comanda** (`lib/simulator.ts`): se calculan solo con el tiempo desde el
envío, así que recargar la página no los reinicia.

| Estado | Duración |
|---|---|
| `recibida` | 3 s |
| `en-el-comal` | 8 s más |
| `lista` | 4 s más |
| `entregada` | Desde ahí en adelante |

### 6.3 Sesión de mesa (`MesaLayout.tsx` → `TableSession`)

Corre siempre, en cualquier pantalla de la mesa:
- **Reintenta el envío** pendiente cuando vuelve la señal.
- **Espera el pago** después de avisar a caja y, al cobrarse, abre la cuenta pagada.
- **`useKitchenUpdates`** (`lib/useKitchenUpdates.ts`, compartido con la web) sigue las
  órdenes de este teléfono que no se entregaron. En cada cambio de estado manda la
  notificación, vibra al quedar lista y cambia el título de la pestaña.
- Con `?forzar=mesa-nueva`, borra la mesa antes de mostrar nada y quita el flag de la URL.

### 6.4 Notificaciones (`lib/notifications.ts`, `public/sw.js`)

- `enableNotifications` pide permiso.
- `notifyStatus` muestra la notificación desde el service worker. Usa el id de la comanda
  como etiqueta, así la nueva reemplaza a la anterior y vuelve a sonar.
- `public/sw.js` es un service worker mínimo: al tocar la notificación, enfoca la pestaña y
  le pide abrir la URL. `main.tsx` la abre con `router.navigate`.
- `vercel.json` no reescribe `sw.js`.

### 6.5 Barra de abajo y botón flotante (`CartBar.tsx`)

- `BottomDock` publica su altura en la variable CSS `--dock-h` (`ResizeObserver`), así el
  botón del mesero y sus avisos nunca la tapan.
- `DockSpacer` deja el espacio al final de cada pantalla (`md` = h-40, `lg` = h-48).
- La utilidad `bottom-dock` se centra con `margin-inline: auto`, no con `transform`, para no
  chocar con la animación de subida.

### 6.6 Textos

- Todos los textos están en `restaurant.json → texts`, con voseo, y se usan con `t` y
  `fmt(plantilla, { variables })` (`lib/text.ts`).
- El tipo `Texts` se deduce del JSON: si un componente usa un texto que no existe, TypeScript
  da error.

## 7. Referencia de archivos

### 7.1 Componentes (`src/components/`)

| Componente | Qué es |
|---|---|
| `BottomSheet` | Hoja que sube desde abajo. Atrapa el foco, se cierra con Esc o tocando el fondo, y devuelve el foco a donde estaba |
| `Button` | Botón base, con 4 variantes: `primary` (verde, 52 px), `secondary` (contorno), `onDark` (blanco sobre verde, en la portada) y `pill` (pastilla blanca) |
| `Carousel` | Carrusel horizontal con avance automático, pausa, puntos y espera después de tocarlo; link opcional junto al título (`action`) |
| `CartBar` | `BottomDock` (barra fija de abajo), `DockSpacer` y `CartBar` ("Ver pedido", con el saltito) |
| `CategoryTabs` | Pestañas fijas de categorías, con la lupa opcional |
| `ChoiceRow` | Fila de opción (radio o check) y `GroupHeader` (título de grupo con regla y etiqueta opcional) |
| `Comanda` | Tarjeta de comanda: número a mano, platos, nota y total |
| `DishCard` | Plato en fila (lista) o en tarjeta (carrusel), tocable entera |
| `Header` | Encabezado del menú (`Header`) y de las pantallas internas, con Volver (`PageHeader`) |
| `NoticeBanner` | Aviso con tono positivo, de aviso o `pronto` (azul, lo que no está activo), título, texto y acción |
| `OptionCard` | Tarjeta elegible con título y ayuda (motivos del mesero) |
| `PaymentNotice` | "Pagás en caja al terminar"; con `takeout`, "Pagás al recoger" compacto (web) |
| `Photo` | Foto WebP con versión liviana de 400 px y fondo de espera si no hay foto |
| `QuantityStepper` | Contador − / + y el botón `AddButton` (+) |
| `SearchBar` | Buscador con botón para borrar |
| `SoldOutSheet` | Hoja "Se acabó el…" con los reemplazos |
| `StarRating` | Estrellas para calificar, usables con teclado |
| `Tag` | Etiqueta de color (ámbar, promo, combo, agotado, oscuro, contorno) |
| `Toast` | Aviso temporal con acción (Deshacer) |
| `TrackingTimeline` | Línea de tiempo vertical del seguimiento: ícono y hora de cada paso, con animación del paso actual |
| `WaiterBanner` | Tarjeta de estado del llamado al mesero |
| `WaiterButton` | Botón flotante "Llamar al mesero" con su hoja y sus avisos |
| `WaiterSheet` | Hoja "¿Qué necesitás?" |
| `WhatsAppButton` | Botón flotante "Escribinos" por WhatsApp. No se usa en el QR; sí en la web |

Los componentes propios de la web (`PromoCard`, `TakeoutTicket`) están en
[vista-web.md 11](vista-web.md#11-referencia-de-archivos).

### 7.2 Lógica (`src/lib/`)

| Archivo | Qué hace |
|---|---|
| `api.ts` | Servidor simulado (ver 6.2) |
| `catalog.ts` | Único lugar que lee los JSON: `restaurant`, `menu`, `getDish`, `getSide`, `getExtra`, `unitPrice`, `dishesByCategory`, `isValidTable` |
| `channel.ts` | `TAKEOUT` (`'llevar'`) e `isTakeout`: el id que usan las pantallas compartidas en la web |
| `closeTable.ts` | Borra la mesa del navegador y reinicia sus stores |
| `comandaStatus.ts` | `itemDetails` (detalle de un plato), `statusLabel`, `sentAtClock`, `etaMinutes`, `etaFor` (rango de hora), `stepClocks` (hora de cada paso) y `activeComanda` |
| `combos.ts` | `isOnDay`, `dayBadge`, `combosFor(hoy)`, `bestSellersFor(hoy)`, `onlyDaysText`, `daysLabel` y `useToday` |
| `cx.ts` | Une clases CSS |
| `demoFlags.ts` | Lee y guarda los flags de la demo (`readDemoFlags`, `useDemoFlags`, `wantsFreshTable`, `clearAgotado`) |
| `money.ts` | `formatMoney` (C$ en es-NI), `formatMoneyDelta` y `tipAmount` |
| `motion.ts` | `prefersReducedMotion` y `scrollBehavior` |
| `notifications.ts` | Ver 6.4 |
| `orderFlow.ts` | `submitCart` (arma y envía la comanda con candado; en la web, con nombre, WhatsApp y origen), `toComandaItems` y `customerLabel` |
| `reviews.ts` | `loadReviews`, `addReviews`, `reviewsFor(plato)` (junta las del JSON con las guardadas), `reviewsToSend` (qué reseñas manda la calificación, compartido con la web) e `isRated`/`markRated` (web) |
| `schedule.ts` | Horario en la zona del local: `getOpenState`, `nextOpening`, `todayClosing`, `zonedNow` y `formatClock` |
| `simulator.ts` | Estado de la comanda según el tiempo (ver 6.2) |
| `source.ts` | Origen de la visita web (`?src=`) |
| `storage.ts` | Acceso seguro a `localStorage` y `sessionStorage`, claves por mesa y `newId` |
| `text.ts` | `t`, `fmt`, `platos(n)` y `tableLabel` |
| `useGoBack.ts` | Volver atrás, o a una ruta de respaldo si se entró directo por link |
| `useKitchenUpdates.ts` | Sigue los pedidos en curso (ver 6.3) |
| `useLiveComanda.ts` | Comanda con su estado en vivo |
| `useMesa.ts` | Mesa actual (o `llevar` en la web) y `paths` (links de todas las pantallas, de los dos canales) |
| `useNow.ts` | Hora que se actualiza cada cierto intervalo |
| `useOnline.ts` | Si hay señal |
| `useOpenState.ts` | Si el local está abierto (con los flags de la demo) |
| `useScrollSpy.ts` | Qué sección se está viendo, para las pestañas |
| `useWaiter.ts` | Lógica del llamado al mesero: fases, espera y sin señal |

### 7.3 Otros

| Archivo | Qué hace |
|---|---|
| `src/main.tsx` | Arranque: aplica el tema, registra el service worker y monta el router |
| `src/router.tsx` | Rutas y precarga de pantallas |
| `src/theme/index.css` | Tokens de Tailwind (`@theme`), utilidades (`bottom-dock`), variante `short:` y animaciones |
| `src/theme/applyTheme.ts` | Pasa los colores de la config a variables CSS |
| `src/store/tableStore.ts` | Fábrica de stores por mesa con persistencia |
| `src/store/ui.ts` | Estado de interfaz: aviso temporal (`flash`) y portada abierta (`welcomeOpen`) |
| `scripts/optimize-images.mjs` | Genera `<foto>-400.webp` para las listas |
| `vercel.json` | Build, reescrituras (todo menos `assets/`, `img/` y `sw.js` va a la app) y caché |
| `public/sw.js` | Service worker de notificaciones |

## 8. Configuración (`restaurant.json`)

| Clave | Valor actual | Para qué |
|---|---|---|
| `id` | `fritanga-nica` | Prefijo de las claves de almacenamiento |
| `name`, `logo` | Fritanga Nica, `/img/logo.webp` y `.png` | Marca |
| `colors` | 14 colores (ver 11) | Se aplican como variables CSS al arrancar |
| `currency` | `C$`, `es-NI` | Formato de dinero |
| `tip` | `percents: [10, 15]`, `suggested: 10` | Propina de Tu cuenta |
| `ratings` | `perDishMax: 2` | Hasta cuántos platos se califica con estrellas |
| `tables` | `"1"` … `"8"` | Mesas válidas |
| `whatsapp` | `50500000000` y un mensaje | Botón Escribinos. **El número es de ejemplo** |
| `web` | Portada, dirección, mapa, Google, envío, dígitos del WhatsApp y orígenes | Solo la web (ver [vista-web.md 9](vista-web.md#9-configuración)) |
| `schedule` | America/Managua, todos los días de 16:00 a 22:00 | Abierto o cerrado. Las franjas pueden cruzar la medianoche |
| `ordering` | máx. 10 por envío, prefijo `FN`, primera comanda 142, este teléfono = Teléfono 1 | Comandas |
| `notifications` | `statuses: ["en-el-comal", "lista", "entregada"]` | En qué pasos se avisa |
| `staff` | mesero Carlos, cajera María | Nombres de la demo |
| `waiterReasons` | 3 motivos | Hoja del mesero |
| `demo.tableMates` | Carlos y Teléfono 3 | Compañeros simulados |
| `demo.paymentMethod` | `Tarjeta` | Método del recibo si el cliente no eligió uno |
| `texts` | Todos los textos, por pantalla (`common`, `status`, `welcome`, `invalidTable`, `menu`, `combos`, `closed`, `offline`, `detail`, `order`, `tracking`, `waiter`, `soldOut`, `bill`, `payment`, `paid` y `web`) | Interfaz |

**`timings`.** Los valores son en milisegundos, salvo los que dicen min.

| Clave | Valor | Qué controla |
|---|---|---|
| `carouselMs` | 4000 | Avance del carrusel y espera después de tocarlo |
| `undoToastMs` | 4000 | Cuánto dura el aviso con Deshacer |
| `processingMs` | 3000 | Duración de "Procesando" |
| `cookingMs` | 8000 | Duración de "Cocinando" |
| `readyMs` | 4000 | Duración de "Lista" hasta "Entregada" |
| `readyEstimateMin` | 15 | Minutos estimados que se muestran |
| `etaRangeMin` | 5 | Margen del rango de hora |
| `waiterAckMs` | 3000 | Cuánto tarda "Carlos va en camino" |
| `waiterBannerMs` | 4000 | Cuánto se ve el aviso del mesero |
| `waiterCooldownMs` | 120000 | Espera para volver a llamar |
| `billPaidMs` | 600000 | Cuánto queda "Pasá a caja" antes del cobro simulado (10 min) |
| `apiLatencyMs` | 600 | Demora simulada de cada llamada |
| `webWelcomeMs` | 2000 | Bienvenida de la web (se quita sola) |
| `webConfirmMs` | 5000 | Confirmación de la web (pasa sola al seguimiento) |

## 9. Menú (`menu.json`)

- **`categories`:** `fritangas`, `combos`, `asados`, `antojitos` y `bebidas`. Las bebidas
  tienen `notePlaceholder`.
- **`tags`:** cada etiqueta tiene `label`, `tone` y `showInList`. Con `showInList: false`, solo
  sale sobre la foto (carrusel y detalle).
- **`sides` y `extras`:** acompañantes y extras. Los extras tienen precio y un nombre corto
  opcional.
- **`dishes`:** 17 platos.
  - **Datos del plato:** `price`, `shortDescription`, `description`, `includes` e `image`.
  - **Opciones:** `tags`, `sides`, `defaultSide`, `extras` y `maxExtras`.
  - **Disponibilidad y reseñas:** `days`, `available`, `rating` y `reviews`.
  - **`replaceable`:** las partes que pueden agotarse, con sus reemplazos.
- **`bestSellers`:** `fritanga-tradicional`, `enchilada` y `combo-para-dos`.
- **`promo`** (solo web) y el plato **`promo-2-enchiladas`** (C$ 160, en combos, con la
  etiqueta "Promo"), que también se ve en "Combos especiales" de la mesa.
- **`suggestedDrinks`:** `fresco-de-cacao` y `chicha`.
- **Agotados hoy** (`available: false`): fritanga de cerdo y tajadas con queso.

## 10. Modelo de datos

En `src/types/`, con la forma que tendría la respuesta de una API:

- **`Dish`, `Category`, `Tag`, `SideOption`, `Extra`, `Review`, `Rating`,
  `ReplaceableComponent`, `Substitute`** (`menu.ts`).
- **`CartItem`:** una línea sin enviar, con `lineId`, plato, cantidad, acompañante, extras y
  nota.
- **`Comanda`:**
  - `id` ("FN-0142"), `number`, `tableId` y `customerName`;
  - `mine`, que dice si la hizo este teléfono;
  - `items`, `note` y `total`;
  - `status`, `createdAt` y `statusAt`;
  - `substitutions`;
  - solo en la web: `channel` (`mesa`, `llevar` o `mostrador`), `phone` y `source`.
- **`ComandaItem`:** guarda nombres y precios **del momento del envío**, para que un cambio de
  menú no altere lo pedido.
- **`ComandaStatus`:** `recibida`, `en-el-comal`, `lista` o `entregada`.
- **`BillRequest`:**
  - `scope` (`PayScope`): `mine` o `table`;
  - `tip` (`TipChoice`): porcentaje, monto o ninguna;
  - `method` (`PayMethod`): `efectivo`, `tarjeta` o `null`;
  - `cashGiven`.
- **`Receipt`** (`api.ts`): `scope`, `subtotal`, `tip`, `total`, `method` y `change`.
- **`RestaurantConfig`** (`restaurant.ts`) y **`Texts`**, que se deduce del JSON.

## 11. Diseño visual (tokens)

Definidos en `src/theme/index.css` (`@theme`). Los colores se sobrescriben desde la config.

- **Colores:**
  - verde `#1F6B3A` y verde suave;
  - ámbar `#F2B33D` y ámbar suave;
  - texto sobre ámbar;
  - promo `#B8402A`;
  - fondo de combo;
  - fondo `#FAF7F2` y tarjeta;
  - texto `#2A211B` y texto secundario;
  - borde, foto vacía y azul del logo `#14237A`.
- **Tipografía:** Figtree para todo y Caveat para el número de comanda.

  | Tamaño | Medida |
  |---|---|
  | `display` | 44 / 52 |
  | `title-lg` | 28 / 36 |
  | `title` | 22 / 28 |
  | `section` | 18 / 24 |
  | `dish` | 15 / 20 |
  | `body` | 14 / 20 |
  | `small` | 12 / 16 |
  | `button` | 16 / 20 |
  | `price` | 15 / 20 |
  | `comanda-lg` | 56 / 60 |
  | `comanda` | 32 / 36 |

- **Radios:** chico 6, tarjeta 12, grande 16, hoja 24 y completo.
- **Ancho de la app:** 480 px como máximo.
- **Animaciones:**

  | Animación | Para qué |
  |---|---|
  | `sheet-in` | Las hojas suben |
  | `fade-in` | Aparición suave |
  | `pop-in` | Entrada con rebote corto |
  | `progress` | Barra del paso actual |
  | `ping-soft` | Pulso del ícono |

  Todas van con `motion-safe:`.
- **Variante `short:`:** pantallas de 700 px de alto o menos.
- Las medidas se tomaron de las capturas de Figma. Por ejemplo, el contador mide 97 × 37 en
  la lista y 112 × 46 en el detalle.

## 12. Accesibilidad y rendimiento

- **Movimiento:** con "reducir movimiento" no hay animaciones, el carrusel no avanza solo y el
  scroll es instantáneo.
- **Teclado:** todo se puede usar con teclado.
  - Las hojas atrapan el foco, se cierran con Esc y devuelven el foco.
  - El carrusel se pausa con el foco adentro.
- **Lectores de pantalla:**
  - los botones de ícono tienen nombre ("Uno más de Enchilada", "Quitar la nota de…");
  - los cambios se anuncian con `aria-live` (avisos, contador, seguimiento);
  - las tarjetas tocables tienen un solo botón real (el nombre o la foto), para no repetir.
- **Contraste:** el texto sobre ámbar usa `texto-sobre-ambar`.
- **Fotos:** en WebP. La de 400 px (≈25 KB) va en las listas y la de 800 px solo en el
  detalle, con respaldo a la original. Un plato sin foto muestra un fondo de espera.
- **Carga:** el menú va en el paquete inicial y el resto de las pantallas se precarga en
  segundo plano.
- **Calidad:** `npm run build` y `npm run lint` pasan sin errores.

## 13. Flags de la demo

Se agregan a cualquier URL y quedan activos mientras la pestaña esté abierta.

| Flag | Qué hace |
|---|---|
| `?forzar=cerrado` | Fuera de horario |
| `?forzar=abierto` | Abierto aunque sea fuera de horario |
| `?forzar=agotado` | Hoja "Se acabó el maduro" sobre la orden en curso (una vez) |
| `?forzar=pago-rapido` | Caja cobra a los 5 s en vez de 10 min |
| `?forzar=mesa-nueva` | Borra esa mesa en el navegador y empieza de cero, con portada |
| `?forzar=ninguno` | Quita los forzados |
| `?compas=0` | Sin compañeros de mesa simulados |
| `?dia=martes` | Simula otro día (`jueves`, `sabado`, `0`…`6` o `hoy`) |

Se pueden combinar: `/m/5?forzar=mesa-nueva&forzar=abierto`. Sin señal no necesita flag: en
Chrome, DevTools → Network → **Offline**.

## 14. Decisiones que cambian lo que dice el diseño

Todas se tomaron con el cliente al revisar cada pantalla.

| Diseño (Figma) | Cómo quedó | Por qué |
|---|---|---|
| La portada se quita sola a los 1,5 s | Botón "Entrar al menú" y nombre opcional | Que se vea en qué mesa estás y se pueda diferenciar a cada persona |
| Fuera de horario con "Escribinos" | Sin WhatsApp en el QR, y la mesa con cuenta sigue | El cliente ya está en el local |
| Sin propina | Propina voluntaria con 10 % sugerido | Pedido del cliente |
| Se envía sin confirmar | Hoja "¿Enviamos tu pedido?" con Pedir algo más | Evitar envíos por error y juntar todo en una comanda |
| Tu pedido como lista simple | Secciones con título, aviso de cuenta, hora estimada y nota editable | Es la pantalla de servicio |
| "Lista en unos 15 min" | Hora en rango, barra animada y avisos en cada paso | Que se sepa cuándo está lista sin mirar la pantalla |
| Barra de 4 pasos con checks, "En el comal" y "¡Ya está!" | Línea de tiempo con el ícono y la hora de cada paso; "Cocinando" y "Lista" | Los checks iguales no decían nada; los textos nuevos son más claros |
| Botones del mesero dentro de algunas pantallas | Botón flotante en toda la app | Que esté siempre a mano |
| Cuenta de toda la mesa, por persona | Lo tuyo primero, y elegís si pagás lo tuyo o toda la mesa | Cada persona paga desde su teléfono |
| "¿Pagan juntos o cada quien lo suyo?" | "¿Qué vas a pagar?" con montos, y "¿Cómo pagás?" con vuelto | Más claro, y caja se prepara |
| Calificación de un toque por plato | "¿Todo estuvo rico?", o estrellas con hasta 2 platos, con comentario | Más rápido, y deja reseñas |
| Pago simulado a los 5 s | "Pasá a caja" queda 10 min | Da tiempo de ir a caja |
| Etiqueta "Promo" | Combos por día con "Combo de hoy" | Los días de combo llenan el local |
| Combo de otro día visible y desactivado | Oculto, y su link ofrece alternativas | No tiene sentido ver el combo del jueves un sábado |
| Solo el + agrega | La tarjeta entera abre el detalle | Más fácil en el teléfono |
| Reseñas con estado vacío | "Lo que dicen" solo si hay reseñas | No mostrar secciones vacías |

## 15. Limitaciones conocidas

- **No hay sincronización real entre teléfonos.** Los compañeros de mesa se simulan; dos
  celulares reales en la misma mesa no ven lo del otro. Hace falta un backend.
- **La cocina, el mesero y la caja son simulados** con tiempos fijos.
- **Notificaciones:**
  - solo con https o `localhost`; por la IP de la red local (ej. `192.168.1.15:5173`) no
    aparecen;
  - funcionan con la página abierta, aunque esté en segundo plano;
  - con el navegador cerrado harían falta notificaciones push desde un backend;
  - en iPhone solo funcionan con la app agregada a la pantalla de inicio.
- **La vibración** solo funciona en Android.
- **Todo vive en el navegador.** Borrar los datos del sitio o usar modo incógnito empieza de
  cero. Las reseñas de clientes solo las ve ese navegador.
- **No hay pruebas automáticas en el repo.** Las pruebas se hicieron con scripts de puppeteer
  (Chrome) fuera del proyecto: recorren cada pantalla, sacan capturas y verifican el
  comportamiento. Si se quieren en el repo, habría que sumar Playwright o Vitest.
- **No hay seguridad:** cualquiera con el link de una mesa puede pedir por ella. Hace falta un
  token por mesa o el control del servidor.

## 16. Notas para desarrollar

- **OneDrive y Vite:** el proyecto está dentro de OneDrive y, a veces, Vite no se entera de
  los cambios y sirve una versión vieja.
  - **Arreglo:** reiniciar con `npx vite --force`, o tocar el archivo cambiado para
    actualizar su fecha.
  - Lo mejor es mover el repo fuera de OneDrive.
- **Para probar en el celular:** `npx vite --host` y abrir `http://<IP-de-la-PC>:5173/m/5`
  desde la misma red. Ahí las notificaciones no funcionan (ver 15).
- **Para empezar de cero:** `?forzar=mesa-nueva`. Un total raro suele ser un pedido viejo
  guardado en el navegador.
- **Para cambiar de restaurante:** solo los dos JSON y las fotos (ver el README).
- **Para conectar una API:** solo `lib/api.ts` y `lib/catalog.ts` (ver el README).
- **Para publicar:** Vercel, con `vercel.json` ya listo. Cada mesa queda en
  `https://<dominio>/m/<mesa>`, y ese es el link de cada QR.
- **Sin `gh` en esta PC:** los PR se crean a mano desde el link de comparación de GitHub.

## 17. Bugs corregidos

| Problema | Causa | Arreglo |
|---|---|---|
| La hoja "¿Enviamos tu pedido?" salía corrida a la derecha y saltaba al centro | `bottom-dock` se centraba con `translateX(-50%)`, y la animación también usa `transform` | Se centra con `left: 0; right: 0; margin-inline: auto` |
| El carrusel se congelaba después de tocar + en Chrome | El clic deja el foco en el botón, y el carrusel se pausaba con cualquier foco | Solo se pausa con foco de teclado (`:focus-visible`) |
| La nota general pasaba a tarjeta mientras se escribía | Al escribir se consideraba "ya guardada" | Se marca en edición al enfocar el campo |
| Al tocar Editar, el cursor quedaba al principio de la nota | El campo se enfocaba sin posición | `setSelectionRange` al final |
| El campo de nota de un plato desaparecía al borrarlo escribiendo | Se mostraba solo si había nota | Se recuerdan los campos abiertos mientras se edita |
| Salía "Ya vamos a pagar" sin haber pedido | Contaba los pedidos de los compañeros | Solo cuenta las comandas de este teléfono |
| Notas repetidas arriba y abajo en Tu pedido | Se mostraban en el plato y en la sección de notas | Solo en "Nota para la cocina" |
| "Pasá a caja" se quitaba muy rápido | Cobro simulado a los 5 s | 10 min (`billPaidMs`) y `?forzar=pago-rapido` para la demo |
| El cartel "Pagás en caja" desapareció en un rediseño | Se había movido bajo el botón | Volvió arriba de la cuenta |
| El aviso de cerrado tapaba los botones de una mesa abierta | La prioridad de la franja no miraba si había cuenta | Con cuenta, siguen el mesero y Ya vamos a pagar |
| Un total de "C$ 480" que no coincidía | Pedidos viejos de pruebas guardados en el navegador | `?forzar=mesa-nueva` |
| El + aparecía en combos de otro día | Vite servía una versión vieja (OneDrive) | Reiniciar con `--force` (no era el código) |
| Errores de lint y de tipos durante el desarrollo | Una variable sin usar, `badge` obligatorio en `GroupHeader` y `itemDetails` exportado desde un componente | Se corrigió cada uno; `itemDetails` se movió a `lib/comandaStatus.ts` |

## 18. Material de referencia

No está en el repo; lo tiene el equipo.

- **Diseño:** `Fritanga Nica · Documentación del diseño en Figma.pdf`, 12 páginas, en la raíz
  del proyecto e ignorado por git.
  - La página 02 es el pedido en mesa (M0–M9).
  - La página 03 es la web para llevar (W, T y D), en curso ([vista-web.md](vista-web.md)).
- **Capturas de mesa:** `Downloads\fritanga-capturas-mesa` (y su `.zip`).
- **Plugin de Figma que arma las pantallas:** `Downloads\fritanga-nica-app-completa\code.js`.
  Sirve para sacar textos y medidas de las pantallas que no tienen captura.
- **Entregas anteriores del diseño:** `Downloads\fritanga-nica-etapa-1` a `etapa-5`,
  `fritanga-nica-limpieza` y `fritanga-nica-menu-claro`.
- **QR de reseña:** `Downloads\qr-resena-fritanganica.svg`.
- **Brief original:** `prompt-claude-code-fritanga-mesa.md`, en la raíz e ignorado por git.

## 19. Pendiente

**Del cliente:**
- **Fotos reales.** Hoy solo hay 3: fritanga tradicional, enchilada y combo para dos.
  - **Sin foto (7):** pollo asado, vigorón, tajadas con queso, fresco de cacao, chicha,
    pinolillo y gaseosa.
  - **Con foto prestada de otro plato (6):** combo familiar, los 3 combos del día, fritanga de
    cerdo y carne asada.
- **Confirmar los combos de ejemplo y sus precios.**
- **Datos reales:** número de WhatsApp, dirección y enlace del perfil de Google.

**Del proyecto:**
- Crear el PR de `plantilla-mesa` a `main`.
- La **vista web para llevar** está en curso: ver [vista-web.md](vista-web.md).

## 20. Historial de commits

`git log --oneline main..plantilla-mesa` muestra todos los commits. El detalle de cada cambio
está en el cuerpo de su commit.

**Construcción base, por etapas:**

| Commit | Etapa |
|---|---|
| `7629412` | a: tokens, configuración y componentes base |
| `161918c` | b: bienvenida, menú y agregar con un toque |
| `b28ab6e` | c: detalle del plato y Tu pedido |
| `f0ba8ca` | d: seguimiento, llamar al mesero y plato agotado |
| `5750683` | e: entregada, Ya vamos a pagar y cierre de la mesa |
| `f92b8f7` | f: fuera de horario, sin señal, pulido y README |

**Correcciones con el cliente, pantalla por pantalla:**

| Commit | Cambio |
|---|---|
| `cccca4f` | Portada con botón y nombre del cliente |
| `5bef5b8` | Fuera de horario en el QR: sin "Escribinos" y la mesa abierta sigue |
| `1c3a986` | Carrusel en "Los más vendidos" |
| `93a3ffa` | Combos especiales y combo del día |
| `aef86c2` | Combos debajo de Fritangas, en el orden de categorías |
| `7292471` | Combo de hoy en Los más vendidos y Combos como lista |
| `e735b72` | Propina sugerida en la cuenta |
| `ee5fc96` | Confirmación antes de enviar a la cocina |
| `3c871ad` | Tu pedido: secciones, nota para la cocina y tiempo estimado |
| `ab2bc07` | Nota para la cocina editable |
| `69f077d` | Hojas centradas mientras suben |
| `0bb68cb` | Seguimiento: todas tus órdenes, tiempo que baja y aviso al estar lista |
| `37ced2d` | Tu cuenta centrada en lo tuyo |
| `8400665` | Detalle sin formulario si no se puede pedir, con alternativas |
| `20c569b` | Calificación simple |
| `06b86e4` | Seguimiento: barra animada, hora en rango y avisos en cada paso |
| `b396dd5` | Tarjetas de plato tocables enteras |
| `77f4647` | "Lo que dicen" solo si hay reseñas |
| `afcb9de` | Menú: botones según la cuenta, lupa, sugerencias y saltito de la barra |
| `eabd5e8` | Llamar al mesero como botón flotante |
| `625badf` | Reseñas con comentario, carrusel que no se detiene y Pagás en caja visible |
| `6d45de2` | Notas en un solo lugar, aviso de cuenta, Pasá a caja 10 min y flags de demo |
| `66a6053` | Primera versión de esta documentación |
| `7f37c4a` | Documentación completa y forma de trabajo |
| `85412a0` | Seguimiento: línea de tiempo con hora por paso y textos "Cocinando" y "Lista" |

Los commits de la web están en [vista-web.md 16](vista-web.md#16-historial-de-commits).

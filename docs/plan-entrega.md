# Plan de entrega · web real de Fritanga Nica

Qué vamos a construir para pasar de la demo a la web real, en qué orden y qué frena qué. La
entrega es el **viernes 8 de enero de 2027**, en 6 etapas desde el 23 de noviembre de 2026.

- **Estado:** por arrancar (etapa 1).
- **Antes de esto:** la demo de la web está en [vista-web.md](vista-web.md) y la del personal en
  [vista-personal.md](vista-personal.md). Todo lo que sigue reemplaza lo simulado por un backend
  real.
- **Lo comercial** (precio, adelanto, mensualidad, garantía y condiciones) está en la propuesta
  que se le mandó al cliente, no en este repo, porque el repo es público.

## Índice

1. [Qué se va a hacer](#1-qué-se-va-a-hacer)
2. [Qué no se hace](#2-qué-no-se-hace)
3. [Cómo va a funcionar](#3-cómo-va-a-funcionar)
4. [Quién hace qué](#4-quién-hace-qué)
5. [Etapas y tareas](#5-etapas-y-tareas)
6. [Lo que más frena](#6-lo-que-más-frena)
7. [Seguridad](#7-seguridad)
8. [Lo que tiene que entregar el cliente](#8-lo-que-tiene-que-entregar-el-cliente)
9. [Cómo trabajamos](#9-cómo-trabajamos)
10. [Cargar el plan en Asana](#10-cargar-el-plan-en-asana)
11. [Historial](#11-historial)

---

## 1. Qué se va a hacer

Solo la web: para llevar y a domicilio, con pedidos reales.

**Para el cliente que pide**
- La web de la demo (celular, tablet y computadora) con el menú, combos, promo y horario
  leídos de la base de datos.
- Elegir entre **recoger** o **domicilio**. A domicilio escribe dirección y referencia, puede
  compartir su ubicación desde el teléfono (un link de mapa, sin mapa de Google embebido) y ve
  el costo de envío sumado al total.
- El pedido llega de verdad al local y el seguimiento muestra el estado real: recibido,
  aceptado, listo, en camino, entregado o rechazado.
- Si el local está cerrado o un plato se agotó, la web lo dice y no deja pedirlo.

**Para el local**
- Pantalla de pedidos en la tablet: suena al entrar un pedido, no se apaga y se reconecta sola.
  Desde ahí se acepta, se rechaza con motivo, se marca listo, en camino y entregado.
- Botón **Imprimir** (ticket para la térmica).
- Botón **Enviar al repartidor**: abre WhatsApp (link `wa.me`) con el pedido, la dirección y la
  ubicación escritos.
- Botón **Avisar al cliente**: abre WhatsApp con "Su pedido está listo" o "Su pedido va en
  camino" escrito.
- Panel del dueño: platos, precios, fotos, disponibilidad y horario.
- Login de Supabase: una cuenta del local y una del dueño, cada una con su rol.

**Para la entrega**
- Publicación con el dominio del negocio, guía de una página, capacitación y 2–3 días de marcha
  blanca con pedidos reales.

## 2. Qué no se hace

Queda para una fase 2 que se cotiza aparte:

- Pedido en mesa con QR y meseros. **Se apaga, no se borra:** el sitio del cliente da "no
  encontrado" en `/m/:mesa` (como con `VITE_SITIO`).
- Impresión automática (sin tocar Imprimir).
- Mensajes de WhatsApp que se envían solos (API de WhatsApp Business). Se evaluó: pide
  verificar el negocio con Meta, un número dedicado, plantillas aprobadas y un costo por
  mensaje. Los botones de arriba cubren lo mismo con un toque.
- Pagos en línea. Se paga al recoger o al recibir.
- Caja, corte del día y PIN por persona (lo de la demo del personal).
- Conexión con el sistema de inventario del cliente.
- Fotos profesionales y contenido para redes.

## 3. Cómo va a funcionar

- **Front:** el mismo proyecto (Vite + React + TypeScript). Se quita el servidor simulado
  (`lib/server.ts`, `lib/simulator.ts`) y `lib/api.ts` pasa a hablar con Supabase.
- **Dos sitios con `VITE_SITIO`:** `cliente` (la web) y `personal` (pantalla del local y panel),
  como hoy.
- **Supabase:** Postgres con migraciones en `supabase/migrations/`, Auth para el local y el
  dueño, Realtime para los pedidos y Storage para las fotos. Dos proyectos: **prueba** (desde la
  etapa 1) y **real**, a nombre del negocio (etapa 5).
- **El servidor decide, el navegador no:** la función que crea el pedido calcula los precios con
  la base, valida horario, "cerrado hoy", agotados, hora de la promo, límite por pedido, zona y
  costo de envío, todo en hora de Managua. Da el número `FN-####` sin repetidos, un código de
  seguimiento difícil de adivinar y no duplica el pedido si llega dos veces.

**Estados del pedido**

```
recibido ─► aceptado ─► listo ─► entregado          (para recoger)
                          └────► en camino ─► entregado   (a domicilio)
recibido ─► rechazado (con motivo)
```

Solo se permiten estos pasos y se guarda la hora de cada uno.

## 4. Quién hace qué

Los responsables se asignan en el tablero de Asana. Las áreas son:

| Área | Código | Qué cubre |
| --- | --- | --- |
| Frontend web | W | Todo lo que ve el cliente que pide. |
| Local y panel | L | Pantalla de pedidos, imprimir, botones de WhatsApp, panel y guía. |
| Backend | B | Supabase: modelo, funciones, reglas, Realtime, login, respaldos. |
| Pruebas | P | Seguridad, teléfonos reales, punta a punta, correcciones. |
| Cliente | C | Lo que se habla o se pide al cliente, y el lanzamiento. |
| Equipo | E | Accesos, reuniones y cuentas. |
| Hito | H | Los cortes que marcan el paso de una etapa a la otra. |

## 5. Etapas y tareas

Cada tarea tiene un código (letra del área y número) para marcar dependencias. "Bloqueada por"
dice qué tiene que estar terminado antes de empezarla. Las fechas ya respetan esas
dependencias: ninguna tarea empieza antes de que termine lo que la bloquea.

Los hitos son los cortes:

| Hito | Fecha | Qué significa |
| --- | --- | --- |
| H01 | 27 nov | Base de datos lista con el menú cargado y acuerdo firmado. Sin esto no se pasa a la etapa 2. |
| H02 | 4 dic | Un pedido de prueba llega al local y el cliente ve el estado. |
| H03 | 18 dic | Web, local y panel conectados. Desde acá no se construye nada nuevo. |
| H04 | 8 ene | Lanzamiento. |

### Etapa 1 · Bases (23–29 nov)

Unas 36,5 h.

| Tarea | Área | h | Fechas | Bloqueada por |
| --- | --- | --- | --- | --- |
| B01 · Crear el proyecto Supabase de prueba | Backend | 0,5 | 23 nov | — |
| W03 · .env fuera de git y claves solo en el hosting *(seguridad)* | Frontend web | 0,5 | 23 nov | — |
| E01 · Reunión de arranque: tablas y estados del pedido | Equipo | 3 | 23 nov – 24 nov | — |
| E02 · Accesos al repo y al hosting, y README para correr el proyecto | Equipo | 2 | 23 nov – 24 nov | — |
| W01 · Apagar mesa y meseros en el sitio del cliente | Frontend web | 1 | 23 nov – 24 nov | — |
| E04 · Verificación en dos pasos en todas las cuentas *(seguridad)* | Equipo | 1,5 | 23 nov – 25 nov | — |
| E05 · Gestor de contraseñas compartido *(seguridad)* | Equipo | 0,5 | 23 nov – 25 nov | — |
| C01 · Acuerdo firmado y anticipo | Cliente | 2 | 23 nov – 26 nov | — |
| C02 · Mensualidad por escrito | Cliente | 0,5 | 23 nov – 26 nov | — |
| C03 · Decisiones pendientes del cliente | Cliente | 1 | 23 nov – 27 nov | — |
| C04 · Correo del negocio y cuentas a su nombre | Cliente | 0,5 | 23 nov – 27 nov | — |
| C05 · Tablet, impresora, papel e internet del local *(riesgo)* | Cliente | 2 | 23 nov – 27 nov | — |
| C06 · Menú final, precios, promo y fotos del cliente | Cliente | 3 | 23 nov – 4 dic | — |
| C17 · Datos de domicilio: zonas, costo de envío y pedido mínimo | Cliente | 0,5 | 23 nov – 4 dic | — |
| E03 · Reglas de git y ambiente de prueba | Equipo | 1 | 24 nov – 25 nov | E02, B01 |
| W02 · Quitar los forzados y ejemplos de la demo *(seguridad)* | Frontend web | 2 | 24 nov – 25 nov | — |
| B02 · Modelo de datos y migraciones | Backend | 4 | 24 nov – 26 nov | E01, B01 |
| W04 · Conectar Supabase en el front | Frontend web | 1 | 25 nov – 26 nov | B01, W03 |
| B03 · Script que carga el menú en la base | Backend | 2 | 26 nov – 27 nov | B02 |
| B04 · Fotos en Storage | Backend | 1 | 26 nov – 27 nov | B01 |
| E06 · Reunión semanal | Equipo | 6 | 27 nov | — |
| **H01 · Hito: base de datos lista con el menú cargado** | Hito |  | 27 nov | B02, B03, C01, C02, E03, E04, E05, W01, W02 |
| L01 · Probar la impresora con la tablet *(riesgo)* | Local y panel | 1 | 27 nov | C05 |

### Etapa 2 · Pedidos reales (30 nov–6 dic)

Unas 49 h.

| Tarea | Área | h | Fechas | Bloqueada por |
| --- | --- | --- | --- | --- |
| B05 · Reglas de seguridad (RLS) *(seguridad)* | Backend | 3 | 30 nov – 1 dic | B02 |
| B06 · Login con Supabase Auth y roles | Backend | 3 | 30 nov – 1 dic | B02 |
| W05 · Menú desde Supabase | Frontend web | 4 | 30 nov – 1 dic | H01, W04 |
| B08 · Función crear pedido | Backend | 5 | 30 nov – 2 dic | B02 |
| C07 · Elegir hosting y comprar el dominio | Cliente | 1 | 30 nov – 4 dic | C04 |
| B07 · Cerrar el registro público y dar roles por tabla *(seguridad)* | Backend | 1 | 1 dic | B06 |
| B10 · Cambios de estado del pedido | Backend | 2 | 1 dic – 2 dic | B02 |
| W06 · Horario y "Cerrado hoy" desde Supabase | Frontend web | 2 | 1 dic – 2 dic | B02, W04 |
| L02 · Pantalla de login del local y del dueño | Local y panel | 2 | 2 dic | B06 |
| B09 · Validar lo que entra en el pedido *(seguridad)* | Backend | 1 | 2 dic – 3 dic | B08 |
| B11 · Realtime para el local y el cliente | Backend | 3 | 2 dic – 3 dic | B10 |
| W08 · Enviar el pedido real | Frontend web | 4 | 2 dic – 3 dic | B08, W05 |
| L03 · Pantalla de pedidos conectada | Local y panel | 6 | 2 dic – 4 dic | L02, B10, B11 |
| B12 · Realtime privado *(seguridad)* | Backend | 1 | 3 dic – 4 dic | B11, B05 |
| B13 · Antispam *(seguridad)* | Backend | 2 | 3 dic – 4 dic | B08 |
| B14 · Vista del pedido completo para ticket y WhatsApp | Backend | 1 | 3 dic – 4 dic | B02 |
| W09 · Seguimiento real con Realtime | Frontend web | 4 | 3 dic – 4 dic | W08, B11 |
| **H02 · Hito: un pedido de prueba llega al local y el cliente ve el estado** | Hito |  | 4 dic | W09, L03 |
| W07 · Plato agotado en vivo | Frontend web | 2 | 4 dic | W05, B11 |
| L04 · Aviso con sonido, pantalla prendida y reconexión | Local y panel | 2 | 4 dic – 5 dic | L03 |

### Etapa 3 · Domicilio, imprimir y WhatsApp (7–13 dic)

Unas 19 h.

| Tarea | Área | h | Fechas | Bloqueada por |
| --- | --- | --- | --- | --- |
| W10 · Sacar los PIN de restaurant.json *(seguridad)* | Frontend web | 1 | 7 dic | L02 |
| B23 · Domicilio en la base y en crear pedido | Backend | 3 | 7 dic – 8 dic | B08, C17 |
| L05 · Botón Imprimir: ticket para la térmica *(riesgo)* | Local y panel | 4 | 7 dic – 8 dic | L01, L03, B14 |
| W20 · Domicilio en la web | Frontend web | 5 | 8 dic – 10 dic | B23, W08 |
| L06 · Botón Enviar al repartidor por WhatsApp | Local y panel | 2 | 9 dic | L03, B14, C03, B23 |
| L09 · Domicilio en la pantalla del local | Local y panel | 2 | 10 dic – 11 dic | B23, L03 |
| L10 · Botón Avisar al cliente por WhatsApp | Local y panel | 2 | 11 dic | L03, B14 |

### Etapa 4 · Panel y contenido (14–20 dic)

Unas 19 h.

| Tarea | Área | h | Fechas | Bloqueada por |
| --- | --- | --- | --- | --- |
| B15 · Backend del panel | Backend | 2 | 14 dic | B06, B05 |
| B16 · Fotos: solo imágenes y con tamaño máximo *(seguridad)* | Backend | 0,5 | 14 dic | B04 |
| W14 · Textos reales en restaurant.json | Frontend web | 1 | 14 dic | C06 |
| B17 · Cerrar la sesión de la tablet a distancia *(seguridad)* | Backend | 1 | 15 dic | B06 |
| B18 · Reseñas en la base | Backend | 1 | 15 dic | C03, B02 |
| W13 · Reseñas de Google: reales o quitar | Frontend web | 1 | 15 dic | C03 |
| W15 · Fotos definitivas | Frontend web | 1 | 15 dic | C06 |
| L07 · Panel mínimo conectado | Local y panel | 6 | 15 dic – 17 dic | B15, L02, B04 |
| B19 · Cargar el menú final en la base | Backend | 1 | 16 dic | C06, B03 |
| W11 · Calificación: conectar o esconder | Frontend web | 2 | 16 dic | C03, B18 |
| W16 · Aviso de privacidad en Tus datos | Frontend web | 0,5 | 16 dic | C03 |
| B20 · Borrar datos viejos de clientes *(seguridad)* | Backend | 1 | 17 dic | C03 |
| W17 · Vista previa del link al compartir | Frontend web | 1 | 17 dic | W15 |
| **H03 · Hito: web, local y panel conectados** | Hito |  | 18 dic | H02, L04, L05, L06, L07, W06, W07, W10, W11, W13, W14, W16, W17, B20, B07, B09, B12, B13, B16, B17, B19, W20, L09, L10 |

### Etapa 5 · Publicar, probar y corregir (21 dic–3 ene)

Unas 27,5 h.

| Tarea | Área | h | Fechas | Bloqueada por |
| --- | --- | --- | --- | --- |
| B21 · Crear el proyecto Supabase real a nombre del negocio | Backend | 1 | 21 dic | C04, H03 |
| C08 · Plan B si se cae internet o la web | Cliente | 0,5 | 21 dic | — |
| W18 · Publicar con el dominio real | Frontend web | 1 | 21 dic | C07, B21 |
| W19 · Cabeceras de seguridad en el hosting *(seguridad)* | Frontend web | 1 | 21 dic | C07 |
| B22 · Respaldos | Backend | 2 | 21 dic – 22 dic | B21 |
| L08 · Guía de una página para el local | Local y panel | 2 | 22 dic – 23 dic | H03, C08 |
| P01 · Probar la seguridad *(seguridad)* | Pruebas | 3 | 22 dic – 23 dic | H03, W19 |
| P02 · Probar en teléfonos reales y conexión lenta | Pruebas | 3 | 22 dic – 23 dic | W18 |
| P06 · Documentar el backend | Backend | 2 | 22 dic – 23 dic | B22 |
| P03 · Prueba de punta a punta en el local | Pruebas | 6 | 28 dic | W18, L05, L09 |
| P04 · Correcciones finales | Pruebas | 4 | 28 dic – 30 dic | P01, P02, P03 |
| P05 · Build y lint limpios y docs al día | Pruebas | 2 | 30 dic | P04 |

### Etapa 6 · Capacitar y lanzar (4–8 ene)

Unas 9 h.

| Tarea | Área | h | Fechas | Bloqueada por |
| --- | --- | --- | --- | --- |
| C11 · QR para el mostrador y post de lanzamiento | Cliente | 1 | 4 ene – 7 ene | W18 |
| C09 · Capacitación del personal y del dueño | Cliente | 2 | 5 ene | L08, P04 |
| C10 · Marcha blanca de 2 o 3 días | Cliente | 3 | 5 ene – 7 ene | C09, P04 |
| C12 · Poner el link en todos lados | Cliente | 2 | 8 ene | C10 |
| C13 · Acta de entrega y cobro del saldo | Cliente | 1 | 8 ene | H04 |
| **H04 · Hito: lanzamiento** | Hito |  | 8 ene | C10, C12, P05, P06, C11 |

### Después de la entrega

Unas 4 h.

| Tarea | Área | h | Fechas | Bloqueada por |
| --- | --- | --- | --- | --- |
| C14 · Garantía de 2 semanas | Cliente | 2 | 9 ene – 22 ene | H04 |
| C15 · Revisión al mes con el cliente | Cliente | 1 | 8 feb | H04 |
| C16 · Propuesta de fase 2 con precio | Cliente | 1 | 8 feb | C15 |

## 6. Lo que más frena

1. **El camino crítico:** reunión E01 → modelo de datos B02 → login B06 → backend del panel
   B15 → panel L07 → H03 → proyecto real B21 → publicar W18 → prueba de punta a punta P03 →
   correcciones P04 → capacitación C09 → marcha blanca C10 → lanzamiento H04. Un día de atraso
   en cualquiera de estas corre la entrega.
2. **Los pedidos reales (etapa 2, la más cargada):** todo sale del modelo de datos (B02). La
   web no puede enviar pedidos sin la función B08, ni mostrar el seguimiento sin Realtime B11.
3. **El cliente:** el menú final (C06) frena textos, fotos y la carga del menú. Sin el correo
   del negocio (C04) no hay dominio ni proyecto real, y no se puede publicar.
4. **La impresora:** imprimir en una térmica desde Android por el navegador muchas veces
   necesita una app intermedia. Por eso se prueba en la etapa 1 (L01), antes de construir el
   botón.

## 7. Seguridad

Las tareas marcadas *(seguridad)* en las tablas. Las que no pueden faltar antes de recibir
pedidos reales:

- **Sacar los PIN de `restaurant.json` (W10).** Hoy están en el código que se descarga, y el
  repo es público.
- **Cerrar el registro público de Supabase (B07).** Viene abierto; los permisos se dan por una
  tabla de personal, nunca a "cualquier usuario con sesión".
- **Precios y reglas en el servidor (B08, B09).** El navegador nunca decide el total.
- **RLS y Realtime privado (B05, B12).** Nadie lee pedidos ajenos; el código de seguimiento
  muestra solo el estado de ese pedido.
- **Claves fuera de git (W03).** `.env*` al `.gitignore`; la clave `service_role` nunca va en el
  front.
- **Quitar los forzados de la demo (W02).** Hoy `?forzar=abierto` deja pedir con el local
  cerrado.
- Además: verificación en dos pasos en todas las cuentas (E04), gestor de contraseñas (E05),
  antispam (B13), cerrar la sesión de la tablet a distancia (B17), cabeceras en el hosting
  (W19), respaldos (B22) y una prueba de seguridad antes de publicar (P01).

## 8. Lo que tiene que entregar el cliente

Si algo llega tarde, la entrega se corre lo mismo.

| Qué | Para cuándo |
| --- | --- |
| Correo del negocio (para el dominio y los servicios a su nombre) | 27 nov |
| Tablet con soporte y cargador, y el modelo exacto de la impresora | 27 nov |
| Números de WhatsApp de los repartidores | 27 nov |
| Respuestas: ¿se queda la calificación?, tiempo promedio de un pedido, qué decir al rechazar | 27 nov |
| Domicilio: zonas, costo de envío (fijo o por zona) y pedido mínimo | 4 dic |
| Menú final, precios, combos y promo con su horario | 11 dic |
| Fotos de los platos y foto de portada | 11 dic |
| Dirección, WhatsApp del negocio y link del perfil de Google | 11 dic |
| Una hora con el personal para la capacitación | 5 ene |

## 9. Cómo trabajamos

- **Ramas:** una por tarea, revisión antes de pasar a `main` y una sola persona que publica.
- **Ambiente de prueba:** las vistas previas usan el Supabase de prueba, nunca el real.
- **Hosting:** el plan gratis de Vercel no permite uso comercial. Se decide en C07 entre Vercel
  Pro, Netlify o Cloudflare Pages.
- **Diseño:** lo que ya existe en la demo se conecta tal cual. Lo que no tiene Figma (domicilio
  real, botones nuevos del local) se propone con un boceto antes de construirlo, como dice
  [CLAUDE.md](../CLAUDE.md).
- **Terminado** quiere decir: `npm run build` y `npm run lint` sin errores, accesible, respeta
  `prefers-reduced-motion`, los textos salen de los JSON o de la base, y la documentación de
  `docs/` está al día.
- **Reunión semanal** de 30 min los viernes, con el tablero al día.

## 10. Cargar el plan en Asana

El plan completo, con descripciones, está en `privado/plan-asana.csv`. Esa carpeta queda fuera
de git porque las descripciones tienen datos comerciales.

1. En el proyecto de Asana, archivar las tareas viejas.
2. Menú del proyecto → **Importar → CSV**.
3. Mapear Área y Prioridad como campos de selección única, Horas como número, y Bloqueada por y
   Bloquea como texto.
4. Después de importar:
   - marcar H01 a H04 como hito;
   - hacer que la reunión semanal (E06) se repita cada viernes;
   - marcar las dependencias a mano. El CSV no las crea: en cada tarea, campo
     **Dependencias → Bloqueada por**, escribiendo el código. Empezar por las de prioridad Alta.
5. En **Cronograma** se ve el Gantt con las flechas.

## 11. Historial

| Fecha | Cambio |
| --- | --- |
| 2026-11-23 | Plan creado: solo web (para llevar y domicilio), 6 etapas, entrega el 8 de enero de 2027. |

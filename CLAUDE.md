# Menú digital · Fritanga Nica

La documentación completa está en `docs/vista-qr.md` (pedido en mesa) y `docs/vista-web.md` (web
para llevar, con sus etapas y lo anotado para corregir). Leerlas antes de tocar algo.

El trabajo actual es la web real (solo web, para llevar y domicilio), con entrega el 8 de enero
de 2027: qué se hace, en qué orden y qué frena qué está en `docs/plan-entrega.md`.

En la web, lo compartido con la mesa usa lo ya corregido en la mesa; "Figma primero" aplica a lo
propio de la web (ver `docs/vista-web.md`, sección 2).

## Forma de trabajo (obligatoria)

1. **Primero se pasa todo tal como está en el Figma.** Cada pantalla de la etapa se construye fiel
   al diseño: textos, orden, medidas y comportamiento. No se mejora ni se cambia nada sobre la
   marcha.
2. **Las correcciones vienen después.** Recién cuando se haya pasado todo lo del Figma hasta ese
   momento, se corrige lo que haga falta, pantalla por pantalla.
3. Si la documentación contradice una captura, avisar antes de decidir.
4. Antes de construir, mostrar un plan corto y esperar la aprobación. Las correcciones se proponen
   con un boceto.
5. **Al terminar cada etapa o corrección, siempre sugerir:**
   - hacer el commit, con un mensaje claro;
   - actualizar la memoria;
   - actualizar `docs/` y el README si cambió algo visible.
6. Todos los textos del restaurante salen de los JSON (`src/config/restaurant.json`,
   `src/data/menu.json`). Todo es accesible, respeta `prefers-reduced-motion` y no tiene errores
   de TypeScript ni de lint (`npm run build`, `npm run lint`).
7. No subir el material del cliente: los `*.pdf`, `fritanga-img.zip` y
   `prompt-claude-code-fritanga-mesa.md` quedan fuera de git.

## Notas

- Se trabaja en español, con voseo en los textos de la interfaz.
- El repo está en OneDrive. Si Vite sirve una versión vieja, reiniciar con `npx vite --force`.

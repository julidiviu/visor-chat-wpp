# Memoria del proyecto

## Estado actual

- Fases 0–5 completas: docs, datos, parser, API, UI y panel de contacto.
- Extras: álbumes de fotos (2/3/4/+n), menú del chat, cambiar foto, eliminar chat, panel de contacto con multimedia/documentos/enlaces y lightbox global con carga progresiva.
- Verificado con el export real: escritorio y móvil, claro/oscuro, importación, búsqueda con salto, scroll infinito, álbumes, panel, documentos, enlaces, lightbox y borrado.
- `npm run build`, `npm run lint`, `npm test` (15 tests) y `npx tsc --noEmit` pasan.
- Chat real en `data/app.db` (**id 4**, "Melany", owner "Julian Cañar", 297.494 mensajes, FTS sincronizado).

## Decisiones

- **better-sqlite3** + Drizzle, sin drizzle-kit: DDL idempotente en `src/db/ddl.ts`; `npm run dev` funciona en un clon limpio.
- **FTS5 externa** con triggers y `remove_diacritics 2`; búsqueda híbrida: filtro local + resultados globales con debounce.
- **Álbumes en cliente** (`src/lib/group-messages.ts`): fotos consecutivas del mismo remitente, ≤60 s, sin caption. Layouts 2, 3, 4 y 2×2 con «+n».
- **Mensajes vacíos sin adjunto se ocultan** (`isRenderableMessage`): el export real tiene uno (id 297484).
- **Panel de contacto** (`contact-panel.tsx`): clic en avatar/título; columna de 360 px desde 1280 px y overlay del área del chat por debajo. Acciones existentes dentro del panel.
- **MediaPanel**: pestañas fotos+videos / documentos / enlaces; páginas de 60 fotos, agrupadas por mes; enlaces extraídos con `lib/links.ts` y cacheados en memoria.
- **Lightbox global** (`media-gallery.tsx`): ventana de 40 alrededor del mensaje, carga 40 más cerca de los bordes, contador global, remitente, fecha, botón “Ir al mensaje” y precarga de ±1 imagen. La lista completa nunca se carga.
- **Etiqueta flotante de día** al hacer scroll: muestra el día del primer mensaje visible y se oculta si el separador estático ya está arriba.
- **Miniaturas** con `next/image` en panel y álbumes; la foto suelta del chat conserva el original.
- **Índice** `messages_media_idx (chat_id, attachment_type, id)`: conteos de 67 ms → 3 ms y páginas <1 ms.
- **Scroll incremental** reanclado con `useLayoutEffect` y `overflow-anchor: none`; el indicador de carga tiene altura fija para que el prepend no mueva la vista.
- **Bajada tras un salto**: `afterId` + `hasNewer` con centinela inferior; después de “Ir al mensaje” el chat sigue cargando hasta el final real.
- **Búsqueda** devuelve el total real de coincidencias y hasta 500 resultados; si hay más, la UI avisa y sugiere acotar fechas.
- **Eliminar chat** borra solo la base (cascade + triggers FTS); nunca toca la carpeta ni la multimedia.
- **Avatar** data URL de 256 px WebP; `PATCH` acepta `avatar` y `ownerName`.
- **Media** referenciada, no copiada; stream con `Range` y corte por `request.signal`.
- **Tema** con clase en `<html>` + `localStorage`; script vía `next/script` `beforeInteractive`.

## Export verificado (2026-11)

- 297.494 mensajes, 27/07/2020–01/01/2026; limpiar `U+200E`/`U+200F` y `U+202F`.
- 32.398 adjuntos; 28 nombres corruptos resueltos por prefijo numérico + extensión.
- Multimedia del panel: **4.458 fotos/videos, 91 documentos, 343 enlaces**.
- 134 grupos de fotos: 68 de 2, 17 de 3, 20 de 4 y 29 de 5+ (máximo 21).
- Import real: 12,3 s; DB 44 MB + WAL.

## Errores a evitar

- `[d/M/yy]` se interpretaba como `[yy, dd, mm]`; correcto: `[year, month, day] = [c, b, a]`.
- No usar `fs.existsSync(nombre)` para adjuntos: usar `attachments.ts`.
- No ordenar por `ts` (hay repetidos): ordenar por `id`.
- No usar `Readable.toWeb` para `/api/media`: lanzaba una excepción al abortar.
- No medir `max-h-full` dentro de un `grid` de fila automática.
- `better-sqlite3` debe estar en `serverExternalPackages`. Las here-strings de PowerShell manglan UTF-8.
- No reanclar el prepend con `requestAnimationFrame`: puede ejecutarse antes del commit. Usar `useLayoutEffect` y un indicador de carga de altura fija.
- Una captura de pantalla del chat dentro de la rejilla se ve como texto grande: es la miniatura recortada (`object-cover`), no un desbordamiento.

## Pendientes

- Validar `.opus` en Safari (Chrome/Edge probados).
- Editar el título del chat no está implementado (no se pidió).
- Posible virtualización del panel si se recorren miles de fotos; hoy 120 miniaturas cargadas se comportan bien.

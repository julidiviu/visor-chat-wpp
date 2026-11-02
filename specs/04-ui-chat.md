# Spec 04 — Chat, multimedia y búsqueda

## Cabecera del chat

Avatar, título, número de mensajes, botón de búsqueda, selector de "mis mensajes" y flecha de volver en móvil.

Avatar y título abren el panel de contacto descrito en la spec 05.

## Lista de mensajes

- Burbujas propias a la derecha en verde WhatsApp (`#d9fdd3` claro / `#005c4b` oscuro); ajenas a la izquierda en blanco / `zinc-800`.
- Agrupación: mismo remitente en menos de 5 minutos → sin repetir nombre ni avatar; hora solo en el último de cada grupo.
- Separadores de fecha ("Hoy", "Ayer", `dd/mm/yyyy`).
- Etiqueta flotante con el día del primer mensaje visible al hacer scroll; se oculta cuando el separador estático ya está a la vista.
- Mensajes de sistema ("Se eliminó este mensaje", "imagen omitida", "Llamada", cifrado) atenuados y centrados.
- Infinite scroll hacia arriba: se conserva la posición exacta del scroll al prepend (ajuste en `useLayoutEffect` y altura fija del indicador de carga).
- Tras saltar a un mensaje antiguo, el scroll hacia abajo sigue cargando mensajes posteriores (`afterId` y centinela inferior) hasta el final real del chat.
- Botón flotante para bajar al último mensaje.
- Texto con saltos de línea preservados y enlaces clicables.

## Multimedia

| Tipo | Render |
|---|---|
| `image` | Miniatura con `loading="lazy"`, relación natural, clic abre lightbox (Esc, flechas, foco atrapado) |
| `sticker` | Sin burbuja, fondo transparente, 140 px, sin sombra |
| `audio` | `<audio controls>` nativo, ancho de burbuja; `.opus` servido como `audio/ogg` |
| `video` | `<video controls>` con `preload="metadata"` y soporte de Range |
| `document` | Tarjeta con icono por extensión, nombre, tamaño legible y descarga |

Archivo ausente en disco (`404`): tarjeta "Archivo no encontrado" sin romper la lista.

## Álbumes de fotos

Las fotos consecutivas del mismo remitente (≤ 60 s, sin texto/caption, ignorando mensajes vacíos) se muestran como un álbum en una sola burbuja:

| Cantidad | Distribución |
|---|---|
| 2 | Dos columnas verticales dentro de un cuadrado |
| 3 | Una grande a la izquierda (2/3) y dos apiladas a la derecha |
| 4 | Rejilla 2×2 |
| > 4 | Rejilla 2×2 con «+n» sobre la cuarta foto (`n = total − 4`) |

- Hueco de 2 px, esquinas redondeadas y `object-cover` en las celdas; una sola hora, la del último mensaje.
- Cada celda es un botón que abre el lightbox del álbum en esa posición; «+n» abre en la cuarta.
- Las fotos con caption y los mensajes vacíos sin adjunto no se agrupan (los vacíos tampoco se dibujan).

## Lightbox

El recorrido es global para todo el chat (fotos y videos, por `id`, no por
álbum). Se abre con una ventana de 40 elementos alrededor del mensaje pulsado y
carga 40 más al acercarse a los bordes; las flechas se desactivan en los
extremos. La imagen se limita a `calc(100dvh − 9rem)` de alto y
`calc(100vw − 2rem)` de ancho dentro de una capa de altura definida. Esc cierra,
las flechas navegan, el contador muestra `posición global / total` y solo se
precargan las imágenes contiguas. Detalle completo en la spec 05.

## Búsqueda

Híbrida, en el panel del chat:

1. Al escribir, filtra y resalta inmediatamente en la ventana cargada (< 10 ms) y muestra el conteo local.
2. Tras 300 ms consulta `/api/messages?q=` (FTS5) y reemplaza los resultados por los globales, con extracto y fecha. Muestra el total real de coincidencias y hasta 500; si hay más, avisa y sugiere acotar por fecha.
3. Filtros opcionales de fecha (desde/hasta).
4. Clic en un resultado: `aroundId` carga la ventana, cierra el panel, hace scroll al mensaje y lo resalta 2 s.
5. Esc o botón limpio cierra el panel y restaura los filtros.

## Rendimiento

- Nunca más de 100 mensajes en el DOM por página cargada; sin virtualización en esta fase.
- `React.memo` en la burbuja y claves estables por `id`.
- Imágenes y video con `loading`/`preload` diferido.

## Criterios de aceptación

- Con 297.494 mensajes, abrir el chat tarda menos de 2 s en mostrar los últimos 50.
- Subir el scroll carga páginas sin saltos visibles.
- Buscar "canción" encuentra resultados con tilde y sin tilde.
- Saltar a un resultado de 2021 posiciona el mensaje correcto.
- Los 5 tipos de adjunto se renderizan y el lightbox se cierra con Esc.

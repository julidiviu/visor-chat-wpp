# Spec 02 — API

Todas las rutas viven en `src/app/api/**` y se ejecutan en Node (`better-sqlite3`). Respuestas JSON salvo multimedia.

## `GET /api/chats`

Devuelve la lista para la barra lateral:

```json
[{ "id": 1, "title": "Chat de ejemplo", "avatar": "data:image/webp;base64,…",
   "ownerName": "Usuario", "messageCount": 297494,
   "lastTs": 1767225600000, "lastContent": "…", "lastAttachmentType": "image" }]
```

Orden: `lastTs` descendente. Un solo `SELECT` con subconsultas.

## `POST /api/chats/import`

Body: `{ folderPath: string, title?: string, avatar?: string }`.

| Caso | Respuesta |
|---|---|
| Ruta vacía o relativa | `400 { error }` |
| No existe / no es directorio / sin `_chat.txt` | `400 { error }` |
| Ya importado | `409 { error, chatId }` |
| `?replace=1` | Borra el anterior y reimporta |
| Correcto | `200 { chatId, title, messageCount, senders, missingAttachments, elapsedMs }` |

Validaciones adicionales: `title` ≤ 120 caracteres; `avatar` debe empezar por `data:image/` y medir < 2 MB.

## `PATCH /api/chats/[id]`

Body parcial: `{ ownerName?: string, avatar?: string | null }`. Valida que el chat exista y, si llega `ownerName`, que el nombre esté entre los remitentes detectados. `avatar` debe ser una data URL `data:image/*` menor de 2 MB, o `null` para quitarla. Devuelve `{ id, ownerName, avatar }`.

## `DELETE /api/chats/[id]`

Borra la fila del chat; `ON DELETE CASCADE` elimina sus mensajes y los triggers limpian FTS. No toca la carpeta original. Responde `204` o `404` si no existe.

## `GET /api/messages`

Parámetros:

| Parámetro | Uso |
|---|---|
| `chatId` | obligatorio |
| `limit` | 1–100 en páginas normales; 1–500 en búsquedas (`q` o fechas), por defecto 50/100 |
| `beforeId` | carga mensajes anteriores (infinite scroll hacia arriba) |
| `afterId` | carga mensajes posteriores (infinite scroll hacia abajo tras un salto) |
| `aroundId` | carga una ventana alrededor de un mensaje (salto desde búsqueda) |
| `q` | búsqueda FTS5; ignora cursores |
| `from`, `to` | epoch ms opcionales para filtrar por fecha |

Respuesta: `{ messages: Message[], hasOlder: boolean, hasNewer?: boolean, search: boolean, total?: number }`. Los mensajes van siempre en orden ascendente por `id`. En búsquedas, `total` es el número real de coincidencias y `messages` trae hasta el límite pedido (máx. 500).

- Sin cursores: últimos `limit`.
- `beforeId`: `id < beforeId` descendente, invertido al responder.
- `afterId`: `id > afterId` ascendente; `hasNewer` indica si quedan más después de la página.
- `aroundId`: mitad anteriores y mitad posteriores; `hasNewer` se calcula tras la ventana.
- `q`: `MATCH` con cada palabra entrecomillada y sufijo `*`; `snippet()` con marcadores `\u0001`/`\u0002`; filtros `from`/`to` sobre `ts`.

Campos de `Message`: `id`, `ts`, `sender`, `content`, `attachmentName`, `attachmentType`, `attachmentSize`, y `snippet` solo en búsqueda.

## `GET /api/chats/[id]/media`

Multimedia paginada para el panel de contacto y el lightbox global.

| Parámetro | Uso |
|---|---|
| `kind` | `photos` (fotos + videos), `documents`, `links`; por defecto `photos` |
| `beforeId` | elementos anteriores (más antiguos) |
| `afterId` | elementos posteriores (más recientes) |
| `aroundId` | ventana alrededor de un mensaje (lightbox) |
| `limit` | 1–100; 60 por defecto y 100 en documentos |
| `summary=1` | conteos y 4 fotos/videos recientes |

Respuesta: `{ items, hasBefore, hasAfter, total, position }`. Los items van en
orden ascendente por `id`; `position` es la posición global 1-based de
`items[0]` o `null` sin items. `kind=links` devuelve todos los enlaces del chat
(sin paginar) con `{ id, ts, sender, content, url, host }`.

`summary=1` responde `{ summary: { photos, documents, links, preview } }`.
`photos` cuenta fotos + videos; los stickers se excluyen. Los enlaces se
extraen del texto en el servidor y se cachean en memoria por chat.

## `GET /api/media/[chatId]/[...filepath]`

- Resuelve `folder_path` del chat y une los segmentos; rechaza cualquier ruta fuera de la carpeta (`403`).
- `404` si el archivo no existe (no rompe el chat: la UI muestra "archivo no encontrado").
- `Content-Type` por extensión; `Accept-Ranges: bytes`; soporte de `Range` con `206` y `Content-Range`.
- `?download=1` → `Content-Disposition: attachment`.
- `Cache-Control: private, max-age=31536000, immutable`.

## Errores

Formato uniforme `{ "error": "texto en español" }` con el status adecuado. Nada de rutas absolutas ni stack traces en la respuesta.

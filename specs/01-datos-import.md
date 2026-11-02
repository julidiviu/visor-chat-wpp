# Spec 01 — Datos e importación

## Objetivo

Guardar chats y mensajes de una exportación de WhatsApp en SQLite local, con un parser que tolere las variantes habituales del formato, y permitir reimportar sin duplicar.

## Esquema (`src/db/schema.ts`)

### `chats`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | integer PK autoincrement | |
| `title` | text not null | Nombre elegido por el usuario |
| `folder_path` | text not null unique | Ruta absoluta de la carpeta exportada |
| `owner_name` | text null | Participante cuyos mensajes son del usuario |
| `avatar` | text null | Data URL de imagen reducida a 256 px |
| `created_at` | integer not null | epoch ms |

### `messages`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | integer PK autoincrement | Orden cronológico real |
| `chat_id` | integer not null → `chats.id` on delete cascade | |
| `ts` | integer not null | epoch ms |
| `sender` | text not null | Nombre tal cual aparece |
| `content` | text not null default `''` | Texto sin la etiqueta de adjunto |
| `attachment_name` | text null | Nombre real del archivo en disco |
| `attachment_type` | text null | `image` \| `sticker` \| `audio` \| `video` \| `document` |
| `attachment_size` | integer null | Bytes, para la tarjeta de documento |

Índice `messages_chat_id_idx (chat_id, id)`.

### FTS5

Tabla externa `messages_fts(content, sender, content='messages', content_rowid='id', tokenize='unicode61 remove_diacritics 2', prefix='2 3')` con triggers `ai`, `ad`, `au`. Si al abrir la base el conteo de filas no coincide con `messages`, se ejecuta `rebuild`.

## Parser (`src/lib/parser.ts`)

Función pura `parseChat(raw: string): ParseResult`:

1. Quitar BOM, `U+200E`, `U+200F` y convertir `U+202F` en espacio.
2. Cabecera: `[FECHA, HORA] Remitente: contenido`, tolerando
   - fecha `d/M/yy`, `d/M/yyyy` o `yyyy-mm-dd`;
   - hora de 12 h con `a.m./p.m.` (con o sin espacios) o de 24 h.
3. Las líneas sin cabecera se anexan al mensaje anterior (`\n`). Es el caso de los mensajes multilínea.
4. Adjuntos: `<adjunto: NOMBRE>` o `<attached: NOMBRE>`; se extraen del contenido y se clasifican por extensión. Un nombre con `STICKER` es `sticker`; el resto, según extensión.
5. Devuelve mensajes en orden de archivo y los remitentes con su conteo.

## Resolución de adjuntos (`src/lib/attachments.ts`)

- Índice de la carpeta: nombre exacto normalizado NFC y mapa `prefijo numérico + extensión`.
- Orden: exacto → prefijo → `null` (archivo ausente).
- Motivo: 28 archivos del export real tienen el nombre corrupto en disco y solo coinciden por prefijo.

## Importación (`POST /api/chats/import`)

1. `folderPath` debe ser absoluto, existir, ser directorio y contener `_chat.txt`.
2. Si `folder_path` ya existe: `409` con `chatId`, salvo `?replace=1`, que borra el chat (cascade + triggers FTS) y reimporta.
3. Insertar chat y luego todos los mensajes en **una transacción** con statement preparado (no una consulta Drizzle por fila).
4. Responder `{ chatId, title, messageCount, senders: [{name,count}], missingAttachments, elapsedMs }`.

## Criterios de aceptación

- `npm test` pasa con un fixture que cubre multilínea, adjunto en línea, 12 h, 24 h y `attached`.
- `npm run check:parse -- "<ruta>"` reporta 297.494 mensajes y 32.398 adjuntos para el export de referencia.
- Importar dos veces la misma carpeta devuelve `409`; con `replace=1` queda una sola copia.
- Los 28 adjuntos corruptos se resuelven al prefijo y no se reportan como ausentes.

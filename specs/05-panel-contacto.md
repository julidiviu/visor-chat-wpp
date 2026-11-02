# Spec 05 — Panel de contacto y multimedia global

## Objetivo

Abrir la información del chat desde la cabecera, consultar su multimedia por
pestañas y recorrer todas las fotos y videos del chat con el lightbox, sin
cargar la biblioteca completa de golpe.

## Cabecera clicable

- Avatar y título forman un botón que abre el panel de contacto; el botón de
  búsqueda y el menú `···` conservan su comportamiento.
- El panel se cierra con la X, con Esc o volviendo a pulsar la cabecera.

## Panel de contacto

Ancho de referencia: 360 px. Desde 1280 px es una tercera columna y el chat se
ajusta; por debajo cubre el área del chat (en móvil, toda la pantalla) y el
chat se oculta mientras el panel está abierto.

Contenido:

1. Avatar grande, nombre, número de mensajes y participante propio.
2. Tarjeta **Archivos, enlaces y documentos** con el total de fotos + videos +
   documentos + enlaces y un mosaico de las 4 fotos/videos más recientes.
3. Acciones: Mis mensajes, Cambiar/Poner foto y Eliminar chat (las mismas del
   menú `···`).
4. Al pulsar la tarjeta se abre, dentro del panel, **Archivos multimedia**:
   - **Archivos multimedia**: fotos y videos, rejilla de 3 columnas agrupada por
     mes (`ESTE MES`, `OCTUBRE`, `JULIO 2020`), scroll infinito de 60 en 60.
   - **Documentos**: nombre, extensión, tamaño, fecha y descarga.
   - **Enlaces**: una fila por mensaje con enlace, dominio, fecha; se abren en
     pestaña nueva con `noopener noreferrer`.
5. Los stickers no aparecen en el panel ni en el recorrido global.
6. Estados de carga, vacío y error con reintento en cada pestaña.

## Lightbox global

- Se abre desde una celda de álbum, una foto suelta o una miniatura del panel.
- El recorrido es global y cronológico por `id`, no por álbum: al pasar el
  último elemento de un álbum continúa con la siguiente foto o video del chat.
- Ventana inicial de 40 elementos alrededor del mensaje pulsado. Al acercarse a
  un borde se cargan 40 más; las flechas se desactivan en los extremos.
- Contador global `posición / total` (4.458 en el export real). Mientras llega
  la primera ventana muestra `… / total`.
- Cabecera con el remitente (`Tú` si es el participante propio) y la fecha/hora
  del elemento. Botón **Ir al mensaje** que cierra el visor (y el panel) y salta
  al mensaje en el chat.
- Precarga solo la imagen anterior y la siguiente. Los videos no se precargan.
- Esc cierra; flechas y botones navegan; en móvil se puede deslizar. Las
  flechas no interfieren cuando el foco está en un video o un campo.
- La imagen se limita a `calc(100dvh − 9rem)` de alto y `calc(100vw − 2rem)` de
  ancho; el video usa los mismos topes.

## API

`GET /api/chats/[id]/media`

| Parámetro | Uso |
|---|---|
| `kind` | `photos` (fotos + videos), `documents`, `links`; por defecto `photos` |
| `beforeId` | elementos anteriores (más antiguos) |
| `afterId` | elementos posteriores (más recientes) |
| `aroundId` | ventana inicial del lightbox |
| `limit` | 1–100; 60 por defecto, 100 en documentos |
| `summary=1` | conteos y 4 fotos/videos recientes para la tarjeta |

Respuesta normal:

```json
{ "items": [], "hasBefore": true, "hasAfter": false, "total": 4458,
  "position": 1201 }
```

- `items` siempre en orden ascendente por `id`.
- `position` es la posición global 1-based de `items[0]`, o `null` sin items.
- `links` devuelve todos los enlaces del chat (343 en el export real), sin
  paginar.

Respuesta de `summary=1`:

```json
{ "summary": { "photos": 4458, "documents": 91, "links": 343,
  "preview": [] } }
```

Los enlaces se extraen del texto con `lib/links.ts`, solo `http(s)` y `www.`,
sin hacer peticiones externas. Se cachean en memoria por chat porque son pocos.

## Base de datos

Índice `messages_media_idx (chat_id, attachment_type, id)` para que conteos y
páginas de multimedia no recorran los 297.494 mensajes.

## Rendimiento

- Miniaturas con `next/image` para panel y celdas de álbum (~160 px), con
  `sizes`, `loading="lazy"` y `decoding="async"`.
- Fotografía suelta del chat: original, para conservar su relación de aspecto.
- Videos en rejilla: mosaico con icono de reproducción; no se decodifican 186
  videos para pintar miniaturas.
- Peticiones abortadas al cerrar o cambiar de chat; sin listas completas en
  memoria.

## Criterios de aceptación

- Pulsar la cabecera abre el panel; X y Esc lo cierran.
- El panel muestra 4.458 fotos/videos, 91 documentos y 343 enlaces.
- El scroll de fotos carga páginas sin bloquear el chat.
- Abrir una foto de un álbum de 2 y avanzar sigue con el resto del chat; el
  contador y la posición son correctos al cruzar álbumes y meses.
- Los videos se reproducen en el lightbox.
- Móvil: panel a pantalla completa y lightbox dentro del viewport.
- No se copia multimedia ni se exponen rutas absolutas.

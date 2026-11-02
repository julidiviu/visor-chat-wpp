# Visor de Chats de WhatsApp

Aplicación web **local** para volver a leer una exportación de WhatsApp con una
interfaz parecida a WhatsApp Web. Importa el archivo `_chat.txt` y la carpeta de
fotos, videos, audios y documentos; guarda un índice en SQLite y sirve la
multimedia directamente desde tu disco.

No sube nada a internet, no copia la multimedia y no modifica la exportación
original. Está pensada para exportaciones grandes: se probó con un chat de
**~297.000 mensajes y ~32.000 adjuntos**.

## Qué puedes hacer

- Importar una carpeta exportada de WhatsApp con `_chat.txt` y su multimedia.
- Elegir cuál de los participantes eres tú; tus mensajes aparecen a la derecha.
- Leer el chat con burbujas, separadores de fecha, álbumes de fotos, stickers,
  audios, videos y documentos.
- Buscar en todo el chat con FTS5, con filtros por fecha y salto al mensaje.
- Abrir el panel de contacto: avatar, multimedia por mes, documentos y enlaces.
- Ver fotos y videos en un visor global, con remitente, fecha y botón
  **Ir al mensaje**.
- Scroll infinito hacia arriba y hacia abajo, con etiqueta flotante del día.
- Tema claro/oscuro y diseño adaptable a móvil.
- Eliminar un chat solo borra el índice local; la carpeta original no se toca.

## Herramientas usadas

| Área | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19 + Tailwind CSS 4 |
| Lenguaje | TypeScript estricto |
| Base de datos | SQLite con `better-sqlite3` + Drizzle ORM |
| Búsqueda | FTS5 de SQLite (`unicode61 remove_diacritics 2`) |
| Miniaturas | `next/image` |
| Tests | `node:test` (15 pruebas del parser y utilidades) |

No hay servicios externos, nube ni base de datos remota. Todo corre en tu
máquina.

## Requisitos

- **Node.js 22.6 o superior** (probado con Node 24).
- npm (viene con Node).
- Windows, macOS o Linux.
- Si `npm install` falla al compilar `better-sqlite3`, instala las herramientas
  de compilación:
  - Windows: Python + Visual Studio Build Tools (C++).
  - macOS: Xcode Command Line Tools.
  - Linux: `build-essential` y `python3`.

## Poner en marcha

```bash
git clone https://github.com/julidiviu/visor-chat-wpp.git
cd visor-chat-wpp
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

Para probar el modo producción:

```bash
npm run build
npm start
```

## Importar un chat

1. En WhatsApp, abre el chat y exporta la conversación **incluyendo
   multimedia**. Se genera una carpeta con `_chat.txt` y los archivos.
2. En la app, pulsa el botón **+** de la barra lateral.
3. Pega la **ruta absoluta** de esa carpeta. Por ejemplo:
   - Windows: `C:\Users\tu-usuario\Downloads\WhatsApp Chat with Contacto`
   - macOS/Linux: `/Users/tu-usuario/Downloads/WhatsApp Chat with Contacto`
4. Opcionalmente cambia el nombre o pon una foto.
5. Pulsa **Importar** y espera. En chats grandes puede tardar unos segundos.
6. Elige cuál de los participantes eres tú.

La carpeta debe contener `_chat.txt`. La app guarda el índice en
`data/app.db`, que está ignorado por Git. **No muevas ni borres la carpeta
original**: la multimedia se lee desde allí. Si la mueves, elimina el chat en la
app y vuelve a importarlo desde la nueva ruta.

## Comandos

| Comando | Para qué sirve |
|---|---|
| `npm run dev` | Arranca el servidor de desarrollo |
| `npm run build` | Compila la versión de producción |
| `npm start` | Ejecuta la compilación (después de `build`) |
| `npm run lint` | Revisa el código con ESLint |
| `npx tsc --noEmit` | Comprueba los tipos sin generar archivos |
| `npm test` | Ejecuta los tests del parser y utilidades |
| `npm run check:parse -- "<carpeta>"` | Prueba el parser contra una exportación real sin importarla |

## Cómo está organizado

```text
src/
  app/            páginas y rutas de API
    api/chats/    importar, listar, editar y borrar chats
    api/messages/ paginación y búsqueda
    api/media/    streaming de archivos con Range
  components/     componentes de la interfaz
  db/             esquema Drizzle, DDL idempotente y conexión SQLite
  lib/            parser, adjuntos, enlaces, agrupación y formato
specs/            especificaciones de cada parte de la app
scripts/          comprobación del parser con una exportación real
data/             base de datos local (ignorada por Git)
```

Flujo general:

1. **Importación**: se lee `_chat.txt`, se parsean los mensajes y se guardan en
   SQLite. Los adjuntos se resuelven por nombre (incluidos nombres corruptos del
   export) pero **no se copian**.
2. **Búsqueda**: SQLite FTS5 indexa el texto; la API devuelve coincidencias y el
   total, y la UI permite saltar al mensaje.
3. **Multimedia**: `/api/media/...` sirve el archivo original con soporte de
   `Range`, validando que no se salga de la carpeta importada.
4. **Interfaz**: carga páginas de mensajes, agrupa fotos consecutivas en álbumes
   y mantiene el scroll mientras llegan mensajes nuevos.

## Para seguir desarrollando

- Lee primero la spec del área que vayas a tocar en `specs/`.
- Mantén la separación actual: datos en `src/db`, lógica en `src/lib`, rutas en
  `src/app/api` y vistas en `src/components`.
- Antes de dar algo por terminado, ejecuta:

  ```bash
  npm run lint
  npx tsc --noEmit
  npm test
  npm run build
  ```

- La interfaz y los mensajes al usuario están en español; el código, los tipos y
  los nombres de archivo, en inglés.
- No copies ni muevas la multimedia del usuario. No expongas rutas absolutas del
  disco en el HTML ni en los logs del cliente.

## Problemas frecuentes

**`better-sqlite3` no compila al instalar**  
Comprueba que usas Node 22.6+ y ejecuta `npm rebuild better-sqlite3`. Si sigue
fallando, instala las herramientas de compilación indicadas arriba.

**El puerto 3000 está ocupado**  
Next.js te ofrecerá otro puerto; mira la URL que aparece en la terminal.

**La app se queda recargando o con código viejo**  
Para el servidor, borra la carpeta `.next` y vuelve a ejecutar `npm run dev`.
Es seguro: solo son archivos generados.

**No se ven las fotos o dice “archivo no encontrado”**  
La carpeta original se movió, se renombró o se borró. Elimina el chat en la app y
vuelve a importarlo desde la ubicación actual.

**La búsqueda muestra menos resultados de los que esperas**  
La API devuelve hasta 500 coincidencias por búsqueda y muestra el total real. Si
hay más, acota el rango con las fechas.

## Límites conocidos

- Es una app de **solo lectura**: no envía mensajes ni modifica el chat original.
- Es de un solo usuario y está pensada para ejecutarse en local. No la expongas a
  internet.
- La reproducción de `.opus` está probada en Chrome/Edge; en Safari puede variar.
- Editar el título de un chat ya importado no está implementado.
- No está afiliada a WhatsApp.

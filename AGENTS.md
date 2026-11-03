# Visor de Chats de WhatsApp

Aplicación web **local** para importar una exportación de WhatsApp (carpeta con `_chat.txt` + multimedia) y leerla con una interfaz tipo WhatsApp Web: burbujas, multimedia, búsqueda, modo claro/oscuro e infinite scroll.

## Contexto

- Un chat exportado puede traer ~300.000 mensajes y varios GB de multimedia. El import debe ser rápido y la UI no debe renderizar todo a la vez.
- El export no indica qué mensajes son del usuario: tras importar, se pregunta por el participante propio y esos mensajes se pintan a la derecha.
- Los archivos de multimedia **no se copian**: se guarda la ruta absoluta de la carpeta y se sirven desde un endpoint con validación de traversal.
- La app es de un solo usuario y no se publica en internet. Aun así, todo dato que entra por la UI se valida.

## Stack

| Pieza | Versión / uso |
|---|---|
| Next.js | 16.x, App Router, Turbopack, `cacheComponents` |
| React | 19.x |
| TypeScript | estricto (`strict: true`) |
| Tailwind CSS | 4.x, CSS-first, paleta `zinc` |
| SQLite | `better-sqlite3` + Drizzle ORM (`drizzle-orm/better-sqlite3`) |
| Búsqueda | FTS5 (`unicode61 remove_diacritics 2`) |

## Estructura

```
src/
  app/
    api/chats/…            import, lista y edición de chats
    api/messages/…         paginación por cursor y búsqueda
    api/media/…            streaming de multimedia con Range
    page.tsx               shell de la UI
  components/              componentes de UI desacoplados
  db/
    schema.ts              tablas Drizzle (fuente de verdad)
    ddl.ts                 DDL idempotente: tablas, índices, FTS5 y triggers
    index.ts               conexión singleton (WAL, foreign_keys)
  lib/
    parser.ts              parser puro de _chat.txt
    attachments.ts         resolución de archivos y tipos/MIME
specs/                     una spec por fase, aprobada antes de codificar
data/                      SQLite local (ignorado por git)
scripts/                   verificación manual del parser
```

## Convenciones

- UI y mensajes al usuario **en español**; código, tipos y nombres de archivo en inglés.
- TypeScript estricto: sin `any` implícito, sin `@ts-ignore`; preferir tipos inferidos de Drizzle.
- Componentes desacoplados: la lógica de datos vive en `lib/` o en rutas API, no dentro de las vistas.
- Fechas: se guardan como epoch en milisegundos (`integer`) y se formatean en el cliente.
- Estilos: clases Tailwind; nada de CSS global nuevo salvo variables de tema.
- Dependencias: no añadir ninguna sin preguntar.

## Flujo de trabajo

1. Leer `MEMORY.md` antes de empezar.
2. Si la tarea toca una vista o componente nuevo, debe existir su spec en `specs/` aprobada.
3. Implementar en pasos pequeños y verificar con `npm run build`.
4. Actualizar `MEMORY.md` al terminar (estado, decisiones, errores a evitar).
5. Si una decisión se vuelve permanente, moverla aquí.

## Memoria

- `MEMORY.md` es el estado vivo del proyecto; máximo ~50 líneas.
- Nunca guardar datos sensibles: claves, tokens, rutas personales ni contenido de conversaciones.

## Verificación

- `npm run build` debe compilar sin errores de tipos ni de lint.
- `npm run dev` para revisar la UI en el navegador.
- `npm test` valida el parser con un fixture representativo.
- `npm run check:parse -- "<ruta del chat>"` valida contra una exportación real.

## Límites

- ✅ Actualizar `MEMORY.md` al terminar cada tarea.
- ⚠️ Preguntar antes de instalar dependencias o crear rutas no previstas en la spec.
- 🚫 No escribir vistas/componentes sin spec aprobada.
- 🚫 No copiar ni mover la multimedia original del usuario.
- 🚫 No exponer rutas absolutas del disco en el HTML ni en los logs del cliente.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

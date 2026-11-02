# Spec 03 — Shell, sidebar, importación y tema

## Estructura visual

- Un único shell a pantalla completa: sidebar de 320–380 px + área de chat.
- Móvil (< 768 px): sidebar ocupa la pantalla; al abrir un chat se oculta y aparece una flecha de volver.
- Fondo general `zinc` (claro) / `zinc-950` (oscuro). Sin imágenes de fondo.
- Chat seleccionado en la URL: `/?c=<id>` para conservar el enlace al recargar.

## Sidebar

1. Cabecera: título "Chats", toggle de tema y botón `+` (abre el modal de importación).
2. Buscador local de chats por título.
3. Lista: avatar (o inicial), título, último mensaje recortado y hora.
4. Estado vacío: explicación breve y botón para importar.
5. Elemento activo con fondo `zinc-200` / `zinc-800`.

## Modal de importación (`+`)

Campos:

| Campo | Regla |
|---|---|
| Ruta de la carpeta | Obligatoria, absoluta; placeholder con un ejemplo de Windows |
| Nombre del chat | Opcional; por defecto se deduce del nombre de la carpeta |
| Foto | Opcional; se reduce en el navegador a 256 px y se envía como data URL |

- Muestra spinner y desactiva el botón mientras importa.
- Errores de la API en texto rojo dentro del modal.
- Si el chat ya existe, ofrece "Reemplazar" (reenvía con `replace=1`).
- Al terminar, cierra el modal, refresca la lista, abre el chat y muestra el modal de participantes.

## Modal de participantes

Se abre cuando el chat no tiene `owner_name`:

- Título "¿Cuáles son tus mensajes?".
- Lista de remitentes detectados con su número de mensajes; selección única.
- "Guardar" hace `PATCH /api/chats/[id]`.
- "Ahora no" cierra; el chat queda con todo a la izquierda y se puede repetir desde la cabecera.

## Menú del chat

Botón `···` en la cabecera con tres acciones:

| Acción | Efecto |
|---|---|
| Mis mensajes | Abre el modal de participantes y guarda `owner_name` |
| Cambiar / poner foto | Abre el modal de foto: elegir imagen (256 px, WebP), quitarla o guardar |
| Eliminar chat | Abre la confirmación y borra el chat y sus mensajes de la base; la carpeta original no se toca |

Los modales se montan solo al abrirse, se cierran con Esc o clic en el fondo, y muestran el error de la API en línea.

## Tema

- Clase `dark` en `<html>`, persistida en `localStorage` (`wpp-theme`).
- Valores `light`, `dark`, `system`; por defecto `system`.
- Paleta neutra `zinc`, sin acentos de color fuera de las burbujas propias.

## Criterios de aceptación

- Importar el chat real muestra el modal de participantes con los remitentes detectados.
- Al elegir el participante propio, sus mensajes pasan a la derecha en verde.
- Recargar `/?c=1` mantiene el chat abierto.
- Tema oscuro sin destellos blancos y persiste entre recargas.
- Sidebar usable con teclado y en 375 px de ancho.

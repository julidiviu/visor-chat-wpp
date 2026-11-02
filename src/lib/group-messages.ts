import type { ChatMessage } from "./types";

export type MessageBlock =
  | { kind: "images"; key: string; messages: ChatMessage[] }
  | { kind: "message"; key: string; message: ChatMessage };

/** Un mensaje sin texto ni adjunto es ruido del export (p. ej. una línea vacía). */
export function isRenderableMessage(message: ChatMessage): boolean {
  return (
    message.content.trim().length > 0 ||
    Boolean(message.attachmentName) ||
    Boolean(message.attachmentType)
  );
}

export function isPhotoMessage(message: ChatMessage): boolean {
  return (
    message.attachmentType === "image" &&
    message.content.trim().length === 0 &&
    Boolean(message.attachmentName)
  );
}

export const PHOTO_GROUP_WINDOW_MS = 60_000;

/**
 * Agrupa fotos consecutivas del mismo remitente en un solo bloque.
 * Las fotos con texto (caption) se quedan sueltas para no ocultar el texto.
 */
export function groupMessages(
  messages: ChatMessage[],
  windowMs = PHOTO_GROUP_WINDOW_MS,
): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  let photos: ChatMessage[] | null = null;

  const flush = () => {
    if (!photos?.length) return;
    if (photos.length === 1) {
      blocks.push({
        kind: "message",
        key: `msg-${photos[0].id}`,
        message: photos[0],
      });
    } else {
      blocks.push({
        kind: "images",
        key: `img-${photos[0].id}`,
        messages: photos,
      });
    }
    photos = null;
  };

  for (const message of messages) {
    if (!isRenderableMessage(message)) continue;

    if (!isPhotoMessage(message)) {
      flush();
      blocks.push({
        kind: "message",
        key: `msg-${message.id}`,
        message,
      });
      continue;
    }

    const previous = photos?.[photos.length - 1];
    if (
      photos &&
      previous &&
      previous.sender === message.sender &&
      message.ts - previous.ts <= windowMs
    ) {
      photos.push(message);
      continue;
    }

    flush();
    photos = [message];
  }

  flush();
  return blocks;
}

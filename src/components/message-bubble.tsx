"use client";

import { memo } from "react";
import { dayKey, formatTime, displayName } from "@/lib/format";
import type { ChatMessage } from "@/lib/types";
import { isRenderableMessage } from "@/lib/group-messages";
import {
  AudioMessage,
  DocumentMessage,
  ImageMessage,
  StickerMessage,
  StickerTime,
  VideoMessage,
} from "./media";
import { RichText } from "./rich-text";

const SYSTEM_PATTERNS = [
  /^se elimin[oó] este mensaje/i,
  /imagen omitida/i,
  /video omitido/i,
  /audio omitido/i,
  /documento omitido/i,
  /^llamada/i,
  /los mensajes y las llamadas est[aá]n cifrados/i,
  /cambi[oó] el asunto/i,
  /^se uni[oó]/i,
  /^sal[ií]o/i,
  /^creaste el grupo/i,
];

function isSystemMessage(message: ChatMessage): boolean {
  if (message.attachmentName) return false;
  return SYSTEM_PATTERNS.some((pattern) => pattern.test(message.content.trim()));
}

export const MessageBubble = memo(function MessageBubble({
  chatId,
  message,
  mine,
  grouped,
  query,
  focused,
  onOpenImage,
}: {
  chatId: number;
  message: ChatMessage;
  mine: boolean;
  grouped: boolean;
  query: string;
  focused: boolean;
  onOpenImage: (messageId: number) => void;
}) {
  const spacing = grouped ? "mt-0.5" : "mt-2.5";

  if (!isRenderableMessage(message)) return null;

  if (isSystemMessage(message)) {
    return (
      <div
        id={`msg-${message.id}`}
        data-day={dayKey(message.ts)}
        data-day-ts={message.ts}
        className={`${spacing} flex justify-center px-6`}
      >
        <span className="max-w-[85%] rounded-full bg-black/[0.055] px-3 py-1 text-center text-[11.5px] leading-relaxed text-muted dark:bg-white/[0.06]">
          {message.content}
        </span>
      </div>
    );
  }

  if (message.attachmentType === "sticker") {
    return (
      <div
        id={`msg-${message.id}`}
        data-day={dayKey(message.ts)}
        data-day-ts={message.ts}
        className={`${spacing} flex px-4 sm:px-8 ${
          mine ? "justify-end" : "justify-start"
        }`}
      >
        <div className="flex flex-col items-start gap-1">
          <StickerMessage chatId={chatId} message={message} />
          <StickerTime ts={message.ts} />
        </div>
      </div>
    );
  }

  const hasText =
    message.content.trim().length > 0 &&
    message.content.trim() !== message.attachmentName &&
    message.content.trim() !==
      (message.attachmentName ? displayName(message.attachmentName) : "");

  return (
    <div
      id={`msg-${message.id}`}
      data-day={dayKey(message.ts)}
      data-day-ts={message.ts}
      className={`${spacing} flex px-3 sm:px-8 ${
        mine ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`relative max-w-[min(86%,40rem)] rounded-[15px] px-2.5 pb-1 pt-1.5 shadow-[var(--shadow)] ${
          mine
            ? "rounded-tr-[4px] bg-own text-own-ink"
            : "rounded-tl-[4px] bg-other text-ink"
        } ${focused ? "ring-2 ring-accent ring-offset-2 ring-offset-canvas" : ""}`}
      >
        {hasText && (
          <p className="whitespace-pre-wrap break-words px-0.5 text-[14.5px] leading-[1.45]">
            <RichText text={message.content} query={query} />
          </p>
        )}

        {message.attachmentType === "image" && (
          <div className={hasText ? "mt-1.5" : ""}>
            <ImageMessage
              chatId={chatId}
              message={message}
              onOpen={() => onOpenImage(message.id)}
            />
          </div>
        )}

        {message.attachmentType === "video" && (
          <div className={hasText ? "mt-1.5" : ""}>
            <VideoMessage chatId={chatId} message={message} />
          </div>
        )}

        {message.attachmentType === "audio" && (
          <div className={hasText ? "mt-1.5" : ""}>
            <AudioMessage chatId={chatId} message={message} />
          </div>
        )}

        {message.attachmentType === "document" && (
          <div className={hasText ? "mt-1.5" : ""}>
            <DocumentMessage chatId={chatId} message={message} />
          </div>
        )}

        <div
          className={`mt-0.5 flex justify-end ${
            mine ? "text-own-ink/55" : "text-muted"
          }`}
        >
          <time
            dateTime={new Date(message.ts).toISOString()}
            title={new Date(message.ts).toLocaleString("es-EC")}
            className="font-mono text-[10.5px] tabular-nums"
          >
            {formatTime(message.ts)}
          </time>
        </div>
      </div>
    </div>
  );
});

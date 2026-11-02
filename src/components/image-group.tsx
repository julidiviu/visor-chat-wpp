"use client";

import { mediaUrl } from "@/lib/api";
import { dayKey, displayName, formatTime } from "@/lib/format";
import type { ChatMessage } from "@/lib/types";
import { MediaThumb } from "./media-thumb";

function Tile({
  src,
  alt,
  messageId,
  index,
  count,
  className,
  extra,
  onOpen,
}: {
  src: string;
  alt: string;
  messageId: number;
  index: number;
  count: number;
  className?: string;
  extra?: number;
  onOpen: (messageId: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(messageId)}
      aria-label={`Abrir foto ${index + 1} de ${count}`}
      className={`group relative overflow-hidden bg-black/10 dark:bg-white/5 ${className ?? ""}`}
    >
      <MediaThumb
        src={src}
        alt={alt}
        sizes="(max-width: 768px) 30vw, 160px"
        className="transition duration-150 group-hover:brightness-95"
      />

      {extra && index === 3 ? (
        <span className="absolute inset-0 grid place-items-center bg-black/55 font-sans text-2xl font-semibold text-white">
          +{extra}
        </span>
      ) : null}
    </button>
  );
}

export function ImageGroup({
  chatId,
  messages,
  mine,
  grouped,
  focused,
  onOpen,
}: {
  chatId: number;
  messages: ChatMessage[];
  mine: boolean;
  grouped: boolean;
  focused: boolean;
  onOpen: (messageId: number) => void;
}) {
  const count = messages.length;
  const visible = count > 4 ? messages.slice(0, 4) : messages;
  const extra = count - 4;

  const gridClass =
    count === 2
      ? "grid-cols-2 grid-rows-1"
      : count === 3
        ? "grid-cols-3 grid-rows-2"
        : "grid-cols-2 grid-rows-2";

  const last = messages[count - 1];

  return (
    <div
      id={`msg-${messages[0].id}`}
      data-msg-ids={messages.map((message) => message.id).join(" ")}
      data-day={dayKey(messages[0].ts)}
      data-day-ts={messages[0].ts}
      className={`${grouped ? "mt-0.5" : "mt-2.5"} flex px-3 sm:px-8 ${
        mine ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[min(86%,20rem)] rounded-[15px] p-1 shadow-[var(--shadow)] ${
          mine
            ? "rounded-tr-[4px] bg-own text-own-ink"
            : "rounded-tl-[4px] bg-other text-ink"
        } ${focused ? "ring-2 ring-accent ring-offset-2 ring-offset-canvas" : ""}`}
      >
        <div
          className={`grid aspect-square w-[300px] max-w-full gap-[2px] overflow-hidden rounded-[11px] ${gridClass}`}
        >
          {visible.map((message, index) =>
            message.attachmentName ? (
              <Tile
                key={message.id}
                src={mediaUrl(chatId, message.attachmentName)}
                alt={displayName(message.attachmentName)}
                messageId={message.id}
                index={index}
                count={count}
                extra={extra}
                className={
                  count === 3 && index === 0 ? "col-span-2 row-span-2" : ""
                }
                onOpen={onOpen}
              />
            ) : null,
          )}
        </div>

        <div
          className={`flex justify-end px-1 pt-1 ${
            mine ? "text-own-ink/55" : "text-muted"
          }`}
        >
          <time
            dateTime={new Date(last.ts).toISOString()}
            title={new Date(last.ts).toLocaleString("es-EC")}
            className="font-mono text-[10.5px] tabular-nums"
          >
            {formatTime(last.ts)}
          </time>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { mediaUrl } from "@/lib/api";
import {
  displayName,
  formatBytes,
  formatDuration,
  formatTime,
} from "@/lib/format";
import type { ChatMessage } from "@/lib/types";
import { DownloadIcon, ImageOffIcon, PauseIcon, PlayIcon } from "./icons";

export function MissingMedia({ label = "Archivo no encontrado" }: { label?: string }) {
  return (
    <div className="flex w-[250px] max-w-full items-center gap-2.5 rounded-xl border border-dashed border-current/20 px-3 py-2.5">
      <ImageOffIcon className="size-5 shrink-0 opacity-70" />
      <span className="min-w-0">
        <span className="block text-[13px] font-medium">{label}</span>
        <span className="block text-[11px] opacity-70">
          No estÃ¡ en la carpeta o no se puede abrir.
        </span>
      </span>
    </div>
  );
}

export function ImageMessage({
  chatId,
  message,
  onOpen,
}: {
  chatId: number;
  message: ChatMessage;
  onOpen: () => void;
}) {
  const [failed, setFailed] = useState(false);
  if (failed || !message.attachmentName) {
    return <MissingMedia label="Imagen no disponible" />;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Abrir ${displayName(message.attachmentName)}`}
      className="group/img block overflow-hidden rounded-lg bg-black/5 dark:bg-white/5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mediaUrl(chatId, message.attachmentName)}
        alt={displayName(message.attachmentName)}
        loading="lazy"
        onError={() => setFailed(true)}
        className="max-h-[340px] w-auto max-w-[300px] object-cover transition duration-150 group-hover/img:brightness-95"
      />
    </button>
  );
}

export function StickerMessage({
  chatId,
  message,
}: {
  chatId: number;
  message: ChatMessage;
}) {
  const [failed, setFailed] = useState(false);
  if (failed || !message.attachmentName) {
    return <MissingMedia label="Sticker no disponible" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mediaUrl(chatId, message.attachmentName)}
      alt="Sticker"
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-[148px] object-contain drop-shadow-sm"
    />
  );
}

export function VideoMessage({
  chatId,
  message,
}: {
  chatId: number;
  message: ChatMessage;
}) {
  const [failed, setFailed] = useState(false);
  if (failed || !message.attachmentName) {
    return <MissingMedia label="Video no disponible" />;
  }

  return (
    <video
      controls
      preload="metadata"
      onError={() => setFailed(true)}
      src={mediaUrl(chatId, message.attachmentName)}
      className="max-h-[360px] w-[320px] max-w-full rounded-lg bg-black"
    />
  );
}

export function AudioMessage({
  chatId,
  message,
}: {
  chatId: number;
  message: ChatMessage;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed || !message.attachmentName) {
    return <MissingMedia label="Audio no disponible" />;
  }

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setFailed(true);
      }
    } else {
      audio.pause();
    }
  }

  return (
    <div className="flex w-[252px] max-w-full items-center gap-3 py-0.5 pr-1">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar audio" : "Reproducir audio"}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-white transition hover:brightness-110"
      >
        {playing ? (
          <PauseIcon className="size-4" />
        ) : (
          <PlayIcon className="ml-0.5 size-4" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(current, duration || 0)}
          onChange={(event) => {
            const value = Number(event.target.value);
            setCurrent(value);
            if (audioRef.current) audioRef.current.currentTime = value;
          }}
          aria-label="PosiciÃ³n del audio"
          className="audio-range w-full"
        />
        <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] opacity-60">
          <span>{formatDuration(current)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={mediaUrl(chatId, message.attachmentName)}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) =>
          setDuration(event.currentTarget.duration || 0)
        }
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export function DocumentMessage({
  chatId,
  message,
}: {
  chatId: number;
  message: ChatMessage;
}) {
  if (!message.attachmentName) return <MissingMedia />;

  const name = displayName(message.attachmentName);
  const extension = name.split(".").pop()?.toUpperCase() ?? "ARCHIVO";
  const size = formatBytes(message.attachmentSize);

  return (
    <div className="flex w-[288px] max-w-full items-center gap-3 rounded-xl bg-black/5 p-2.5 dark:bg-white/5">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/15 font-mono text-[9.5px] font-semibold tracking-tight text-accent">
        {extension.slice(0, 4)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium" title={name}>
          {name}
        </span>
        <span className="block font-mono text-[10.5px] opacity-60">
          {size || extension}
        </span>
      </span>
      <a
        href={mediaUrl(chatId, message.attachmentName, true)}
        download
        aria-label={`Descargar ${name}`}
        className="grid size-8 shrink-0 place-items-center rounded-lg opacity-70 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
      >
        <DownloadIcon className="size-4" />
      </a>
    </div>
  );
}

export function StickerTime({ ts }: { ts: number }) {
  return (
    <span className="rounded-full bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-white/90">
      {formatTime(ts)}
    </span>
  );
}

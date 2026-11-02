"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { fetchMediaSummary, mediaUrl } from "@/lib/api";
import { displayName, formatCount } from "@/lib/format";
import type { ChatSummary, MediaSummary } from "@/lib/types";
import { Avatar } from "./avatar";
import {
  BackIcon,
  CameraIcon,
  ChevronRightIcon,
  CloseIcon,
  FolderIcon,
  TrashIcon,
  UserIcon,
} from "./icons";
import { MediaPanel } from "./media-panel";
import { MediaThumb } from "./media-thumb";

export function ContactPanel({
  chat,
  escEnabled,
  onClose,
  onOwner,
  onAvatar,
  onDelete,
  onOpenMedia,
}: {
  chat: ChatSummary;
  escEnabled: boolean;
  onClose: () => void;
  onOwner: () => void;
  onAvatar: () => void;
  onDelete: () => void;
  onOpenMedia: (messageId: number) => void;
}) {
  const [view, setView] = useState<"profile" | "media">("profile");
  const [summary, setSummary] = useState<MediaSummary | null>(null);
  const [summaryError, setSummaryError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchMediaSummary(chat.id)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        if (!cancelled) setSummaryError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [chat.id]);

  useEffect(() => {
    if (!escEnabled) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [escEnabled, onClose]);

  const totalFiles = summary
    ? summary.photos + summary.documents + summary.links
    : null;

  return (
    <aside
      aria-label="Información del contacto"
      className="absolute inset-0 z-50 isolate flex h-full w-full flex-col overflow-hidden border-line bg-panel [contain:paint] xl:static xl:z-auto xl:w-[360px] xl:shrink-0 xl:border-l"
    >
      <header className="flex h-16 shrink-0 items-center gap-1 border-b border-line px-2">
        {view === "media" && (
          <button
            type="button"
            onClick={() => setView("profile")}
            aria-label="Volver a la información del contacto"
            className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-panel-soft hover:text-ink"
          >
            <BackIcon />
          </button>
        )}

        <h2 className="min-w-0 flex-1 truncate px-2 text-[14.5px] font-semibold tracking-tight text-ink">
          {view === "media" ? "Archivos multimedia" : "Info. del contacto"}
        </h2>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar la información del contacto"
          className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-panel-soft hover:text-ink"
        >
          <CloseIcon />
        </button>
      </header>

      {view === "media" ? (
        <MediaPanel chatId={chat.id} onOpenMedia={onOpenMedia} />
      ) : (
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto pb-6">
          <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
            <Avatar title={chat.title} src={chat.avatar} size="2xl" />
            <h3 className="mt-4 text-[18px] font-semibold tracking-tight text-ink">
              {chat.title}
            </h3>
            <p className="mt-1 font-mono text-[11px] text-muted">
              {formatCount(chat.messageCount)} mensajes
            </p>
            {chat.ownerName && (
              <p className="mt-1 text-[12px] text-muted">
                Tú eres {chat.ownerName}
              </p>
            )}
          </div>

          <div className="px-3">
            <div className="rounded-xl border border-line bg-panel-soft/60 p-3">
              <button
                type="button"
                onClick={() => setView("media")}
                className="flex w-full items-center gap-3 text-left"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                  <FolderIcon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">
                    Archivos, enlaces y documentos
                  </span>
                  <span className="block font-mono text-[10.5px] text-muted">
                    {summaryError
                      ? "No se pudo cargar"
                      : totalFiles === null
                        ? "…"
                        : `${formatCount(totalFiles)} elementos`}
                  </span>
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted" />
              </button>

              {summary && summary.preview.length > 0 ? (
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {summary.preview.map((item) =>
                    item.attachmentName ? (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onOpenMedia(item.id)}
                        aria-label={`Abrir ${displayName(item.attachmentName)}`}
                        className="relative aspect-square overflow-hidden rounded-md bg-black/5 transition hover:opacity-90 dark:bg-white/5"
                      >
                        <MediaThumb
                          src={mediaUrl(chat.id, item.attachmentName)}
                          alt={displayName(item.attachmentName)}
                          sizes="70px"
                          video={item.attachmentType === "video"}
                        />
                      </button>
                    ) : null,
                  )}
                </div>
              ) : summary ? (
                <p className="mt-3 rounded-lg bg-panel px-3 py-3 text-center text-[11px] text-muted">
                  Sin multimedia todavía
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {Array.from({ length: 4 }, (_, index) => (
                    <span
                      key={index}
                      className="aspect-square animate-pulse rounded-md bg-panel"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 px-3">
            <div className="overflow-hidden rounded-xl border border-line">
              <ActionRow
                icon={<UserIcon className="size-4" />}
                label="Mis mensajes"
                hint={chat.ownerName ?? "Sin elegir"}
                onClick={onOwner}
              />
              <div className="h-px bg-line" />
              <ActionRow
                icon={<CameraIcon className="size-4" />}
                label={chat.avatar ? "Cambiar foto" : "Poner foto"}
                hint="Se muestra en la lista y en la cabecera"
                onClick={onAvatar}
              />
              <div className="h-px bg-line" />
              <ActionRow
                icon={<TrashIcon className="size-4" />}
                label="Eliminar chat"
                hint="Solo borra los datos importados"
                onClick={onDelete}
                danger
              />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function ActionRow({
  icon,
  label,
  hint,
  onClick,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-panel-soft ${
        danger ? "text-red-600 dark:text-red-400" : "text-ink"
      }`}
    >
      <span className={danger ? "shrink-0" : "shrink-0 text-muted"}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium">{label}</span>
        <span className="block truncate text-[11px] text-muted">{hint}</span>
      </span>
    </button>
  );
}

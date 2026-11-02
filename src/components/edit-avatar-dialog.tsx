"use client";

import { useEffect, useRef, useState } from "react";
import { saveAvatar } from "@/lib/api";
import { shrinkImage } from "@/lib/image";
import type { ChatSummary } from "@/lib/types";
import { Avatar } from "./avatar";
import { CloseIcon } from "./icons";

export function EditAvatarDialog({
  chat,
  onClose,
  onSaved,
}: {
  chat: ChatSummary;
  onClose: () => void;
  onSaved: (chatId: number, avatar: string | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(chat.avatar);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      setPreview(await shrinkImage(file));
    } catch {
      setError("No se pudo leer esa imagen. Prueba con un JPG o PNG.");
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const updated = await saveAvatar(chat.id, preview);
      onSaved(chat.id, updated.avatar);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo guardar la foto.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="overlay-in fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-title"
        className="dialog-in w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div>
            <h2 id="avatar-title" className="text-lg font-semibold text-ink">
              Foto del chat
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              Se usa en la lista de chats y en la cabecera de «{chat.title}».
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Cerrar"
            className="ml-auto grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-panel-soft hover:text-ink disabled:opacity-40"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mt-6 flex items-center gap-4">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className="size-20 shrink-0 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10"
            />
          ) : (
            <Avatar title={chat.title} size="xl" />
          )}

          <div className="flex flex-col items-start gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="h-9 rounded-lg border border-line px-3 text-[12.5px] font-medium text-ink transition-colors hover:bg-panel-soft disabled:opacity-50"
            >
              Elegir imagen
            </button>
            {preview && (
              <button
                type="button"
                onClick={() => setPreview(null)}
                disabled={busy}
                className="text-[12px] text-muted hover:text-ink disabled:opacity-50"
              >
                Quitar foto
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => pick(event.target.files?.[0])}
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-[13px] text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-10 rounded-xl px-4 text-sm text-muted transition-colors hover:bg-panel-soft hover:text-ink disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="h-10 rounded-xl bg-mark px-5 text-sm font-medium text-white transition hover:brightness-105 disabled:opacity-60"
          >
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

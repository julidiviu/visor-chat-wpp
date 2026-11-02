"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, importChat } from "@/lib/api";
import { shrinkImage } from "@/lib/image";
import type { ImportResult } from "@/lib/types";
import { CloseIcon, PlusIcon } from "./icons";

const fieldClass =
  "w-full rounded-xl border border-line bg-panel-soft px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-accent/60";

const labelClass = "mb-1.5 block text-[12.5px] font-medium text-muted";

export function ImportDialog({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (result: ImportResult) => void;
}) {
  const [folderPath, setFolderPath] = useState("");
  const [title, setTitle] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function pickAvatar(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      setAvatar(await shrinkImage(file));
    } catch {
      setError("No se pudo leer esa imagen. Prueba con un JPG o PNG.");
    }
  }

  async function run(replace: boolean) {
    if (!folderPath.trim()) {
      setError("Escribe la ruta de la carpeta del chat.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await importChat({
        folderPath: folderPath.trim(),
        title: title.trim() || undefined,
        avatar: avatar ?? undefined,
        replace,
      });
      onImported(result);
      onClose();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        const payload = cause.payload as { chatId?: number } | null;
        setConflict(payload?.chatId ?? -1);
      } else {
        setError(
          cause instanceof Error ? cause.message : "No se pudo importar el chat.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="overlay-in fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        className="dialog-in w-full max-w-lg rounded-2xl border border-line bg-panel p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0">
            <h2 id="import-title" className="text-lg font-semibold text-ink">
              Importar un chat
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              Apunta a la carpeta exportada. Debe contener{" "}
              <span className="font-mono text-[12px]">_chat.txt</span> y la
              multimedia.
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

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="import-path" className={labelClass}>
              Ruta de la carpeta
            </label>
            <input
              id="import-path"
              ref={inputRef}
              value={folderPath}
              onChange={(event) => setFolderPath(event.target.value)}
              placeholder="C:\Chats\WhatsApp Chat - Contacto"
              spellCheck={false}
              autoComplete="off"
              className={`${fieldClass} font-mono text-[12.5px]`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <label htmlFor="import-name" className={labelClass}>
                Nombre del chat
              </label>
              <input
                id="import-name"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Se toma del nombre de la carpeta"
                maxLength={120}
                className={fieldClass}
              />
            </div>

            <div>
              <span className={labelClass}>Foto</span>
              <div className="flex items-center gap-3">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    alt=""
                    className="size-11 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
                  />
                ) : (
                  <span className="grid size-11 place-items-center rounded-full border border-dashed border-line text-muted">
                    <PlusIcon className="size-4" />
                  </span>
                )}
                <label className="cursor-pointer rounded-lg border border-line px-2.5 py-1.5 text-[12px] text-muted transition-colors hover:text-ink">
                  Elegir
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => pickAvatar(event.target.files?.[0])}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-[13px] text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {conflict !== null && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3">
            <p className="text-[13px] text-amber-700 dark:text-amber-300">
              Esa carpeta ya está importada. Reemplazarla borra el chat actual y
              vuelve a leer todos los mensajes.
            </p>
            <button
              type="button"
              onClick={() => run(true)}
              disabled={busy}
              className="mt-2.5 h-8 rounded-lg bg-amber-600 px-3 text-[12.5px] font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Reemplazar chat
            </button>
          </div>
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
            onClick={() => run(false)}
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-mark px-5 text-sm font-medium text-white transition hover:brightness-105 disabled:opacity-60"
          >
            {busy ? (
              <>
                <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Importando…
              </>
            ) : (
              "Importar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

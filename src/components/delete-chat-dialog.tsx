"use client";

import { useEffect, useState } from "react";
import { deleteChat } from "@/lib/api";
import { formatCount } from "@/lib/format";
import type { ChatSummary } from "@/lib/types";
import { CloseIcon, TrashIcon } from "./icons";

export function DeleteChatDialog({
  chat,
  onClose,
  onDeleted,
}: {
  chat: ChatSummary;
  onClose: () => void;
  onDeleted: (chatId: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await deleteChat(chat.id);
      onDeleted(chat.id);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo eliminar el chat.",
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
        aria-labelledby="delete-title"
        className="dialog-in w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
            <TrashIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id="delete-title" className="text-lg font-semibold text-ink">
              Eliminar «{chat.title}»
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              Se borrarán los {formatCount(chat.messageCount)} mensajes
              importados de este chat. La carpeta original y su multimedia no se
              tocan.
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
            onClick={remove}
            disabled={busy}
            className="h-10 rounded-xl bg-red-600 px-5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

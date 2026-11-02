"use client";

import { useEffect, useState } from "react";
import { saveOwnerName } from "@/lib/api";
import { formatCount } from "@/lib/format";
import type { SenderCount } from "@/lib/types";
import { Avatar } from "./avatar";
import { CheckIcon, CloseIcon } from "./icons";

export function OwnerDialog({
  request,
  onClose,
  onSaved,
}: {
  request: { chatId: number; title: string; senders: SenderCount[] };
  onClose: () => void;
  onSaved: (chatId: number, ownerName: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(
    request.senders[0]?.name ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function save() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await saveOwnerName(request.chatId, selected);
      onSaved(request.chatId, selected);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo guardar el nombre.",
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
        aria-labelledby="owner-title"
        className="dialog-in w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div>
            <h2 id="owner-title" className="text-lg font-semibold text-ink">
              ¿Cuáles son tus mensajes?
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              Elige tu nombre en «{request.title}». Tus mensajes se verán a la
              derecha, como en WhatsApp.
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

        <div className="mt-5 space-y-2" role="radiogroup" aria-label="Participantes">
          {request.senders.map((sender) => {
            const active = sender.name === selected;
            return (
              <button
                key={sender.name}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(sender.name)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  active
                    ? "border-accent/60 bg-accent-soft"
                    : "border-line hover:bg-panel-soft"
                }`}
              >
                <Avatar title={sender.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {sender.name}
                  </span>
                  <span className="block font-mono text-[11px] text-muted">
                    {formatCount(sender.count)} mensajes
                  </span>
                </span>
                {active && <CheckIcon className="size-4 text-accent" />}
              </button>
            );
          })}
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
            Ahora no
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy || !selected}
            className="h-10 rounded-xl bg-mark px-5 text-sm font-medium text-white transition hover:brightness-105 disabled:opacity-60"
          >
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

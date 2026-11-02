"use client";

import { useEffect, useRef, useState } from "react";
import { CameraIcon, MoreIcon, TrashIcon, UserIcon } from "./icons";

export function ChatMenu({
  ownerName,
  hasAvatar,
  onOwner,
  onAvatar,
  onDelete,
}: {
  ownerName: string | null;
  hasAvatar: boolean;
  onOwner: () => void;
  onAvatar: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointer(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Opciones del chat"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`grid size-10 place-items-center rounded-full transition-colors ${
          open
            ? "bg-panel-soft text-ink"
            : "text-muted hover:bg-panel-soft hover:text-ink"
        }`}
      >
        <MoreIcon />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Opciones del chat"
          className="dialog-in absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-panel p-1 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => run(onOwner)}
            className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-panel-soft"
          >
            <UserIcon className="mt-0.5 size-4 shrink-0 text-muted" />
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-ink">
                Mis mensajes
              </span>
              <span className="block truncate text-[11.5px] text-muted">
                {ownerName ?? "Sin elegir"}
              </span>
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => run(onAvatar)}
            className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-panel-soft"
          >
            <CameraIcon className="mt-0.5 size-4 shrink-0 text-muted" />
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-ink">
                {hasAvatar ? "Cambiar foto" : "Poner foto"}
              </span>
              <span className="block truncate text-[11.5px] text-muted">
                Se muestra en la lista y en la cabecera
              </span>
            </span>
          </button>

          <div className="my-1 h-px bg-line" />

          <button
            type="button"
            role="menuitem"
            onClick={() => run(onDelete)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
          >
            <TrashIcon className="size-4 shrink-0" />
            Eliminar chat
          </button>
        </div>
      )}
    </div>
  );
}

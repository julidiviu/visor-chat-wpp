"use client";

import { useState } from "react";
import { previewOf, formatListTime, formatCount } from "@/lib/format";
import type { ChatSummary } from "@/lib/types";
import { Avatar } from "./avatar";
import { PlusIcon, SearchIcon } from "./icons";
import { ThemeToggle } from "./theme-toggle";

export function Sidebar({
  chats,
  activeId,
  loading,
  error,
  onSelect,
  onNewChat,
}: {
  chats: ChatSummary[];
  activeId: number | null;
  loading: boolean;
  error: string | null;
  onSelect: (id: number) => void;
  onNewChat: () => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? chats.filter((chat) => chat.title.toLowerCase().includes(needle))
    : chats;

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-r border-line bg-panel">
      <header className="flex h-16 shrink-0 items-center gap-3 px-4">
        <h1 className="text-[19px] font-semibold tracking-tight text-ink">
          Chats
        </h1>
        <span className="rounded-full bg-panel-soft px-2 py-0.5 font-mono text-[11px] text-muted">
          {formatCount(chats.length)}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={onNewChat}
            aria-label="Importar un chat"
            title="Importar un chat"
            className="grid size-10 place-items-center rounded-full bg-mark text-white shadow-sm transition hover:brightness-105 active:scale-95"
          >
            <PlusIcon />
          </button>
        </div>
      </header>

      <div className="shrink-0 px-3 pb-3">
        <label className="flex h-10 items-center gap-2.5 rounded-xl border border-line bg-panel-soft px-3 transition-colors focus-within:border-accent/60">
          <SearchIcon className="size-4 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar un chat"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted/80"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-[11px] text-muted hover:text-ink"
            >
              Limpiar
            </button>
          )}
        </label>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto pb-2">
        {loading && (
          <p className="px-4 py-6 text-sm text-muted">Cargando chats…</p>
        )}

        {!loading && chats.length === 0 && (
          <div className="mx-3 mt-2 rounded-2xl border border-dashed border-line px-5 py-8 text-center">
            <p className="text-sm font-medium text-ink">Todavía no hay chats</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              Importa la carpeta de un chat exportado de WhatsApp con su
              archivo <span className="font-mono text-[12px]">_chat.txt</span>.
            </p>
            <button
              type="button"
              onClick={onNewChat}
              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-mark px-4 text-[13px] font-medium text-white transition hover:brightness-105"
            >
              <PlusIcon className="size-4" />
              Importar chat
            </button>
          </div>
        )}

        {!loading && chats.length > 0 && visible.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted">
            Ningún chat coincide con “{query.trim()}”.
          </p>
        )}

        <ul>
          {visible.map((chat) => {
            const active = chat.id === activeId;
            return (
              <li key={chat.id}>
                <button
                  type="button"
                  onClick={() => onSelect(chat.id)}
                  aria-current={active ? "true" : undefined}
                  className={`group relative flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    active ? "bg-panel-soft" : "hover:bg-panel-soft/70"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r bg-accent" />
                  )}
                  <Avatar title={chat.title} src={chat.avatar} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-[15px] font-medium text-ink">
                        {chat.title}
                      </span>
                      <span className="ml-auto shrink-0 font-mono text-[11px] text-muted">
                        {formatListTime(chat.lastTs)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
                      <span className="truncate">
                        {previewOf(chat.lastContent, chat.lastAttachmentType)}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {error && (
        <p className="mx-3 mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </aside>
  );
}

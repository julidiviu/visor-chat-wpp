"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchMessages } from "@/lib/api";
import { fold, formatFullDate, previewOf } from "@/lib/format";
import type { ChatMessage } from "@/lib/types";
import { CalendarIcon, CloseIcon, SearchIcon } from "./icons";
import { Highlighted } from "./rich-text";

function toEpoch(date: string, endOfDay = false): number | undefined {
  if (!date) return undefined;
  const ts = new Date(
    `${date}T${endOfDay ? "23:59:59.999" : "00:00:00"}`,
  ).getTime();
  return Number.isNaN(ts) ? undefined : ts;
}

function Snippet({ text, query }: { text: string; query: string }) {
  if (text.includes("\u0001")) {
    return (
      <>
        {text.split(/[\u0001\u0002]/).map((part, index) =>
          index % 2 === 1 ? (
            <mark
              key={index}
              className="rounded-sm bg-accent/25 px-0.5 text-inherit"
            >
              {part}
            </mark>
          ) : (
            part
          ),
        )}
      </>
    );
  }
  return <Highlighted text={text} query={query} />;
}

export function SearchPanel({
  chatId,
  localMessages,
  query,
  onQueryChange,
  onClose,
  onJump,
}: {
  chatId: number;
  localMessages: ChatMessage[];
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onJump: (messageId: number) => void;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [results, setResults] = useState<ChatMessage[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fromTs = toEpoch(from);
  const toTs = toEpoch(to, true);
  const hasCriteria = Boolean(query.trim()) || fromTs !== undefined || toTs !== undefined;

  useEffect(() => {
    if (!hasCriteria) return;

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchMessages({
          chatId,
          q: query.trim() || undefined,
          from: fromTs,
          to: toTs,
          limit: 500,
        });
        if (!cancelled) {
          setResults(response.messages);
          setTotal(response.total ?? response.messages.length);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : "No se pudo buscar.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [chatId, query, fromTs, toTs, hasCriteria]);

  const localMatches = useMemo(() => {
    const needle = fold(query.trim());
    return localMessages
      .filter((message) => {
        if (needle && !fold(message.content).includes(needle)) return false;
        if (fromTs !== undefined && message.ts < fromTs) return false;
        if (toTs !== undefined && message.ts > toTs) return false;
        return true;
      })
      .slice(0, 6);
  }, [localMessages, query, fromTs, toTs]);

  return (
    <div className="relative z-20 shrink-0 border-b border-line bg-panel/95 shadow-lg backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
        <div className="flex h-9 min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-line bg-panel-soft px-2.5">
          <SearchIcon className="size-4 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar en el chat"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted/80"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Limpiar búsqueda"
              className="text-muted hover:text-ink"
            >
              <CloseIcon className="size-4" />
            </button>
          )}
        </div>

        <label className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-panel-soft px-2 text-[11.5px] text-muted">
          <CalendarIcon className="size-3.5" />
          <span className="hidden sm:inline">Desde</span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            aria-label="Desde"
            className="bg-transparent font-mono text-[11px] text-ink outline-none"
          />
        </label>

        <label className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-panel-soft px-2 text-[11.5px] text-muted">
          <CalendarIcon className="size-3.5" />
          <span className="hidden sm:inline">Hasta</span>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            aria-label="Hasta"
            className="bg-transparent font-mono text-[11px] text-ink outline-none"
          />
        </label>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar búsqueda"
          className="grid size-9 place-items-center rounded-lg text-muted hover:bg-panel-soft hover:text-ink"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="scroll-thin max-h-[46vh] overflow-y-auto border-t border-line/70">
        {!hasCriteria && (
          <p className="px-4 py-4 text-[12.5px] leading-relaxed text-muted">
            Escribe para filtrar esta ventana al instante y buscar en todo el
            chat. También puedes acotar por fecha.
          </p>
        )}

        {hasCriteria && localMatches.length > 0 && (
          <section>
            <p className="px-4 pb-1 pt-3 text-[11px] font-medium text-muted">
              En esta ventana · {localMatches.length}
            </p>
            {localMatches.map((message) => (
              <button
                key={`local-${message.id}`}
                type="button"
                onClick={() => onJump(message.id)}
                className="flex w-full items-start gap-3 px-4 py-2 text-left hover:bg-panel-soft"
              >
                <span className="mt-0.5 shrink-0 font-mono text-[10.5px] text-muted">
                  {formatFullDate(message.ts)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11.5px] text-muted">
                    {message.sender}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-ink/90">
                    <Highlighted
                      text={previewOf(message.content, message.attachmentType)}
                      query={query}
                    />
                  </span>
                </span>
              </button>
            ))}
          </section>
        )}

        {hasCriteria && (
          <section>
            <p className="px-4 pb-1 pt-3 text-[11px] font-medium text-muted">
              Todo el chat {results ? `· ${total}` : ""}
            </p>

            {results && results.length > 0 && results.length < total && (
              <p className="px-4 pb-1 text-[11px] text-muted">
                Mostrando los primeros {results.length} de {total}. Acota por
                fecha para ver el resto.
              </p>
            )}

            {loading && (
              <p className="flex items-center gap-2 px-4 py-3 text-[12.5px] text-muted">
                <span className="size-3 animate-spin rounded-full border-2 border-muted/30 border-t-muted" />
                Buscando…
              </p>
            )}

            {error && (
              <p className="px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            {!loading && !error && results?.length === 0 && (
              <p className="px-4 py-3 text-[12.5px] text-muted">
                Ningún mensaje coincide.
              </p>
            )}

            {results?.map((message) => (
              <button
                key={message.id}
                type="button"
                onClick={() => onJump(message.id)}
                className="flex w-full items-start gap-3 px-4 py-2 text-left hover:bg-panel-soft"
              >
                <span className="mt-0.5 shrink-0 font-mono text-[10.5px] text-muted">
                  {formatFullDate(message.ts)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11.5px] text-muted">
                    {message.sender}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-ink/90">
                    <Snippet
                      text={
                        message.snippet ??
                        previewOf(message.content, message.attachmentType)
                      }
                      query={query}
                    />
                  </span>
                </span>
              </button>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchMedia, mediaUrl } from "@/lib/api";
import { displayName, formatDay, formatTime } from "@/lib/format";
import type { ChatMessage } from "@/lib/types";
import { CloseIcon } from "./icons";

const WINDOW = 40;

/**
 * Lightbox global: navega por todas las fotos y videos del chat y carga
 * ventanas de 40 alrededor del elemento actual en lugar de la lista completa.
 */
export function MediaGallery({
  chatId,
  ownerName,
  anchorId,
  seed,
  onClose,
  onGoToMessage,
}: {
  chatId: number;
  ownerName: string | null;
  anchorId: number;
  seed: ChatMessage[];
  onClose: () => void;
  onGoToMessage: (messageId: number) => void;
}) {
  const [items, setItems] = useState<ChatMessage[]>(seed);
  const [currentId, setCurrentId] = useState(anchorId);
  const [basePosition, setBasePosition] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [hasBefore, setHasBefore] = useState(true);
  const [hasAfter, setHasAfter] = useState(true);
  const [loadingBefore, setLoadingBefore] = useState(false);
  const [loadingAfter, setLoadingAfter] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemsRef = useRef(items);
  const currentIdRef = useRef(currentId);
  const hasBeforeRef = useRef(hasBefore);
  const hasAfterRef = useRef(hasAfter);
  const busy = useRef({ before: false, after: false });
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    itemsRef.current = items;
    currentIdRef.current = currentId;
    hasBeforeRef.current = hasBefore;
    hasAfterRef.current = hasAfter;
  }, [items, currentId, hasBefore, hasAfter]);

  const select = useCallback((id: number) => {
    currentIdRef.current = id;
    setCurrentId(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchMedia<ChatMessage>({
      chatId,
      kind: "photos",
      aroundId: anchorId,
      limit: WINDOW + 1,
    })
      .then((page) => {
        if (cancelled) return;
        setTotal(page.total);
        if (page.items.length === 0) return;

        itemsRef.current = page.items;
        setItems(page.items);
        setBasePosition(page.position ?? 1);
        setHasBefore(page.hasBefore);
        setHasAfter(page.hasAfter);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo cargar la multimedia.");
      });

    return () => {
      cancelled = true;
    };
  }, [chatId, anchorId]);

  const loadBefore = useCallback(async (): Promise<ChatMessage[] | null> => {
    if (busy.current.before) return null;
    const first = itemsRef.current[0];
    if (!first) return null;

    busy.current.before = true;
    setLoadingBefore(true);
    try {
      const page = await fetchMedia<ChatMessage>({
        chatId,
        kind: "photos",
        beforeId: first.id,
        limit: WINDOW,
      });

      if (page.items.length > 0) {
        const next = [...page.items, ...itemsRef.current];
        itemsRef.current = next;
        setItems(next);
        setBasePosition(page.position ?? 1);
        setHasBefore(page.hasBefore);
      } else {
        hasBeforeRef.current = false;
        setHasBefore(false);
      }

      return page.items;
    } catch {
      setError("No se pudo cargar más multimedia.");
      return null;
    } finally {
      busy.current.before = false;
      setLoadingBefore(false);
    }
  }, [chatId]);

  const loadAfter = useCallback(async (): Promise<ChatMessage[] | null> => {
    if (busy.current.after) return null;
    const last = itemsRef.current[itemsRef.current.length - 1];
    if (!last) return null;

    busy.current.after = true;
    setLoadingAfter(true);
    try {
      const page = await fetchMedia<ChatMessage>({
        chatId,
        kind: "photos",
        afterId: last.id,
        limit: WINDOW,
      });

      if (page.items.length > 0) {
        const next = [...itemsRef.current, ...page.items];
        itemsRef.current = next;
        setItems(next);
        setHasAfter(page.hasAfter);
      } else {
        hasAfterRef.current = false;
        setHasAfter(false);
      }

      return page.items;
    } catch {
      setError("No se pudo cargar más multimedia.");
      return null;
    } finally {
      busy.current.after = false;
      setLoadingAfter(false);
    }
  }, [chatId]);

  const step = useCallback(
    async (delta: 1 | -1) => {
      const list = itemsRef.current;
      const index = list.findIndex((item) => item.id === currentIdRef.current);

      if (index === -1) {
        if (list[0]) select(list[0].id);
        return;
      }

      if (delta < 0) {
        if (index > 0) {
          select(list[index - 1].id);
          return;
        }
        if (!hasBeforeRef.current) return;
        const added = await loadBefore();
        const previous = added?.[added.length - 1];
        if (previous) select(previous.id);
        return;
      }

      if (index < list.length - 1) {
        select(list[index + 1].id);
        return;
      }
      if (!hasAfterRef.current) return;
      const added = await loadAfter();
      const next = added?.[0];
      if (next) select(next.id);
    },
    [loadAfter, loadBefore, select],
  );

  const index = items.findIndex((item) => item.id === currentId);
  const activeIndex = index >= 0 ? index : 0;
  const current = items[activeIndex];
  const position = total === null || !current ? null : basePosition + activeIndex;
  const sender =
    current && ownerName && current.sender === ownerName
      ? "Tú"
      : current?.sender ?? "";

  useEffect(() => {
    if (index === -1) return;
    if (index <= 5 && hasBefore) void loadBefore();
    if (items.length - index <= 6 && hasAfter) void loadAfter();
  }, [index, items.length, hasBefore, hasAfter, loadBefore, loadAfter]);

  useEffect(() => {
    if (index === -1) return;
    for (const offset of [-1, 1]) {
      const item = items[index + offset];
      if (item?.attachmentType === "image" && item.attachmentName) {
        const image = new window.Image();
        image.src = mediaUrl(chatId, item.attachmentName);
      }
    }
  }, [index, items, chatId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      const target =
        event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("video, input, textarea, select")) return;

      event.preventDefault();
      void step(event.key === "ArrowRight" ? 1 : -1);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, step]);

  const atStart = activeIndex === 0 && !hasBefore;
  const atEnd = activeIndex === items.length - 1 && !hasAfter;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Multimedia ampliada"
      className="overlay-in fixed inset-0 z-[60] flex flex-col overflow-hidden bg-black/90"
    >
      <div className="flex h-14 shrink-0 items-center gap-3 px-4 text-white/80">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-white/90">
            {current ? sender : "Cargando multimedia…"}
          </p>
          {current && (
            <p className="truncate font-mono text-[10px] text-white/40">
              {formatDay(current.ts)} · {formatTime(current.ts)}
            </p>
          )}
        </div>

        <span className="shrink-0 font-mono text-[11px] tabular-nums">
          {position ?? "…"} / {total ?? "…"}
        </span>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar multimedia"
          className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-white/10 hover:text-white"
        >
          <CloseIcon />
        </button>
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        onTouchStart={(event) => {
          touchStart.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          touchStart.current = null;
          if (start === null) return;
          const delta = (event.changedTouches[0]?.clientX ?? start) - start;
          if (Math.abs(delta) > 60) void step(delta < 0 ? 1 : -1);
        }}
      >
        {current ? (
          <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-6">
            {current.attachmentType === "video" ? (
              <video
                key={current.id}
                src={mediaUrl(chatId, current.attachmentName ?? "")}
                controls
                preload="metadata"
                className="max-h-[calc(100dvh-9rem)] max-w-[calc(100vw-2rem)] rounded bg-black shadow-2xl"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={current.id}
                src={mediaUrl(chatId, current.attachmentName ?? "")}
                alt={displayName(current.attachmentName ?? "Foto")}
                loading="eager"
                className="h-auto max-h-[calc(100dvh-9rem)] w-auto max-w-[calc(100vw-2rem)] select-none object-contain shadow-2xl sm:max-h-[calc(100dvh-10rem)]"
              />
            )}
          </div>
        ) : (
          <div className="grid h-full place-items-center px-8 text-center text-[13px] text-white/60">
            {error ??
              (total === 0
                ? "No hay fotos ni videos en este chat."
                : "Cargando multimedia…")}
          </div>
        )}

        {(loadingBefore || loadingAfter) && (
          <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/70 backdrop-blur">
            Cargando…
          </span>
        )}

        {error && current && (
          <p className="absolute inset-x-4 top-3 rounded-lg bg-red-500/15 px-3 py-2 text-center text-[11.5px] text-red-100">
            {error}
          </p>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex h-16 shrink-0 items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => void step(-1)}
            disabled={loadingBefore || atStart}
            className="rounded-full border border-white/15 px-4 py-2 text-[12.5px] text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => current && onGoToMessage(current.id)}
            disabled={!current}
            className="rounded-full bg-accent px-4 py-2 text-[12.5px] font-medium text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Ir al mensaje
          </button>
          <button
            type="button"
            onClick={() => void step(1)}
            disabled={loadingAfter || atEnd}
            className="rounded-full border border-white/15 px-4 py-2 text-[12.5px] text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

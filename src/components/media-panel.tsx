"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchMedia, mediaUrl } from "@/lib/api";
import {
  displayName,
  formatBytes,
  formatShortDate,
  formatTime,
} from "@/lib/format";
import { groupByMonth } from "@/lib/media";
import type { ChatMessage, LinkItem, MediaKind } from "@/lib/types";
import { DownloadIcon, LinkIcon } from "./icons";
import { MediaThumb } from "./media-thumb";

const TABS: { kind: MediaKind; label: string }[] = [
  { kind: "photos", label: "Archivos multimedia" },
  { kind: "documents", label: "Documentos" },
  { kind: "links", label: "Enlaces" },
];

const PAGE = 60;

export function MediaPanel({
  chatId,
  onOpenMedia,
}: {
  chatId: number;
  onOpenMedia: (messageId: number) => void;
}) {
  const [tab, setTab] = useState<MediaKind>("photos");
  const [photos, setPhotos] = useState<ChatMessage[]>([]);
  const [photoTotal, setPhotoTotal] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [photosError, setPhotosError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ChatMessage[] | null>(null);
  const [links, setLinks] = useState<LinkItem[] | null>(null);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const photosRef = useRef(photos);
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    let cancelled = false;

    fetchMedia<ChatMessage>({ chatId, kind: "photos", limit: PAGE })
      .then((page) => {
        if (cancelled) return;
        const next = [...page.items].reverse();
        photosRef.current = next;
        setPhotos(next);
        setPhotoTotal(page.total);
        setHasMore(page.hasBefore);
      })
      .catch(() => {
        if (!cancelled) setPhotosError("No se pudo cargar la multimedia.");
      })
      .finally(() => {
        if (!cancelled) setLoadingPhotos(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chatId, reload]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) return;
    const last = photosRef.current[photosRef.current.length - 1];
    if (!last) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchMedia<ChatMessage>({
        chatId,
        kind: "photos",
        beforeId: last.id,
        limit: PAGE,
      });
      const older = [...page.items].reverse();
      if (older.length > 0) {
        const next = [...photosRef.current, ...older];
        photosRef.current = next;
        setPhotos(next);
      }
      setHasMore(page.hasBefore);
      setPhotosError(null);
    } catch {
      setPhotosError("No se pudo cargar más multimedia.");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [chatId]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (tab !== "photos" || !target || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "240px 0px 0px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [tab, hasMore, loadMore]);

  useEffect(() => {
    if (tab !== "documents" || documents !== null) return;
    let cancelled = false;

    fetchMedia<ChatMessage>({ chatId, kind: "documents", limit: 100 })
      .then((page) => {
        if (!cancelled) setDocuments([...page.items].reverse());
      })
      .catch(() => {
        if (!cancelled) setSectionError("No se pudieron cargar los documentos.");
      });

    return () => {
      cancelled = true;
    };
  }, [tab, documents, chatId, reload]);

  useEffect(() => {
    if (tab !== "links" || links !== null) return;
    let cancelled = false;

    fetchMedia<LinkItem>({ chatId, kind: "links" })
      .then((page) => {
        if (!cancelled) setLinks(page.items);
      })
      .catch(() => {
        if (!cancelled) setSectionError("No se pudieron cargar los enlaces.");
      });

    return () => {
      cancelled = true;
    };
  }, [tab, links, chatId, reload]);

  const sections = useMemo(() => groupByMonth(photos), [photos]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-panel">
      <div className="flex shrink-0 border-b border-line px-2">
        {TABS.map((item) => {
          const active = tab === item.kind;
          return (
            <button
              key={item.kind}
              type="button"
              onClick={() => setTab(item.kind)}
              aria-pressed={active}
              className={`relative flex-1 whitespace-nowrap px-1 py-3 text-[11.5px] font-medium transition-colors ${
                active ? "text-accent" : "text-muted hover:text-ink"
              }`}
            >
              {item.label}
              {active && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto bg-panel">
        {tab === "photos" && (
          <div className="px-3 pb-10">
            {loadingPhotos && photos.length === 0 && (
              <div className="grid grid-cols-3 gap-1.5 pt-4">
                {Array.from({ length: 9 }, (_, index) => (
                  <span
                    key={index}
                    className="aspect-square animate-pulse rounded-md bg-panel-soft"
                  />
                ))}
              </div>
            )}

            {photosError && (
              <div className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-[11.5px] text-red-700 dark:text-red-300">
                <p>{photosError}</p>
                <button
                  type="button"
                  onClick={() => {
                    photosRef.current = [];
                    setPhotos([]);
                    setPhotoTotal(null);
                    setHasMore(true);
                    setPhotosError(null);
                    setLoadingPhotos(true);
                    setReload((value) => value + 1);
                  }}
                  className="mt-1 underline underline-offset-2"
                >
                  Reintentar
                </button>
              </div>
            )}

            {!loadingPhotos && photos.length === 0 && !photosError && (
              <p className="pt-10 text-center text-[12.5px] text-muted">
                No hay fotos ni videos en este chat.
              </p>
            )}

            {sections.map((section) => (
              <section key={section.key} className="pt-4">
                <h3 className="pb-2 text-[10.5px] font-semibold text-muted">
                  {section.label}
                </h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {section.items.map((item) =>
                    item.attachmentName ? (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onOpenMedia(item.id)}
                        aria-label={`Abrir ${displayName(item.attachmentName)}`}
                        className="relative aspect-square overflow-hidden rounded-md bg-black/5 transition hover:opacity-90 dark:bg-white/5"
                      >
                        <MediaThumb
                          src={mediaUrl(chatId, item.attachmentName)}
                          alt={displayName(item.attachmentName)}
                          sizes="(min-width: 1280px) 110px, 30vw"
                          video={item.attachmentType === "video"}
                        />
                      </button>
                    ) : null,
                  )}
                </div>
              </section>
            ))}

            {photoTotal !== null && photos.length > 0 && (
              <p className="pt-5 text-center font-mono text-[10.5px] text-muted">
                {photos.length} de {photoTotal}
              </p>
            )}

            {loadingMore && (
              <p className="pt-3 text-center text-[11px] text-muted">
                Cargando más…
              </p>
            )}
            <div ref={sentinelRef} className="h-px w-full" />
          </div>
        )}

        {tab === "documents" && (
          <div className="px-2 py-2">
            {documents === null && !sectionError && (
              <p className="py-10 text-center text-[12.5px] text-muted">
                Cargando documentos…
              </p>
            )}
            {documents?.length === 0 && (
              <p className="py-10 text-center text-[12.5px] text-muted">
                No hay documentos en este chat.
              </p>
            )}
            {documents?.map((document) => {
              const name = displayName(document.attachmentName ?? "Documento");
              const extension = name.split(".").pop()?.toUpperCase() ?? "ARCHIVO";
              return (
                <a
                  key={document.id}
                  href={mediaUrl(chatId, document.attachmentName ?? "", true)}
                  download
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-panel-soft"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/10 font-mono text-[9px] font-semibold text-accent">
                    {extension.slice(0, 4)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-ink">
                      {name}
                    </span>
                    <span className="block font-mono text-[10px] text-muted">
                      {[formatBytes(document.attachmentSize), formatShortDate(document.ts)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <DownloadIcon className="size-4 shrink-0 text-muted" />
                </a>
              );
            })}
            <SectionError
              message={sectionError}
              onRetry={() => {
                setSectionError(null);
                setDocuments(null);
                setLinks(null);
                setReload((value) => value + 1);
              }}
            />
          </div>
        )}

        {tab === "links" && (
          <div className="px-2 py-2">
            {links === null && !sectionError && (
              <p className="py-10 text-center text-[12.5px] text-muted">
                Cargando enlaces…
              </p>
            )}
            {links?.length === 0 && (
              <p className="py-10 text-center text-[12.5px] text-muted">
                No hay enlaces en este chat.
              </p>
            )}
            {links?.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-panel-soft"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                  <LinkIcon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium text-ink">
                    {link.host}
                  </span>
                  <span className="block truncate text-[11px] text-muted">
                    {link.url}
                  </span>
                  <span className="block font-mono text-[10px] text-muted">
                    {formatShortDate(link.ts)} · {formatTime(link.ts)}
                  </span>
                </span>
              </a>
            ))}
            <SectionError
              message={sectionError}
              onRetry={() => {
                setSectionError(null);
                setDocuments(null);
                setLinks(null);
                setReload((value) => value + 1);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SectionError({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  if (!message) return null;
  return (
    <div className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-[11.5px] text-red-700 dark:text-red-300">
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 underline underline-offset-2"
      >
        Reintentar
      </button>
    </div>
  );
}

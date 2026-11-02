"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fetchMessages } from "@/lib/api";
import { dayKey, formatCount, formatDaySeparator, sameDay } from "@/lib/format";
import { groupMessages } from "@/lib/group-messages";
import { isVisualMessage } from "@/lib/media";
import type { ChatMessage, ChatSummary } from "@/lib/types";
import { Avatar } from "./avatar";
import { ChatMenu } from "./chat-menu";
import { ContactPanel } from "./contact-panel";
import { ArrowDownIcon, BackIcon, LockIcon, SearchIcon } from "./icons";
import { ImageGroup } from "./image-group";
import { MediaGallery } from "./media-gallery";
import { MessageBubble } from "./message-bubble";
import { SearchPanel } from "./search-panel";

const PAGE = 50;
const GROUP_WINDOW = 5 * 60 * 1000;

export function ChatView({
  chat,
  onBack,
  onOwnerClick,
  onAvatarClick,
  onDeleteClick,
}: {
  chat: ChatSummary;
  onBack: () => void;
  onOwnerClick: () => void;
  onAvatarClick: () => void;
  onDeleteClick: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasOlder, setHasOlder] = useState(false);
  const [hasNewer, setHasNewer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadingNewer, setLoadingNewer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [gallery, setGallery] = useState<{
    anchorId: number;
    seed: ChatMessage[];
  } | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [floatingDay, setFloatingDay] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialScroll = useRef(true);
  const pendingPrepend = useRef<number | null>(null);
  const loadingOlderRef = useRef(false);
  const loadingNewerRef = useRef(false);
  const dayFrame = useRef<number | null>(null);
  const blocks = useMemo(() => groupMessages(messages), [messages]);

  const updateDayLabel = useCallback(() => {
    const root = scrollRef.current;
    if (!root) return;

    const rootTop = root.getBoundingClientRect().top;
    let active: HTMLElement | null = null;
    for (const block of root.querySelectorAll<HTMLElement>("[data-day]")) {
      if (block.getBoundingClientRect().bottom > rootTop + 4) {
        active = block;
        break;
      }
    }

    if (!active) {
      setFloatingDay(null);
      return;
    }

    // Si ya hay un separador de fecha visible arriba, no hace falta duplicarlo.
    const separatorNearTop = [
      ...root.querySelectorAll<HTMLElement>("[data-day-separator]"),
    ].find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.bottom > rootTop + 4 && rect.top < rootTop + 96;
    });
    if (separatorNearTop) {
      setFloatingDay(null);
      return;
    }

    const ts = Number(active.dataset.dayTs);
    setFloatingDay(Number.isFinite(ts) ? formatDaySeparator(ts) : null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    initialScroll.current = true;

    fetchMessages({ chatId: chat.id, limit: PAGE })
      .then((response) => {
        if (cancelled) return;
        setMessages(response.messages);
        setHasOlder(response.hasOlder);
        setHasNewer(response.hasNewer ?? false);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : "No se pudo cargar el chat.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chat.id, reloadKey]);

  useLayoutEffect(() => {
    if (!initialScroll.current) return;
    const element = scrollRef.current;
    if (element && messages.length > 0) {
      element.scrollTop = element.scrollHeight;
      initialScroll.current = false;
      setAtBottom(true);
    }
  }, [messages]);

  // Al prepend, conserva el ancla visual después de que React pinte los mensajes.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    const previousHeight = pendingPrepend.current;
    if (!element || previousHeight === null) return;

    pendingPrepend.current = null;
    const delta = element.scrollHeight - previousHeight;
    if (delta > 0) element.scrollTop += delta;
  }, [messages]);

  useLayoutEffect(() => {
    updateDayLabel();
  }, [messages, updateDayLabel]);

  useEffect(() => {
    return () => {
      if (dayFrame.current !== null) cancelAnimationFrame(dayFrame.current);
    };
  }, []);

  const loadOlder = useCallback(async () => {
    if (!hasOlder || loadingOlderRef.current || messages.length === 0) return;

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    const element = scrollRef.current;

    try {
      const response = await fetchMessages({
        chatId: chat.id,
        beforeId: messages[0].id,
        limit: PAGE,
      });
      pendingPrepend.current = element?.scrollHeight ?? null;
      setMessages((current) => [...response.messages, ...current]);
      setHasOlder(response.hasOlder);
    } catch {
      setError("No se pudieron cargar los mensajes anteriores.");
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [chat.id, hasOlder, messages]);

  useEffect(() => {
    const root = scrollRef.current;
    const target = topRef.current;
    if (!root || !target || !hasOlder) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadOlder();
      },
      { root, rootMargin: "260px 0px 0px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasOlder, loadOlder]);

  const loadNewer = useCallback(async () => {
    if (!hasNewer || loadingNewerRef.current || messages.length === 0) return;

    loadingNewerRef.current = true;
    setLoadingNewer(true);
    try {
      const response = await fetchMessages({
        chatId: chat.id,
        afterId: messages[messages.length - 1].id,
        limit: PAGE,
      });
      if (response.messages.length > 0) {
        setMessages((current) => [...current, ...response.messages]);
      }
      setHasNewer(response.hasNewer ?? false);
    } catch {
      setError("No se pudieron cargar los mensajes siguientes.");
    } finally {
      loadingNewerRef.current = false;
      setLoadingNewer(false);
    }
  }, [chat.id, hasNewer, messages]);

  useEffect(() => {
    const root = scrollRef.current;
    const target = bottomRef.current;
    if (!root || !target || !hasNewer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadNewer();
      },
      { root, rootMargin: "0px 0px 260px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasNewer, loadNewer]);

  function handleScroll() {
    const element = scrollRef.current;
    if (!element) return;
    setAtBottom(
      element.scrollHeight - element.scrollTop - element.clientHeight < 240,
    );

    if (dayFrame.current === null) {
      dayFrame.current = requestAnimationFrame(() => {
        dayFrame.current = null;
        updateDayLabel();
      });
    }
  }

  function scrollToBottom() {
    const element = scrollRef.current;
    if (element) element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
    setAtBottom(true);
  }

  async function jumpTo(messageId: number) {
    initialScroll.current = false;
    setSearchOpen(false);
    setQuery("");
    try {
      const response = await fetchMessages({
        chatId: chat.id,
        aroundId: messageId,
        limit: 80,
      });
      setMessages(response.messages);
      setHasOlder(response.hasOlder);
      setHasNewer(response.hasNewer ?? false);
      setFocusedId(messageId);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const target =
            document.getElementById(`msg-${messageId}`) ??
            document.querySelector(`[data-msg-ids~="${messageId}"]`);
          target?.scrollIntoView({ block: "center" });
        });
      });
      window.setTimeout(() => setFocusedId(null), 2600);
    } catch {
      setError("No se pudo abrir ese mensaje.");
    }
  }

  function openPhoto(messageId: number) {
    setGallery({
      anchorId: messageId,
      seed: messages.filter(isVisualMessage),
    });
  }

  function goToMessage(messageId: number) {
    setGallery(null);
    setPanelOpen(false);
    void jumpTo(messageId);
  }

  const isMine = (message: ChatMessage) =>
    Boolean(chat.ownerName) && message.sender === chat.ownerName;

  return (
    <div className="relative flex h-full min-w-0 flex-1">
      <section
        className={`relative flex h-full min-w-0 flex-1 flex-col ${
          panelOpen ? "max-xl:invisible" : ""
        }`}
      >
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-panel px-3 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver a los chats"
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-panel-soft hover:text-ink md:hidden"
        >
          <BackIcon />
        </button>

        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          aria-expanded={panelOpen}
          aria-label="Abrir la información del contacto"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left"
        >
          <Avatar title={chat.title} src={chat.avatar} size="lg" />

          <div className="min-w-0">
            <h2 className="truncate text-[15.5px] font-semibold tracking-tight text-ink">
              {chat.title}
            </h2>
            <p className="truncate font-mono text-[11px] text-muted">
              {formatCount(chat.messageCount)} mensajes
              {chat.ownerName && (
                <span className="hidden sm:inline">
                  {" "}
                  · tú eres {chat.ownerName}
                </span>
              )}
            </p>
          </div>
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setSearchOpen((open) => !open);
              if (searchOpen) setQuery("");
            }}
            aria-label="Buscar en la conversación"
            aria-expanded={searchOpen}
            className={`grid size-10 place-items-center rounded-full transition-colors ${
              searchOpen
                ? "bg-accent-soft text-accent"
                : "text-muted hover:bg-panel-soft hover:text-ink"
            }`}
          >
            <SearchIcon />
          </button>

          <ChatMenu
            ownerName={chat.ownerName}
            hasAvatar={Boolean(chat.avatar)}
            onOwner={onOwnerClick}
            onAvatar={onAvatarClick}
            onDelete={onDeleteClick}
          />
        </div>
      </header>

      {searchOpen && (
        <SearchPanel
          chatId={chat.id}
          localMessages={messages}
          query={query}
          onQueryChange={setQuery}
          onClose={() => {
            setSearchOpen(false);
            setQuery("");
          }}
          onJump={jumpTo}
        />
      )}

      {error && (
        <div className="flex shrink-0 items-center gap-3 border-b border-line bg-red-500/10 px-4 py-2 text-[12.5px] text-red-700 dark:text-red-300">
          <span className="min-w-0 flex-1">{error}</span>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setLoading(true);
              setReloadKey((key) => key + 1);
            }}
            className="rounded-lg border border-red-500/30 px-2 py-1 text-[11.5px] hover:bg-red-500/10"
          >
            Reintentar
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="chat-canvas scroll-thin relative min-h-0 flex-1 overflow-y-auto [overflow-anchor:none]"
      >
        <div ref={topRef} className="h-px w-full" />

        <div className="pointer-events-none sticky top-2 z-30 h-0">
          {floatingDay && (
            <span
              data-floating-day
              className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-panel/90 px-3 py-1 font-mono text-[10.5px] text-muted shadow-sm ring-1 ring-line/70 backdrop-blur first-letter:uppercase"
            >
              {floatingDay}
            </span>
          )}
        </div>

        {loading && (
          <div className="flex h-full items-center justify-center gap-2.5 text-[13px] text-muted">
            <span className="size-4 animate-spin rounded-full border-2 border-muted/30 border-t-muted" />
            Cargando mensajes…
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-[13px] text-muted">
              No hay mensajes en este chat.
            </p>
          </div>
        )}

        {!loading && messages.length > 0 && (
          <div className="mx-auto w-full max-w-[1080px] pb-3 pt-3">
            <div className="flex h-8 items-center justify-center text-[11px] text-muted">
              {loadingOlder ? "Cargando mensajes anteriores…" : null}
            </div>
            {!hasOlder && (
              <p className="pb-1 pt-2 text-center text-[10.5px] text-muted/80">
                Inicio de la conversación
              </p>
            )}

            {blocks.map((block, index) => {
              const first =
                block.kind === "images" ? block.messages[0] : block.message;
              const previousBlock = blocks[index - 1];
              const previousLast = previousBlock
                ? previousBlock.kind === "images"
                  ? previousBlock.messages[previousBlock.messages.length - 1]
                  : previousBlock.message
                : null;
              const newDay = !previousLast || !sameDay(previousLast.ts, first.ts);
              const grouped =
                Boolean(previousLast) &&
                !newDay &&
                previousLast.sender === first.sender &&
                first.ts - previousLast.ts < GROUP_WINDOW;

              return (
                <Fragment key={block.key}>
                  {newDay && (
                    <div
                      data-day-separator={dayKey(first.ts)}
                      className="flex justify-center px-4 py-4"
                    >
                      <span className="rounded-full bg-panel/85 px-3 py-1 font-mono text-[10.5px] text-muted shadow-sm ring-1 ring-line/70 backdrop-blur first-letter:uppercase">
                        {formatDaySeparator(first.ts)}
                      </span>
                    </div>
                  )}

                  {block.kind === "images" ? (
                    <ImageGroup
                      chatId={chat.id}
                      messages={block.messages}
                      mine={isMine(first)}
                      grouped={grouped}
                      focused={block.messages.some(
                        (message) => message.id === focusedId,
                      )}
                      onOpen={openPhoto}
                    />
                  ) : (
                    <MessageBubble
                      chatId={chat.id}
                      message={block.message}
                      mine={isMine(block.message)}
                      grouped={grouped}
                      query={query}
                      focused={focusedId === block.message.id}
                      onOpenImage={openPhoto}
                    />
                  )}
                </Fragment>
              );
            })}

            <div ref={bottomRef} className="h-px w-full" />
            {loadingNewer && (
              <p className="py-2 text-center text-[11px] text-muted">
                Cargando mensajes siguientes…
              </p>
            )}
          </div>
        )}
      </div>

      {!atBottom && !loading && (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Ir al último mensaje"
          className="absolute bottom-16 right-4 z-20 grid size-10 place-items-center rounded-full border border-line bg-panel text-muted shadow-lg transition hover:text-ink"
        >
          <ArrowDownIcon />
        </button>
      )}

      <footer className="flex h-12 shrink-0 items-center gap-2 border-t border-line bg-panel px-4 text-[11.5px] text-muted">
        <LockIcon className="size-3.5 shrink-0" />
        <span className="font-medium text-ink/70">Solo lectura</span>
        <span className="hidden opacity-40 sm:inline">·</span>
        <span className="hidden truncate sm:inline">
          Los mensajes se leen desde{" "}
          <span className="font-mono text-[10.5px]">_chat.txt</span> y su carpeta
          de multimedia.
        </span>
      </footer>

      </section>

      {panelOpen && (
        <ContactPanel
          chat={chat}
          escEnabled={!gallery}
          onClose={() => setPanelOpen(false)}
          onOwner={() => {
            setPanelOpen(false);
            onOwnerClick();
          }}
          onAvatar={() => {
            setPanelOpen(false);
            onAvatarClick();
          }}
          onDelete={() => {
            setPanelOpen(false);
            onDeleteClick();
          }}
          onOpenMedia={(messageId) =>
            setGallery({ anchorId: messageId, seed: [] })
          }
        />
      )}

      {gallery && (
        <MediaGallery
          key={gallery.anchorId}
          chatId={chat.id}
          ownerName={chat.ownerName}
          anchorId={gallery.anchorId}
          seed={gallery.seed}
          onClose={() => setGallery(null)}
          onGoToMessage={goToMessage}
        />
      )}
    </div>
  );
}

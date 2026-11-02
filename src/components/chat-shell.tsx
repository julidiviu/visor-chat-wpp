"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchChatDetail, fetchChats } from "@/lib/api";
import type { ChatSummary, ImportResult, SenderCount } from "@/lib/types";
import { ChatView } from "./chat-view";
import { DeleteChatDialog } from "./delete-chat-dialog";
import { EditAvatarDialog } from "./edit-avatar-dialog";
import { ChatIcon, PlusIcon } from "./icons";
import { ImportDialog } from "./import-dialog";
import { OwnerDialog } from "./owner-dialog";
import { Sidebar } from "./sidebar";

interface OwnerRequest {
  chatId: number;
  title: string;
  senders: SenderCount[];
}

export function ChatShell() {
  const searchParams = useSearchParams();
  const initialParam = useRef(searchParams.get("c"));

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [ownerRequest, setOwnerRequest] = useState<OwnerRequest | null>(null);
  const [avatarChat, setAvatarChat] = useState<ChatSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatSummary | null>(null);
  const dismissedOwner = useRef(new Set<number>());

  useEffect(() => {
    let cancelled = false;

    fetchChats()
      .then((list) => {
        if (cancelled) return;
        setChats(list);
        const requested = Number(initialParam.current);
        const fromUrl = list.find((chat) => chat.id === requested);
        setActiveId(fromUrl?.id ?? list[0]?.id ?? null);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudieron cargar los chats.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    window.history.replaceState(null, "", activeId ? `/?c=${activeId}` : "/");
  }, [activeId]);

  const activeChat = chats.find((chat) => chat.id === activeId) ?? null;

  useEffect(() => {
    if (!activeChat || activeChat.ownerName) return;
    if (dismissedOwner.current.has(activeChat.id)) return;

    let cancelled = false;
    fetchChatDetail(activeChat.id)
      .then((detail) => {
        if (!cancelled) {
          setOwnerRequest({
            chatId: activeChat.id,
            title: activeChat.title,
            senders: detail.senders,
          });
        }
      })
      .catch(() => {
        /* silencioso: se puede reintentar desde la cabecera */
      });

    return () => {
      cancelled = true;
    };
  }, [activeChat]);

  const openOwnerPicker = useCallback(async () => {
    if (!activeChat) return;
    dismissedOwner.current.delete(activeChat.id);
    try {
      const detail = await fetchChatDetail(activeChat.id);
      setOwnerRequest({
        chatId: activeChat.id,
        title: activeChat.title,
        senders: detail.senders,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudieron cargar los participantes.",
      );
    }
  }, [activeChat]);

  async function handleImported(result: ImportResult) {
    const list = await fetchChats().catch(() => null);
    if (list) setChats(list);
    setActiveId(result.chatId);
    dismissedOwner.current.delete(result.chatId);
    if (result.senders.length > 0) {
      setOwnerRequest({
        chatId: result.chatId,
        title: result.title,
        senders: result.senders,
      });
    }
  }

  function closeOwner() {
    if (ownerRequest) dismissedOwner.current.add(ownerRequest.chatId);
    setOwnerRequest(null);
  }

  function ownerSaved(chatId: number, ownerName: string) {
    setChats((current) =>
      current.map((chat) =>
        chat.id === chatId ? { ...chat, ownerName } : chat,
      ),
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-app">
      <div
        className={`h-full w-full shrink-0 md:block md:w-[368px] ${
          activeChat ? "hidden" : "block"
        }`}
      >
        <Sidebar
          chats={chats}
          activeId={activeId}
          loading={loading}
          error={error}
          onSelect={setActiveId}
          onNewChat={() => setImportOpen(true)}
        />
      </div>

      <main
        className={`h-full min-w-0 flex-1 ${
          activeChat ? "flex" : "hidden md:flex"
        }`}
      >
        {activeChat ? (
          <ChatView
            key={activeChat.id}
            chat={activeChat}
            onBack={() => setActiveId(null)}
            onOwnerClick={openOwnerPicker}
            onAvatarClick={() => setAvatarChat(activeChat)}
            onDeleteClick={() => setDeleteTarget(activeChat)}
          />
        ) : (
          <div className="chat-canvas flex h-full w-full flex-col items-center justify-center px-8 text-center">
            <span className="grid size-14 place-items-center rounded-2xl border border-line bg-panel text-accent shadow-sm">
              <ChatIcon className="size-6" />
            </span>
            <h2 className="mt-5 text-xl font-semibold tracking-tight text-ink">
              Tu archivo, en orden
            </h2>
            <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-muted">
              Elige un chat de la izquierda para leerlo, buscar dentro y abrir
              fotos, audios y documentos.
            </p>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-panel px-4 text-[13px] font-medium text-ink transition hover:bg-panel-soft"
            >
              <PlusIcon className="size-4" />
              Importar un chat
            </button>
          </div>
        )}
      </main>

      {importOpen && (
        <ImportDialog
          onClose={() => setImportOpen(false)}
          onImported={handleImported}
        />
      )}

      {ownerRequest && (
        <OwnerDialog
          key={ownerRequest.chatId}
          request={ownerRequest}
          onClose={closeOwner}
          onSaved={ownerSaved}
        />
      )}

      {avatarChat && (
        <EditAvatarDialog
          chat={avatarChat}
          onClose={() => setAvatarChat(null)}
          onSaved={(chatId, avatar) =>
            setChats((current) =>
              current.map((chat) =>
                chat.id === chatId ? { ...chat, avatar } : chat,
              ),
            )
          }
        />
      )}

      {deleteTarget && (
        <DeleteChatDialog
          chat={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={(chatId) => {
            setChats((current) =>
              current.filter((chat) => chat.id !== chatId),
            );
            setActiveId((current) => (current === chatId ? null : current));
          }}
        />
      )}
    </div>
  );
}

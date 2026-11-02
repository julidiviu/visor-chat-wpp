import type {
  ChatDetail,
  ChatMessage,
  ChatSummary,
  ImportResult,
  MediaKind,
  MediaPage,
  MediaSummary,
  MessagesResponse,
} from "./types";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof data?.error === "string"
        ? data.error
        : "No se pudo completar la operación.";
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export async function fetchChats(): Promise<ChatSummary[]> {
  const data = await request<{ chats: ChatSummary[] }>("/api/chats");
  return data.chats;
}

export async function fetchChatDetail(chatId: number): Promise<ChatDetail> {
  return request<ChatDetail>(`/api/chats/${chatId}`);
}

export async function fetchMessages(params: {
  chatId: number;
  limit?: number;
  beforeId?: number;
  afterId?: number;
  aroundId?: number;
  q?: string;
  from?: number;
  to?: number;
}): Promise<MessagesResponse> {
  const search = new URLSearchParams({ chatId: String(params.chatId) });
  if (params.limit) search.set("limit", String(params.limit));
  if (params.beforeId) search.set("beforeId", String(params.beforeId));
  if (params.afterId) search.set("afterId", String(params.afterId));
  if (params.aroundId) search.set("aroundId", String(params.aroundId));
  if (params.q) search.set("q", params.q);
  if (params.from) search.set("from", String(params.from));
  if (params.to) search.set("to", String(params.to));

  return request<MessagesResponse>(`/api/messages?${search}`);
}

export async function fetchMediaSummary(chatId: number): Promise<MediaSummary> {
  const data = await request<{ summary: MediaSummary }>(
    `/api/chats/${chatId}/media?summary=1`,
  );
  return data.summary;
}

export async function fetchMedia<T = ChatMessage>(params: {
  chatId: number;
  kind: MediaKind;
  limit?: number;
  beforeId?: number;
  afterId?: number;
  aroundId?: number;
}): Promise<MediaPage<T>> {
  const search = new URLSearchParams({ kind: params.kind });
  if (params.limit) search.set("limit", String(params.limit));
  if (params.beforeId) search.set("beforeId", String(params.beforeId));
  if (params.afterId) search.set("afterId", String(params.afterId));
  if (params.aroundId) search.set("aroundId", String(params.aroundId));

  return request<MediaPage<T>>(
    `/api/chats/${params.chatId}/media?${search}`,
  );
}

export async function importChat(input: {
  folderPath: string;
  title?: string;
  avatar?: string;
  replace?: boolean;
}): Promise<ImportResult> {
  const suffix = input.replace ? "?replace=1" : "";
  return request<ImportResult>(`/api/chats/import${suffix}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folderPath: input.folderPath,
      title: input.title,
      avatar: input.avatar,
    }),
  });
}

export async function saveOwnerName(
  chatId: number,
  ownerName: string,
): Promise<{ id: number; ownerName: string }> {
  return request(`/api/chats/${chatId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerName }),
  });
}

export async function saveAvatar(
  chatId: number,
  avatar: string | null,
): Promise<{ id: number; ownerName: string | null; avatar: string | null }> {
  return request(`/api/chats/${chatId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ avatar }),
  });
}

export async function deleteChat(chatId: number): Promise<void> {
  const response = await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(
      typeof data?.error === "string"
        ? data.error
        : "No se pudo eliminar el chat.",
      response.status,
      data,
    );
  }
}

export function mediaUrl(
  chatId: number,
  fileName: string,
  download = false,
): string {
  const encoded = fileName.split("/").map(encodeURIComponent).join("/");
  return `/api/media/${chatId}/${encoded}${download ? "?download=1" : ""}`;
}

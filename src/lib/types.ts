import type { AttachmentType } from "./attachments";

export type { AttachmentType };

export interface SenderCount {
  name: string;
  count: number;
}

export interface ChatSummary {
  id: number;
  title: string;
  avatar: string | null;
  ownerName: string | null;
  messageCount: number;
  lastTs: number | null;
  lastContent: string | null;
  lastAttachmentType: AttachmentType | null;
}

export interface ChatMessage {
  id: number;
  ts: number;
  sender: string;
  content: string;
  attachmentName: string | null;
  attachmentType: AttachmentType | null;
  attachmentSize: number | null;
  snippet?: string;
}

export interface MessagesResponse {
  messages: ChatMessage[];
  hasOlder: boolean;
  hasNewer?: boolean;
  search: boolean;
  total?: number;
}

export type MediaKind = "photos" | "documents" | "links";

export interface LinkItem extends ChatMessage {
  url: string;
  host: string;
}

export interface MediaSummary {
  photos: number;
  documents: number;
  links: number;
  preview: ChatMessage[];
}

export interface MediaPage<T = ChatMessage> {
  items: T[];
  hasBefore: boolean;
  hasAfter: boolean;
  total: number;
  position: number | null;
}

export interface ImportResult {
  chatId: number;
  title: string;
  messageCount: number;
  senders: SenderCount[];
  missingAttachments: number;
  elapsedMs: number;
}

export interface ChatDetail {
  chat: { id: number; title: string; ownerName: string | null };
  senders: SenderCount[];
}

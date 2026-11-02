import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const ATTACHMENT_TYPES = [
  "image",
  "sticker",
  "audio",
  "video",
  "document",
] as const;

export const chats = sqliteTable("chats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  folderPath: text("folder_path").notNull().unique(),
  ownerName: text("owner_name"),
  avatar: text("avatar"),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const messages = sqliteTable(
  "messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    chatId: integer("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    ts: integer("ts").notNull(),
    sender: text("sender").notNull(),
    content: text("content").notNull().default(""),
    attachmentName: text("attachment_name"),
    attachmentType: text("attachment_type", { enum: ATTACHMENT_TYPES }),
    attachmentSize: integer("attachment_size"),
  },
  (table) => [index("messages_chat_id_idx").on(table.chatId, table.id)],
);

export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type AttachmentType = (typeof ATTACHMENT_TYPES)[number];

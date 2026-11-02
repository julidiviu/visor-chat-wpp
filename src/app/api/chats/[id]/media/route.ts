import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { extractLinks } from "@/lib/links";
import type { ChatMessage, LinkItem, MediaKind } from "@/lib/types";

const COLUMNS = `m.id, m.ts, m.sender, m.content,
  m.attachment_name AS attachmentName,
  m.attachment_type AS attachmentType,
  m.attachment_size AS attachmentSize`;

const VISUAL_FILTER = "m.attachment_type IN ('image', 'video')";

interface CountRow {
  type: string;
  count: number;
}

interface LinkRow {
  id: number;
  ts: number;
  sender: string;
  content: string;
}

/** Los enlaces de un chat se leen una vez; son pocos y la base es de solo lectura. */
const linkCache = new Map<number, LinkItem[]>();

type Sqlite = ReturnType<typeof getDb>["sqlite"];

function chatLinks(sqlite: Sqlite, chatId: number): LinkItem[] {
  const cached = linkCache.get(chatId);
  if (cached) return cached;

  const rows = sqlite
    .prepare(
      `SELECT id, ts, sender, content FROM messages
       WHERE chat_id = ? AND (content LIKE '%http%' OR content LIKE '%www.%')
       ORDER BY id DESC`,
    )
    .all(chatId) as LinkRow[];

  const links: LinkItem[] = [];
  for (const row of rows) {
    const [link] = extractLinks(row.content);
    if (!link) continue;
    links.push({
      id: row.id,
      ts: row.ts,
      sender: row.sender,
      content: row.content,
      attachmentName: null,
      attachmentType: null,
      attachmentSize: null,
      url: link.url,
      host: link.host,
    });
  }

  linkCache.set(chatId, links);
  return links;
}

function positiveInt(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function positionOf(
  sqlite: Sqlite,
  chatId: number,
  filter: string,
  firstId: number,
): number {
  const row = sqlite
    .prepare(
      `SELECT count(*) AS count FROM messages m
       WHERE m.chat_id = ? AND ${filter} AND m.id < ?`,
    )
    .get(chatId, firstId) as { count: number };
  return row.count + 1;
}

function existsBefore(
  sqlite: Sqlite,
  chatId: number,
  filter: string,
  id: number,
  direction: "before" | "after",
): boolean {
  const operator = direction === "before" ? "<" : ">";
  return Boolean(
    sqlite
      .prepare(
        `SELECT 1 FROM messages m
         WHERE m.chat_id = ? AND ${filter} AND m.id ${operator} ? LIMIT 1`,
      )
      .get(chatId, id),
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const chatId = Number(id);
  if (!Number.isInteger(chatId) || chatId <= 0) {
    return NextResponse.json({ error: "Chat inválido." }, { status: 400 });
  }

  const { sqlite } = getDb();
  if (!sqlite.prepare("SELECT 1 FROM chats WHERE id = ?").get(chatId)) {
    return NextResponse.json({ error: "El chat no existe." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);

  if (searchParams.get("summary") === "1") {
    const counts = sqlite
      .prepare(
        `SELECT attachment_type AS type, count(*) AS count FROM messages m
         WHERE m.chat_id = ?
           AND m.attachment_type IN ('image', 'video', 'document')
         GROUP BY m.attachment_type`,
      )
      .all(chatId) as CountRow[];

    const byType = new Map(counts.map((row) => [row.type, row.count]));
    const preview = sqlite
      .prepare(
        `SELECT ${COLUMNS} FROM messages m
         WHERE m.chat_id = ? AND ${VISUAL_FILTER}
         ORDER BY m.id DESC LIMIT 4`,
      )
      .all(chatId) as ChatMessage[];

    return NextResponse.json({
      summary: {
        photos: (byType.get("image") ?? 0) + (byType.get("video") ?? 0),
        documents: byType.get("document") ?? 0,
        links: chatLinks(sqlite, chatId).length,
        preview,
      },
    });
  }

  const requestedKind = searchParams.get("kind");
  const kind: MediaKind =
    requestedKind === "documents" || requestedKind === "links"
      ? requestedKind
      : "photos";

  if (kind === "links") {
    const items = chatLinks(sqlite, chatId);
    return NextResponse.json({
      items,
      hasBefore: false,
      hasAfter: false,
      total: items.length,
      position: items.length > 0 ? 1 : null,
    });
  }

  const filter = kind === "photos" ? VISUAL_FILTER : "m.attachment_type = 'document'";
  const defaultLimit = kind === "documents" ? 100 : 60;
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || defaultLimit, 1),
    100,
  );

  const beforeId = positiveInt(searchParams.get("beforeId"));
  const afterId = positiveInt(searchParams.get("afterId"));
  const aroundId = positiveInt(searchParams.get("aroundId"));

  const totalRow = sqlite
    .prepare(
      `SELECT count(*) AS count FROM messages m
       WHERE m.chat_id = ? AND ${filter}`,
    )
    .get(chatId) as { count: number };

  let items: ChatMessage[];

  if (aroundId) {
    const half = Math.max(1, Math.ceil(limit / 2));
    const older = (
      sqlite
        .prepare(
          `SELECT ${COLUMNS} FROM messages m
           WHERE m.chat_id = ? AND ${filter} AND m.id <= ?
           ORDER BY m.id DESC LIMIT ?`,
        )
        .all(chatId, aroundId, half) as ChatMessage[]
    ).reverse();

    const newer = sqlite
      .prepare(
        `SELECT ${COLUMNS} FROM messages m
         WHERE m.chat_id = ? AND ${filter} AND m.id > ?
         ORDER BY m.id ASC LIMIT ?`,
      )
      .all(chatId, aroundId, Math.max(1, limit - older.length)) as ChatMessage[];

    items = [...older, ...newer];
  } else if (afterId) {
    items = sqlite
      .prepare(
        `SELECT ${COLUMNS} FROM messages m
         WHERE m.chat_id = ? AND ${filter} AND m.id > ?
         ORDER BY m.id ASC LIMIT ?`,
      )
      .all(chatId, afterId, limit) as ChatMessage[];
  } else if (beforeId) {
    items = (
      sqlite
        .prepare(
          `SELECT ${COLUMNS} FROM messages m
           WHERE m.chat_id = ? AND ${filter} AND m.id < ?
           ORDER BY m.id DESC LIMIT ?`,
        )
        .all(chatId, beforeId, limit) as ChatMessage[]
    ).reverse();
  } else {
    items = (
      sqlite
        .prepare(
          `SELECT ${COLUMNS} FROM messages m
           WHERE m.chat_id = ? AND ${filter}
           ORDER BY m.id DESC LIMIT ?`,
        )
        .all(chatId, limit) as ChatMessage[]
    ).reverse();
  }

  const first = items[0];
  const last = items[items.length - 1];

  return NextResponse.json({
    items,
    hasBefore: first
      ? existsBefore(sqlite, chatId, filter, first.id, "before")
      : false,
    hasAfter: last
      ? existsBefore(sqlite, chatId, filter, last.id, "after")
      : false,
    total: totalRow.count,
    position: first ? positionOf(sqlite, chatId, filter, first.id) : null,
  });
}

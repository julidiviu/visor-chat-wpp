import { NextResponse } from "next/server";
import { getDb } from "@/db";

interface MessageRow {
  id: number;
  ts: number;
  sender: string;
  content: string;
  attachmentName: string | null;
  attachmentType: string | null;
  attachmentSize: number | null;
  snippet?: string;
}

const COLUMNS = `m.id, m.ts, m.sender, m.content,
  m.attachment_name AS attachmentName,
  m.attachment_type AS attachmentType,
  m.attachment_size AS attachmentSize`;

/** FTS5: cada palabra entrecomillada y como prefijo; las tildes las ignora el índice. */
function toMatchQuery(query: string): string {
  return query
    .normalize("NFC")
    .split(/\s+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token))
    .map((token) => `"${token.replace(/"/g, '""')}"*`)
    .join(" ");
}

function positiveInt(value: string | null): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function existsAfter(
  sqlite: ReturnType<typeof getDb>["sqlite"],
  chatId: number,
  id: number,
): boolean {
  return Boolean(
    sqlite
      .prepare(
        "SELECT 1 FROM messages WHERE chat_id = ? AND id > ? LIMIT 1",
      )
      .get(chatId, id),
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = Number(searchParams.get("chatId"));

  if (!Number.isInteger(chatId) || chatId <= 0) {
    return NextResponse.json({ error: "Falta chatId." }, { status: 400 });
  }

  const limit = (() => {
    const isSearch = Boolean(
      searchParams.get("q")?.trim() ||
        searchParams.get("from") ||
        searchParams.get("to"),
    );
    const fallback = isSearch ? 100 : 50;
    const max = isSearch ? 500 : 100;
    return Math.min(
      Math.max(Number(searchParams.get("limit")) || fallback, 1),
      max,
    );
  })();
  const beforeId = positiveInt(searchParams.get("beforeId"));
  const afterId = positiveInt(searchParams.get("afterId"));
  const aroundId = positiveInt(searchParams.get("aroundId"));
  const query = searchParams.get("q")?.trim() ?? "";
  const from = positiveInt(searchParams.get("from"));
  const to = positiveInt(searchParams.get("to"));

  const { sqlite } = getDb();
  if (!sqlite.prepare("SELECT 1 FROM chats WHERE id = ?").get(chatId)) {
    return NextResponse.json({ error: "El chat no existe." }, { status: 404 });
  }

  if (query || from || to) {
    if (!query) {
      const params: number[] = [chatId];
      let where = "m.chat_id = ?";
      if (from) {
        where += " AND m.ts >= ?";
        params.push(from);
      }
      if (to) {
        where += " AND m.ts <= ?";
        params.push(to);
      }

      const total = (
        sqlite
          .prepare(`SELECT count(*) AS count FROM messages m WHERE ${where}`)
          .get(...params) as { count: number }
      ).count;

      const messages = (
        sqlite
          .prepare(
            `SELECT ${COLUMNS} FROM messages m WHERE ${where}
             ORDER BY m.id DESC LIMIT ?`,
          )
          .all(...params, limit) as MessageRow[]
      ).reverse();
      return NextResponse.json({
        messages,
        hasOlder: false,
        search: true,
        total,
      });
    }

    const match = toMatchQuery(query);
    if (!match) {
      return NextResponse.json({ messages: [], hasOlder: false, search: true });
    }

    const params: (string | number)[] = [match, chatId];
    let where = "messages_fts MATCH ? AND m.chat_id = ?";

    if (from) {
      where += " AND m.ts >= ?";
      params.push(from);
    }
    if (to) {
      where += " AND m.ts <= ?";
      params.push(to);
    }

    try {
      const total = (
        sqlite
          .prepare(
            `SELECT count(*) AS count FROM messages_fts
             JOIN messages m ON m.id = messages_fts.rowid
             WHERE ${where}`,
          )
          .get(...params) as { count: number }
      ).count;

      const messages = (
        sqlite
          .prepare(
            `SELECT ${COLUMNS},
               snippet(messages_fts, 0, char(1), char(2), '…', 12) AS snippet
             FROM messages_fts
             JOIN messages m ON m.id = messages_fts.rowid
             WHERE ${where}
             ORDER BY m.id DESC LIMIT ?`,
          )
          .all(...params, limit) as MessageRow[]
      ).reverse();

      return NextResponse.json({
        messages,
        hasOlder: false,
        search: true,
        total,
      });
    } catch {
      return NextResponse.json({
        messages: [],
        hasOlder: false,
        search: true,
        total: 0,
      });
    }
  }

  if (aroundId) {
    const half = Math.max(1, Math.ceil(limit / 2));

    const older = (
      sqlite
        .prepare(
          `SELECT ${COLUMNS} FROM messages m
           WHERE m.chat_id = ? AND m.id <= ?
           ORDER BY m.id DESC LIMIT ?`,
        )
        .all(chatId, aroundId, half) as MessageRow[]
    ).reverse();

    const newer = sqlite
      .prepare(
        `SELECT ${COLUMNS} FROM messages m
         WHERE m.chat_id = ? AND m.id > ?
         ORDER BY m.id ASC LIMIT ?`,
      )
      .all(chatId, aroundId, Math.max(1, limit - older.length)) as MessageRow[];

    const messages = [...older, ...newer];
    const last = messages[messages.length - 1];

    return NextResponse.json({
      messages,
      hasOlder: older.length === half,
      hasNewer: last ? existsAfter(sqlite, chatId, last.id) : false,
      search: false,
    });
  }

  if (afterId) {
    const messages = sqlite
      .prepare(
        `SELECT ${COLUMNS} FROM messages m
         WHERE m.chat_id = ? AND m.id > ?
         ORDER BY m.id ASC LIMIT ?`,
      )
      .all(chatId, afterId, limit) as MessageRow[];
    const last = messages[messages.length - 1];

    return NextResponse.json({
      messages,
      hasOlder: true,
      hasNewer: last ? existsAfter(sqlite, chatId, last.id) : false,
      search: false,
    });
  }

  const where = beforeId ? "m.chat_id = ? AND m.id < ?" : "m.chat_id = ?";
  const params = beforeId ? [chatId, beforeId, limit] : [chatId, limit];

  const messages = (
    sqlite
      .prepare(
        `SELECT ${COLUMNS} FROM messages m
         WHERE ${where}
         ORDER BY m.id DESC LIMIT ?`,
      )
      .all(...params) as MessageRow[]
  ).reverse();
  const last = messages[messages.length - 1];

  return NextResponse.json({
    messages,
    hasOlder: messages.length === limit,
    hasNewer: last ? existsAfter(sqlite, chatId, last.id) : false,
    search: false,
  });
}

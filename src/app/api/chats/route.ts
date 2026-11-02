import { NextResponse } from "next/server";
import { getDb } from "@/db";

export async function GET() {
  const { sqlite } = getDb();

  const chats = sqlite
    .prepare(
      `SELECT
         c.id,
         c.title,
         c.avatar,
         c.owner_name AS ownerName,
         (SELECT count(*) FROM messages m WHERE m.chat_id = c.id) AS messageCount,
         (SELECT m.ts FROM messages m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS lastTs,
         (SELECT m.content FROM messages m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS lastContent,
         (SELECT m.attachment_type FROM messages m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS lastAttachmentType
       FROM chats c
       ORDER BY lastTs DESC`,
    )
    .all();

  return NextResponse.json({ chats });
}

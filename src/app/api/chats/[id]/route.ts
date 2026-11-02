import { NextResponse } from "next/server";
import { getDb } from "@/db";

interface PatchBody {
  ownerName?: unknown;
  avatar?: unknown;
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const chatId = Number(id);
  if (!Number.isInteger(chatId)) {
    return NextResponse.json({ error: "Chat inválido." }, { status: 400 });
  }

  const { sqlite } = getDb();
  const chat = sqlite
    .prepare("SELECT id, title, owner_name AS ownerName FROM chats WHERE id = ?")
    .get(chatId) as
    | { id: number; title: string; ownerName: string | null }
    | undefined;

  if (!chat) {
    return NextResponse.json({ error: "El chat no existe." }, { status: 404 });
  }

  const senders = sqlite
    .prepare(
      `SELECT sender AS name, count(*) AS count
       FROM messages WHERE chat_id = ?
       GROUP BY sender ORDER BY count DESC`,
    )
    .all(chatId);

  return NextResponse.json({ chat, senders });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const chatId = Number(id);
  if (!Number.isInteger(chatId)) {
    return NextResponse.json({ error: "Chat inválido." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as PatchBody | null;
  if (!body) {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const { sqlite } = getDb();
  const chat = sqlite
    .prepare("SELECT id FROM chats WHERE id = ?")
    .get(chatId);
  if (!chat) {
    return NextResponse.json({ error: "El chat no existe." }, { status: 404 });
  }

  const updates: string[] = [];
  const params: (string | null)[] = [];
  let ownerName: string | null = null;

  if ("ownerName" in body) {
    ownerName =
      typeof body.ownerName === "string" ? body.ownerName.trim() : null;
    if (!ownerName) {
      return NextResponse.json(
        { error: "Elige uno de los participantes del chat." },
        { status: 400 },
      );
    }

    const exists = sqlite
      .prepare("SELECT 1 FROM messages WHERE chat_id = ? AND sender = ? LIMIT 1")
      .get(chatId, ownerName);
    if (!exists) {
      return NextResponse.json(
        { error: "Ese nombre no aparece en el chat." },
        { status: 400 },
      );
    }

    updates.push("owner_name = ?");
    params.push(ownerName);
  }

  let avatar: string | null | undefined;
  if ("avatar" in body) {
    if (body.avatar === null) {
      avatar = null;
    } else if (typeof body.avatar === "string") {
      if (
        !body.avatar.startsWith("data:image/") ||
        body.avatar.length > MAX_AVATAR_BYTES
      ) {
        return NextResponse.json(
          { error: "La imagen no es válida o es demasiado grande." },
          { status: 400 },
        );
      }
      avatar = body.avatar;
    } else {
      return NextResponse.json(
        { error: "La imagen no es válida." },
        { status: 400 },
      );
    }
    updates.push("avatar = ?");
    params.push(avatar);
  }

  if (updates.length === 0) {
    return NextResponse.json(
      { error: "No hay nada que actualizar." },
      { status: 400 },
    );
  }

  sqlite
    .prepare(`UPDATE chats SET ${updates.join(", ")} WHERE id = ?`)
    .run(...params, chatId);

  const updated = sqlite
    .prepare(
      "SELECT id, owner_name AS ownerName, avatar FROM chats WHERE id = ?",
    )
    .get(chatId);

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const chatId = Number(id);
  if (!Number.isInteger(chatId)) {
    return NextResponse.json({ error: "Chat inválido." }, { status: 400 });
  }

  const { sqlite } = getDb();
  const result = sqlite.prepare("DELETE FROM chats WHERE id = ?").run(chatId);

  if (result.changes === 0) {
    return NextResponse.json({ error: "El chat no existe." }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}

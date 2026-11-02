import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { buildFileIndex, resolveAttachment } from "@/lib/attachments";
import { parseChat } from "@/lib/parser";

interface ImportBody {
  folderPath?: unknown;
  title?: unknown;
  avatar?: unknown;
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

type Row = [
  ts: number,
  sender: string,
  content: string,
  attachmentName: string | null,
  attachmentType: string | null,
  attachmentSize: number | null,
];

function defaultTitle(folder: string): string {
  const base = path.basename(folder);
  return (
    base.replace(/^whatsapp chat\s*(?:with|con)?\s*-?\s*/i, "").trim() || base
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ImportBody | null;
  const folderInput =
    typeof body?.folderPath === "string" ? body.folderPath.trim() : "";

  if (!folderInput) {
    return NextResponse.json(
      { error: "Indica la ruta absoluta de la carpeta del chat." },
      { status: 400 },
    );
  }
  if (!path.isAbsolute(folderInput)) {
    return NextResponse.json(
      { error: "La ruta debe ser absoluta, por ejemplo C:\\Chats\\WhatsApp Chat - Contacto." },
      { status: 400 },
    );
  }

  const folder = path.resolve(folderInput);
  const info = await fs.stat(folder).catch(() => null);
  if (!info?.isDirectory()) {
    return NextResponse.json(
      { error: "La carpeta no existe o no es un directorio." },
      { status: 400 },
    );
  }

  const raw = await fs.readFile(path.join(folder, "_chat.txt"), "utf8").catch(
    () => null,
  );
  if (raw === null) {
    return NextResponse.json(
      { error: "No se encontró el archivo _chat.txt en esa carpeta." },
      { status: 400 },
    );
  }

  const { sqlite } = getDb();
  const existing = sqlite
    .prepare("SELECT id FROM chats WHERE folder_path = ?")
    .get(folder) as { id: number } | undefined;
  const replace = new URL(request.url).searchParams.get("replace") === "1";

  if (existing && !replace) {
    return NextResponse.json(
      {
        error: "Ese chat ya está importado.",
        chatId: existing.id,
      },
      { status: 409 },
    );
  }

  const started = performance.now();
  const parsed = parseChat(raw);
  if (parsed.messages.length === 0) {
    return NextResponse.json(
      { error: "No se encontraron mensajes en _chat.txt." },
      { status: 400 },
    );
  }

  const index = buildFileIndex(await fs.readdir(folder));
  const rows: Row[] = [];
  const missing = new Set<string>();

  for (const message of parsed.messages) {
    let name = message.attachmentName;
    let size: number | null = null;

    if (name) {
      const onDisk = resolveAttachment(index, name);
      if (onDisk) {
        name = onDisk;
        if (message.attachmentType === "document") {
          const stat = await fs
            .stat(path.join(folder, onDisk))
            .catch(() => null);
          size = stat?.size ?? null;
        }
      } else {
        missing.add(name);
      }
    }

    rows.push([
      message.ts,
      message.sender,
      message.content,
      name,
      message.attachmentType,
      size,
    ]);
  }

  const title = (
    typeof body?.title === "string" && body.title.trim()
      ? body.title.trim()
      : defaultTitle(folder)
  ).slice(0, 120);

  const avatar =
    typeof body?.avatar === "string" &&
    body.avatar.startsWith("data:image/") &&
    body.avatar.length <= MAX_AVATAR_BYTES
      ? body.avatar
      : null;

  const runImport = sqlite.transaction(
    (data: Row[], previousId: number | null) => {
      if (previousId !== null) {
        sqlite.prepare("DELETE FROM chats WHERE id = ?").run(previousId);
      }

      const chatId = Number(
        sqlite
          .prepare(
            "INSERT INTO chats (title, folder_path, avatar, created_at) VALUES (?, ?, ?, ?)",
          )
          .run(title, folder, avatar, Date.now()).lastInsertRowid,
      );

      const insert = sqlite.prepare(
        `INSERT INTO messages
          (chat_id, ts, sender, content, attachment_name, attachment_type, attachment_size)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const row of data) insert.run(chatId, ...row);

      return chatId;
    },
  );

  try {
    const chatId = runImport(rows, existing?.id ?? null);

    return NextResponse.json({
      chatId,
      title,
      messageCount: parsed.messages.length,
      senders: parsed.senders,
      missingAttachments: missing.size,
      elapsedMs: Math.round(performance.now() - started),
    });
  } catch (error) {
    console.error("Error importando chat:", error);
    return NextResponse.json(
      { error: "No se pudo guardar el chat en la base de datos." },
      { status: 500 },
    );
  }
}

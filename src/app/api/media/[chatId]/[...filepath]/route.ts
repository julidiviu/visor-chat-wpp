import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { contentTypeFor } from "@/lib/attachments";

export async function GET(
  request: Request,
  context: { params: Promise<{ chatId: string; filepath: string[] }> },
) {
  const { chatId: rawChatId, filepath } = await context.params;
  const chatId = Number(rawChatId);

  if (!Number.isInteger(chatId) || !filepath?.length) {
    return NextResponse.json({ error: "Ruta de archivo inválida." }, { status: 400 });
  }

  const { sqlite } = getDb();
  const chat = sqlite
    .prepare("SELECT folder_path AS folderPath FROM chats WHERE id = ?")
    .get(chatId) as { folderPath: string } | undefined;

  if (!chat) {
    return NextResponse.json({ error: "El chat no existe." }, { status: 404 });
  }

  const folder = path.resolve(chat.folderPath);
  const file = path.resolve(folder, ...filepath);

  // Defensa contra path traversal: el archivo debe quedar dentro de la carpeta.
  if (file !== folder && !file.startsWith(folder + path.sep)) {
    return NextResponse.json({ error: "Ruta no permitida." }, { status: 403 });
  }

  const stat = await fs.stat(file).catch(() => null);
  if (!stat?.isFile()) {
    return NextResponse.json(
      { error: "El archivo no está en la carpeta del chat." },
      { status: 404 },
    );
  }

  const size = stat.size;
  const rangeHeader = request.headers.get("range");
  const download = new URL(request.url).searchParams.get("download") === "1";

  let status = 200;
  let start = 0;
  let end = size - 1;

  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!match || (match[1] === "" && match[2] === "")) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }

    if (match[1] === "") {
      start = Math.max(0, size - Number(match[2]));
      end = size - 1;
    } else {
      start = Number(match[1]);
      end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
    }

    if (size === 0 || start >= size || start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    status = 206;
  }

  const headers = new Headers({
    "Content-Type": contentTypeFor(file),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=31536000, immutable",
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(path.basename(file))}`,
  });

  if (status === 206) {
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  }
  headers.set("Content-Length", String(size === 0 ? 0 : end - start + 1));

  if (size === 0) {
    return new NextResponse(null, { status: 200, headers });
  }

  const nodeStream = createReadStream(file, { start, end });
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on("data", (chunk: string | Buffer) => {
        nodeStream.pause();
        if (closed) return;
        try {
          controller.enqueue(
            typeof chunk === "string" ? Buffer.from(chunk) : chunk,
          );
        } catch {
          closed = true;
        }
      });
      nodeStream.on("end", () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* el cliente ya cerró */
        }
      });
      nodeStream.on("error", (error) => {
        if (closed) return;
        closed = true;
        try {
          controller.error(error);
        } catch {
          /* el cliente ya cerró */
        }
      });
      // Si el navegador aborta (seek, pestaña cerrada), se corta la lectura.
      request.signal.addEventListener(
        "abort",
        () => {
          closed = true;
          nodeStream.destroy();
        },
        { once: true },
      );
    },
    pull() {
      nodeStream.resume();
    },
    cancel() {
      closed = true;
      nodeStream.destroy();
    },
  });

  return new NextResponse(stream, { status, headers });
}

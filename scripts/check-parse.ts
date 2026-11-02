import fs from "node:fs";
import path from "node:path";
import {
  buildFileIndex,
  resolveAttachment,
  type AttachmentType,
} from "../src/lib/attachments.ts";
import { parseChat } from "../src/lib/parser.ts";

const folder = process.argv[2];

if (!folder) {
  console.error('Uso: npm run check:parse -- "<carpeta del chat>"');
  process.exit(1);
}

const chatFile = path.join(folder, "_chat.txt");
if (!fs.existsSync(chatFile)) {
  console.error(`No existe ${chatFile}`);
  process.exit(1);
}

const started = performance.now();
const parsed = parseChat(fs.readFileSync(chatFile, "utf8"));
const parseMs = Math.round(performance.now() - started);

const index = buildFileIndex(fs.readdirSync(folder));
const missing = new Set<string>();
const byType = new Map<AttachmentType, number>();

for (const message of parsed.messages) {
  if (message.attachmentName && !resolveAttachment(index, message.attachmentName)) {
    missing.add(message.attachmentName);
  }
  if (message.attachmentType) {
    byType.set(
      message.attachmentType,
      (byType.get(message.attachmentType) ?? 0) + 1,
    );
  }
}

console.log(`Mensajes:    ${parsed.messages.length}`);
console.log(`Remitentes:  ${parsed.senders.map((s) => `${s.name} (${s.count})`).join(", ")}`);
console.log(`Adjuntos:    ${parsed.attachmentCount}`);
console.log(`Por tipo:    ${[...byType].map(([k, v]) => `${k}=${v}`).join(", ")}`);
console.log(`Sin archivo: ${missing.size}`);
console.log(`Parseo:      ${parseMs} ms`);

const first = parsed.messages[0];
const last = parsed.messages[parsed.messages.length - 1];
const day = (ts: number) => new Date(ts).toLocaleDateString("es-EC");
if (first && last) {
  console.log(`Rango:       ${day(first.ts)} → ${day(last.ts)}`);
}

if (parsed.messages.length === 0) {
  console.error("No se encontró ningún mensaje.");
  process.exitCode = 1;
}

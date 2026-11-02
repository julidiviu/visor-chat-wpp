import { attachmentTypeFor, type AttachmentType } from "./attachments.ts";

export interface ParsedMessage {
  ts: number;
  sender: string;
  content: string;
  attachmentName: string | null;
  attachmentType: AttachmentType | null;
}

export interface SenderCount {
  name: string;
  count: number;
}

export interface ParseResult {
  messages: ParsedMessage[];
  senders: SenderCount[];
  attachmentCount: number;
}

const HEADER =
  /^\[(\d{1,4}[-/]\d{1,2}[-/]\d{1,4}),\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:([ap])\.?\s*m\.?)?\]\s*([^:]{1,80}?):\s?([\s\S]*)$/i;

const ATTACHMENT = /<(?:adjunto|attached):\s*([^>]+)>/i;

/**
 * WhatsApp inserta marcas invisibles de dirección y espacios estrechos
 * alrededor de la hora. Sin limpiarlos, la cabecera no coincide.
 */
export function normalizeChatText(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/[\u200E\u200F]/g, "")
    .replace(/\u202F/g, " ");
}

function toTimestamp(
  date: string,
  time: string,
  meridiem?: string,
): number {
  const [a, b, c] = date.split(/[-/]/).map(Number);
  // yyyy-mm-dd empieza con el año; d/M/yy con el día.
  const [year, month, day] = a > 31 ? [a, b, c] : [c, b, a];

  const [rawHour, minutes, seconds = 0] = time.split(":").map(Number);
  let hour = rawHour;
  if (meridiem) {
    hour = rawHour % 12;
    if (meridiem.toLowerCase() === "p") hour += 12;
  }

  return new Date(
    year < 100 ? 2000 + year : year,
    month - 1,
    day,
    hour,
    minutes,
    seconds,
  ).getTime();
}

interface Draft {
  ts: number;
  sender: string;
  lines: string[];
}

export function parseChat(raw: string): ParseResult {
  const drafts: Draft[] = [];
  let current: Draft | null = null;

  for (const line of normalizeChatText(raw).split(/\r?\n/)) {
    const header = HEADER.exec(line);
    if (header) {
      current = {
        ts: toTimestamp(header[1], header[2], header[3]),
        sender: header[4].trim(),
        lines: [header[5] ?? ""],
      };
      drafts.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }

  const messages: ParsedMessage[] = [];
  const senders = new Map<string, number>();
  let attachmentCount = 0;

  for (const draft of drafts) {
    const body = draft.lines.join("\n").trim();
    const attachment = ATTACHMENT.exec(body);
    const attachmentName = attachment ? attachment[1].trim() : null;
    const content = attachment ? body.replace(ATTACHMENT, "").trim() : body;

    if (attachmentName) attachmentCount += 1;
    senders.set(draft.sender, (senders.get(draft.sender) ?? 0) + 1);

    messages.push({
      ts: draft.ts,
      sender: draft.sender,
      content,
      attachmentName,
      attachmentType: attachmentName ? attachmentTypeFor(attachmentName) : null,
    });
  }

  return {
    messages,
    senders: [...senders].map(([name, count]) => ({ name, count })),
    attachmentCount,
  };
}

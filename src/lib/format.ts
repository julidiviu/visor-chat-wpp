import type { AttachmentType } from "./types";

const timeFormatter = new Intl.DateTimeFormat("es-EC", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const longDateFormatter = new Intl.DateTimeFormat("es-EC", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const numberFormatter = new Intl.NumberFormat("es-EC");

function clean(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function formatTime(ts: number): string {
  return clean(timeFormatter.format(ts)).replace(/\b([ap])\.\s*m\./i, "$1.m.");
}

export function formatDay(ts: number): string {
  return clean(longDateFormatter.format(ts));
}

export function formatShortDate(ts: number): string {
  const date = new Date(ts);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}`;
}

export function formatFullDate(ts: number): string {
  const date = new Date(ts);
  return `${formatShortDate(ts)}/${date.getFullYear()}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatListTime(ts: number | null): string {
  if (!ts) return "";

  const date = new Date(ts);
  const now = new Date();
  if (isSameDay(date, now)) return formatTime(ts);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Ayer";

  if (date.getFullYear() === now.getFullYear()) return formatShortDate(ts);
  return formatFullDate(ts);
}

export function formatDaySeparator(ts: number): string {
  const date = new Date(ts);
  const now = new Date();

  if (isSameDay(date, now)) return "Hoy";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Ayer";

  return formatDay(ts);
}

export function sameDay(a: number, b: number): boolean {
  return isSameDay(new Date(a), new Date(b));
}

/** Clave local del día, para comparar sin depender de la hora. */
export function dayKey(ts: number): string {
  const date = new Date(ts);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function formatCount(value: number): string {
  return numberFormatter.format(value);
}

export function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const decimals = value < 10 && unit > 0 ? 1 : 0;
  return `${value.toFixed(decimals).replace(".", ",")} ${units[unit]}`;
}

const TYPE_LABEL: Record<AttachmentType, string> = {
  image: "Foto",
  sticker: "Sticker",
  audio: "Audio",
  video: "Video",
  document: "Documento",
};

export function attachmentLabel(type: AttachmentType | null): string {
  return type ? TYPE_LABEL[type] : "";
}

export function previewOf(
  content: string | null,
  type: AttachmentType | null,
): string {
  const text = content?.replace(/\s+/g, " ").trim();
  if (text) return text;
  return type ? TYPE_LABEL[type] : "Sin mensajes";
}

/** Para búsqueda local: sin tildes ni mayúsculas. */
export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function initials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function displayName(fileName: string): string {
  return fileName.replace(/^\d{6,}-/, "");
}

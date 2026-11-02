import type { ChatMessage } from "./types";

export function isVisualMessage(message: ChatMessage): boolean {
  return (
    (message.attachmentType === "image" ||
      message.attachmentType === "video") &&
    Boolean(message.attachmentName)
  );
}

const monthFormatter = new Intl.DateTimeFormat("es-EC", { month: "long" });

function monthKey(ts: number): string {
  const date = new Date(ts);
  return `${date.getFullYear()}-${date.getMonth()}`;
}

export function monthLabel(ts: number, now = Date.now()): string {
  const date = new Date(ts);
  const current = new Date(now);

  if (
    date.getFullYear() === current.getFullYear() &&
    date.getMonth() === current.getMonth()
  ) {
    return "ESTE MES";
  }

  const month = monthFormatter.format(date).toUpperCase();
  return date.getFullYear() === current.getFullYear()
    ? month
    : `${month} ${date.getFullYear()}`;
}

export interface MediaSection {
  key: string;
  label: string;
  items: ChatMessage[];
}

/** Agrupa elementos ya ordenados de más reciente a más antiguo. */
export function groupByMonth(
  items: ChatMessage[],
  now = Date.now(),
): MediaSection[] {
  const sections: MediaSection[] = [];

  for (const item of items) {
    const key = monthKey(item.ts);
    const last = sections[sections.length - 1];

    if (last?.key === key) {
      last.items.push(item);
    } else {
      sections.push({ key, label: monthLabel(item.ts, now), items: [item] });
    }
  }

  return sections;
}

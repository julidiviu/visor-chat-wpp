"use client";

import type { ReactNode } from "react";
import { fold } from "@/lib/format";

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

export function Highlighted({
  text,
  query,
}: {
  text: string;
  query: string;
}): ReactNode {
  const needle = fold(query.trim());
  if (!needle) return text;

  const haystack = fold(text);
  if (!haystack.includes(needle)) return text;

  const parts: ReactNode[] = [];
  let cursor = 0;
  let index = haystack.indexOf(needle);
  let key = 0;

  while (index !== -1) {
    if (index > cursor) parts.push(text.slice(cursor, index));
    parts.push(
      <mark
        key={`mark-${key++}`}
        className="rounded-sm bg-accent/25 px-0.5 text-inherit"
      >
        {text.slice(index, index + needle.length)}
      </mark>,
    );
    cursor = index + needle.length;
    index = haystack.indexOf(needle, cursor);
  }

  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

/** Texto con enlaces clicables y coincidencias resaltadas. */
export function RichText({
  text,
  query,
}: {
  text: string;
  query: string;
}): ReactNode {
  const chunks = text.split(URL_PATTERN);

  return chunks.map((chunk, index) => {
    if (/^https?:\/\//.test(chunk)) {
      return (
        <a
          key={`url-${index}`}
          href={chunk}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-current/30 underline-offset-2 hover:opacity-80"
        >
          {chunk}
        </a>
      );
    }
    if (!chunk) return null;
    return <Highlighted key={`text-${index}`} text={chunk} query={query} />;
  });
}

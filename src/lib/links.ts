export interface ExtractedLink {
  url: string;
  host: string;
}

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;

/** Enlaces del texto de un mensaje: solo http(s) y dominios `www.`. */
export function extractLinks(content: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];

  for (const match of content.matchAll(URL_PATTERN)) {
    const raw = match[0].replace(/[.,;:!?]+$/, "").replace(/[)\]}'"]+$/, "");
    if (!raw) continue;

    const url = raw.startsWith("www.") ? `https://${raw}` : raw;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
      links.push({ url, host: parsed.hostname.replace(/^www\./, "") });
    } catch {
      continue;
    }
  }

  return links;
}

export type AttachmentType =
  | "image"
  | "sticker"
  | "audio"
  | "video"
  | "document";

const IMAGE = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp", "heic", "heif"]);
const AUDIO = new Set(["opus", "ogg", "oga", "mp3", "m4a", "aac", "wav", "flac", "amr"]);
const VIDEO = new Set(["mp4", "m4v", "mov", "3gp", "webm", "mkv", "avi"]);

const MIME = new Map<string, string>([
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
  ["gif", "image/gif"],
  ["bmp", "image/bmp"],
  ["heic", "image/heic"],
  ["heif", "image/heif"],
  ["mp4", "video/mp4"],
  ["m4v", "video/mp4"],
  ["mov", "video/quicktime"],
  ["3gp", "video/3gpp"],
  ["webm", "video/webm"],
  ["mkv", "video/x-matroska"],
  ["avi", "video/x-msvideo"],
  ["opus", "audio/ogg"],
  ["ogg", "audio/ogg"],
  ["oga", "audio/ogg"],
  ["mp3", "audio/mpeg"],
  ["m4a", "audio/mp4"],
  ["aac", "audio/aac"],
  ["wav", "audio/wav"],
  ["flac", "audio/flac"],
  ["amr", "audio/amr"],
  ["pdf", "application/pdf"],
  ["doc", "application/msword"],
  ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["xls", "application/vnd.ms-excel"],
  ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ["ppt", "application/vnd.ms-powerpoint"],
  ["pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ["txt", "text/plain; charset=utf-8"],
  ["csv", "text/csv; charset=utf-8"],
  ["vcf", "text/vcard; charset=utf-8"],
  ["zip", "application/zip"],
  ["rar", "application/vnd.rar"],
  ["7z", "application/x-7z-compressed"],
]);

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

export function attachmentTypeFor(fileName: string): AttachmentType {
  const extension = extensionOf(fileName);
  if (fileName.toLowerCase().includes("sticker")) return "sticker";
  if (IMAGE.has(extension)) return "image";
  if (AUDIO.has(extension)) return "audio";
  if (VIDEO.has(extension)) return "video";
  return "document";
}

export function contentTypeFor(fileName: string): string {
  return MIME.get(extensionOf(fileName)) ?? "application/octet-stream";
}

export interface FileIndex {
  exact: Map<string, string>;
  byPrefix: Map<string, string>;
}

/**
 * Algunas exportaciones escriben mal el nombre de ciertos archivos
 * (p. ej. un nombre con tilde guardado con caracteres extraños). El prefijo numérico del nombre
 * es único, así que sirve de segunda vía de resolución.
 */
export function buildFileIndex(files: string[]): FileIndex {
  const exact = new Map<string, string>();
  const byPrefix = new Map<string, string>();

  for (const file of files) {
    exact.set(file.normalize("NFC"), file);
    const match = /^(\d{6,})-/.exec(file);
    if (match) {
      byPrefix.set(`${match[1]}:${extensionOf(file)}`, file);
    }
  }

  return { exact, byPrefix };
}

export function resolveAttachment(
  index: FileIndex,
  fileName: string,
): string | null {
  const direct = index.exact.get(fileName.normalize("NFC"));
  if (direct) return direct;

  const match = /^(\d{6,})-/.exec(fileName);
  if (!match) return null;

  return index.byPrefix.get(`${match[1]}:${extensionOf(fileName)}`) ?? null;
}

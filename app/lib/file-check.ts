/**
 * Upload checks for exam papers, answer sheets and study files.
 *
 * The browser-declared `file.type` is whatever the client says it is, so the
 * real type is read from the file's first bytes ("magic numbers"). Only PDFs
 * and PNG/JPEG/WebP images are accepted; anything else — HTML, SVG, scripts,
 * executables renamed to .pdf — is refused before it reaches storage or the AI.
 */

export type UploadMime = "application/pdf" | "image/png" | "image/jpeg" | "image/webp";

export const MB = 1024 * 1024;

function sniff(b: Uint8Array): UploadMime | null {
  const at = (i: number, ...bytes: number[]) => bytes.every((v, k) => b[i + k] === v);
  if (at(0, 0x25, 0x50, 0x44, 0x46, 0x2d)) return "application/pdf"; // %PDF-
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp"; // RIFF....WEBP
  return null;
}

export interface UploadLimits {
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes?: number;
}

/**
 * Checks count, sizes and real types. Returns each file's verified MIME type
 * (use it instead of `file.type`), or a message suitable for a 400 response.
 */
export async function checkUploads(
  files: unknown[],
  limits: UploadLimits,
): Promise<{ mimes: Map<File, UploadMime> } | { error: string }> {
  const list = files.filter((f): f is File => f instanceof File && f.size > 0);
  if (list.length !== files.length) return { error: "Some uploads were empty or not files." };
  if (list.length > limits.maxFiles) return { error: `Too many files (max ${limits.maxFiles}).` };
  let total = 0;
  const mimes = new Map<File, UploadMime>();
  for (const file of list) {
    if (file.size > limits.maxFileBytes) {
      return { error: `"${file.name.slice(0, 80)}" is too large (max ${Math.round(limits.maxFileBytes / MB)} MB per file).` };
    }
    total += file.size;
    const mime = sniff(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
    if (!mime) return { error: `"${file.name.slice(0, 80)}" isn't a PDF or an image (PNG, JPEG or WebP).` };
    mimes.set(file, mime);
  }
  if (limits.maxTotalBytes && total > limits.maxTotalBytes) {
    return { error: `Files are too large together (max ${Math.round(limits.maxTotalBytes / MB)} MB).` };
  }
  return { mimes };
}

/** A storage-safe file name: no path separators, control characters or odd symbols. */
export function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "").slice(-100) || "file";
}

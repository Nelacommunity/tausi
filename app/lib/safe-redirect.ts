/**
 * A `?next=` value is only followed when it is a plain path on this site.
 * Rejects absolute URLs, protocol-relative `//host`, the `/\host` form that
 * browsers also treat as protocol-relative, and control characters that some
 * parsers strip (e.g. `/\t/host`).
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || next.length > 512) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  return next;
}

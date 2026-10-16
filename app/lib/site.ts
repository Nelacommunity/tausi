// The site's public address, from NEXT_PUBLIC_SITE_URL (e.g. https://www.tausi.app).
// Used for canonical links, the sitemap, robots.txt, structured data and
// share/QR links — anywhere an absolute URL must point at the live site.

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.tausi.app").trim().replace(/\/+$/, "");

/** Absolute URL on the public site: siteUrl("/about") → "https://www.tausi.app/about". */
export function siteUrl(path = "/"): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Origin to put in QR codes and share links (browser only). The current
 * origin when phones can reach it (deployed site, or a dev server on the
 * LAN); the public site when the page is open on localhost, which a
 * student's phone could never reach.
 */
export function shareOrigin(): string {
  const { origin, hostname } = window.location;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" ? SITE_URL : origin;
}

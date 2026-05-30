/**
 * In-memory sliding-window rate limiter.
 * Keys by user ID (or IP for unauthenticated paths).
 *
 * NOTE: state lives in the Node.js process — works for self-hosted single-instance
 * deployments (next start). For multi-instance / serverless, replace the Map with
 * a Redis or Supabase-backed store.
 */

interface Window {
  hits: number[];
}

const store = new Map<string, Window>();

// Prune fully-expired entries every 5 minutes to avoid unbounded growth
const pruneTimer = setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [key, win] of store) {
    if (win.hits.every((t) => t < cutoff)) store.delete(key);
  }
}, 5 * 60_000);

// Don't hold the event loop open during tests / graceful shutdown
if (pruneTimer.unref) pruneTimer.unref();

export type RateLimitConfig = { windowMs: number; max: number };

export const LIMITS = {
  /** AI generation routes — expensive, 10 req / min */
  ai: { windowMs: 60_000, max: 10 },
  /** File upload routes — moderate, 20 req / min */
  upload: { windowMs: 60_000, max: 20 },
  /** Standard CRUD routes — 60 req / min */
  standard: { windowMs: 60_000, max: 60 },
} satisfies Record<string, RateLimitConfig>;

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const cutoff = now - config.windowMs;

  const win = store.get(key) ?? { hits: [] };
  win.hits = win.hits.filter((t) => t > cutoff);
  store.set(key, win);

  if (win.hits.length >= config.max) {
    const resetAt = win.hits[0] + config.windowMs;
    return { allowed: false, remaining: 0, resetAt };
  }

  win.hits.push(now);
  const resetAt = win.hits[0] + config.windowMs;
  return { allowed: true, remaining: config.max - win.hits.length, resetAt };
}

export function rateLimitError(resetAt: number): Response {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return new Response(
    JSON.stringify({ error: "Too many requests — please slow down." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
      },
    }
  );
}

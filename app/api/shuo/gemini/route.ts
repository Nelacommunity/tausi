import { getViewer, jsonError } from "@/app/lib/learning/server";
import { checkSharedRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

// Text, JSON and speech generation can take a while for long lessons.
export const maxDuration = 120;

const MODEL_RE = /^gemini-[a-z0-9.-]{1,60}$/;
/** Recorded audio for pronunciation scoring is sent inline, so allow a few MB. */
const MAX_BODY_BYTES = 8 * 1024 * 1024;
/** Only the request fields Shuō uses — no tools (e.g. web search) on Tausi's key. */
const ALLOWED_FIELDS = ["contents", "systemInstruction", "generationConfig"] as const;

/**
 * Shuō's Gemini proxy. The browser sends { model, body } for a
 * generateContent call; the server checks the student is signed in,
 * rate-limits, adds the API key and forwards it. The key never leaves the server.
 */
export async function POST(request: Request) {
  const { user } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = await checkSharedRateLimit(`shuo:${user.id}`, LIMITS.shuo);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return jsonError("AI is not configured on this server.", 500);

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return jsonError("Request too large.", 413);
  let parsed: { model?: unknown; body?: Record<string, unknown> };
  try { parsed = JSON.parse(raw); } catch { return jsonError("Invalid JSON", 400); }

  const model = typeof parsed.model === "string" ? parsed.model : "";
  if (!MODEL_RE.test(model)) return jsonError("Unknown model.", 400);
  const body = parsed.body;
  if (!body || typeof body !== "object" || !Array.isArray(body.contents)) return jsonError("Invalid request.", 400);
  const forwarded = Object.fromEntries(ALLOWED_FIELDS.filter((k) => k in body).map((k) => [k, body[k]]));

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(forwarded),
      signal: AbortSignal.timeout(110_000),
    });
    const data = await res.json().catch(() => ({ error: { message: `Upstream error ${res.status}` } }));
    return Response.json(data, { status: res.status });
  } catch (err) {
    return jsonError(err instanceof Error && err.name === "TimeoutError" ? "The AI took too long — try again." : "Could not reach the AI service.", 502);
  }
}

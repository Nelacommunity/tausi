import { getViewer, jsonError } from "@/app/lib/learning/server";
import { checkSharedRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

const LIVE_MODEL_RE = /^gemini-[a-z0-9.-]*(live|native-audio)[a-z0-9.-]*$/;

/**
 * A single-use, short-lived Gemini Live token for Shuō's voice tutor. The
 * browser opens the websocket with this token instead of the API key: it
 * works once, must be used within a minute, and the session ends within 30.
 */
export async function POST(request: Request) {
  const { user } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = await checkSharedRateLimit(`shuo-live:${user.id}`, LIMITS.shuoLive);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return jsonError("AI is not configured on this server.", 500);

  const { model } = (await request.json().catch(() => ({}))) as { model?: string };
  if (!model || !LIVE_MODEL_RE.test(model) || model.length > 80) return jsonError("Unknown voice model.", 400);

  const now = Date.now();
  const res = await fetch("https://generativelanguage.googleapis.com/v1alpha/auth_tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      uses: 1,
      expireTime: new Date(now + 30 * 60_000).toISOString(),
      newSessionExpireTime: new Date(now + 60_000).toISOString(),
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  const data = res ? await res.json().catch(() => ({})) : {};
  if (!res?.ok || typeof data.name !== "string") return jsonError("Could not start a voice session — try again.", 502);
  return Response.json({ token: data.name });
}

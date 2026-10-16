import { clientIp, getViewer, jsonError } from "@/app/lib/learning/server";
import { loadSession, participantToken, playerState } from "@/app/lib/learning/live";
import { checkRateLimit, rateLimitError } from "@/app/lib/rate-limit";

/** Player view of a live session. Public: guests identify with their participant token. */
export async function GET(request: Request, ctx: RouteContext<"/api/live/[code]">) {
  const { code } = await ctx.params;
  const { user, db } = await getViewer();
  // Generous limit: players refetch on every realtime signal.
  const rl = checkRateLimit(`${user?.id ?? clientIp(request)}:live-state`, { windowMs: 60_000, max: 240 });
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const session = await loadSession(db, code);
  if (!session) return jsonError("No session with that code.", 404);
  return Response.json(await playerState(db, session, user, participantToken(request)));
}

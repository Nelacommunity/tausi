import { z } from "zod";
import { clientIp, getViewer, jsonError, randomToken } from "@/app/lib/learning/server";
import { findParticipant, loadSession, participantToken, sessionAccess } from "@/app/lib/learning/live";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";
import { displayNameOf } from "@/app/lib/learning/reports";

const schema = z.object({ displayName: z.string().trim().max(40).optional() });

/**
 * Join with a display name. Signed-in students join with their account (their
 * results feed their mastery); guests get a token stored on their device.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/live/[code]/join">) {
  const { code } = await ctx.params;
  const { user, db } = await getViewer();
  const rl = checkRateLimit(`${user?.id ?? clientIp(request)}:live-join`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter a display name (up to 40 characters).", 400);
  // Signed-in students can join in one tap: their profile name is used.
  let displayName = parsed.data.displayName ?? "";
  if (!displayName && user) {
    const { data: p } = await db.from("profiles").select("display_name, full_name, email").eq("id", user.id).maybeSingle();
    displayName = displayNameOf(p ?? { email: user.email }).slice(0, 40);
  }
  if (!displayName) return jsonError("Enter a display name (up to 40 characters).", 400);

  const session = await loadSession(db, code);
  if (!session) return jsonError("No session with that code.", 404);
  if (session.status === "finished") return jsonError("This session has ended.", 410);
  const access = await sessionAccess(db, session, user);
  if (!access.allowed) {
    return access.reason === "LOGIN_REQUIRED"
      ? Response.json({ error: "Sign in to join this exam.", code: "LOGIN_REQUIRED" }, { status: 401 })
      : Response.json({ error: "This exam is only for members of its class.", code: "CLASS_ONLY" }, { status: 403 });
  }

  const existing = await findParticipant(db, session.id, user, participantToken(request));
  if (existing) {
    if (parsed.data.displayName && existing.display_name !== parsed.data.displayName) {
      await db.from("session_participants").update({ display_name: parsed.data.displayName }).eq("id", existing.id);
    }
    return Response.json({ participantId: existing.id, token: existing.guest_token });
  }

  const token = user ? null : randomToken();
  const { data, error } = await db.from("session_participants").insert({
    session_id: session.id, user_id: user?.id ?? null, guest_token: token, display_name: displayName,
  }).select("id").single();
  if (error) return jsonError(error.message, 500);
  return Response.json({ participantId: data.id, token });
}

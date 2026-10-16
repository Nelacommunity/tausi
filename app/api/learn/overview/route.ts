import { getViewer, jsonError } from "@/app/lib/learning/server";
import { studentLevels, studentSessions } from "@/app/lib/learning/progress";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

/** The student's diagnosis: readiness and KP mastery per level, plus recent live results. */
export async function GET() {
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:learn-overview`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const [levels, sessions] = await Promise.all([studentLevels(db, user.id), studentSessions(db, user.id)]);
  return Response.json({ levels, sessions: sessions.slice(0, 10) });
}

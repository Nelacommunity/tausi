import { z } from "zod";
import { clientIp, getViewer, jsonError } from "@/app/lib/learning/server";
import { findParticipant, loadSession, participantToken } from "@/app/lib/learning/live";
import { explanationsFor } from "@/app/lib/learning/review";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

const schema = z.object({
  questionIds: z.array(z.string().uuid()).min(1).max(60),
  lang: z.enum(["en", "sw", "zh"]),
  /** Live session code, for guests reviewing a session. */
  code: z.string().max(12).optional(),
});

/**
 * Explanations for questions the caller has already answered — never for
 * questions they haven't (that would leak answers mid-exam). Generated once
 * per question and language, then served from the cache.
 */
export async function POST(request: Request) {
  const { user, db } = await getViewer();
  const rl = checkRateLimit(`${user?.id ?? clientIp(request)}:explain`, LIMITS.ai);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request", 400);
  const { questionIds, lang, code } = parsed.data;

  let answered: string[] = [];
  if (code) {
    const session = await loadSession(db, code);
    const me = session ? await findParticipant(db, session.id, user, participantToken(request)) : null;
    if (!me) return jsonError("Not allowed", 403);
    const { data } = await db.from("answers").select("question_id").eq("participant_id", me.id).in("question_id", questionIds);
    answered = (data ?? []).map((a) => a.question_id as string);
  } else if (user) {
    const { data } = await db.from("answers").select("question_id").eq("user_id", user.id).in("question_id", questionIds);
    answered = (data ?? []).map((a) => a.question_id as string);
  } else {
    return jsonError("Unauthorized", 401);
  }

  try {
    return Response.json(await explanationsFor(db, [...new Set(answered)], lang));
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not load explanations", 502);
  }
}

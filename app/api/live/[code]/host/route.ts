import { getViewer, jsonError } from "@/app/lib/learning/server";
import { leaderboard, loadSession, sessionInfo, sessionQuestions } from "@/app/lib/learning/live";
import { checkRateLimit, rateLimitError } from "@/app/lib/rate-limit";

/** Everything the host's screen needs: players, progress, live answer distribution. */
export async function GET(_request: Request, ctx: RouteContext<"/api/live/[code]/host">) {
  const { code } = await ctx.params;
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:live-host`, { windowMs: 60_000, max: 240 });
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const session = await loadSession(db, code);
  if (!session || session.host_id !== user.id) return jsonError("Not found", 404);

  const questions = await sessionQuestions(db, session);
  const [{ data: participants }, { data: answers }] = await Promise.all([
    db.from("session_participants").select("id, display_name, score, user_id, submitted_at, joined_at").eq("session_id", session.id).order("joined_at"),
    db.from("answers").select("participant_id, question_id, response, is_correct").eq("session_id", session.id),
  ]);

  const answeredBy = new Map<string, number>();
  for (const a of answers ?? []) answeredBy.set(a.participant_id as string, (answeredBy.get(a.participant_id as string) ?? 0) + 1);

  const current = questions[session.current_index];
  const distribution: Record<string, number> = {};
  let currentAnswered = 0, currentCorrect = 0;
  if (current) {
    for (const a of answers ?? []) {
      if (a.question_id !== current.id) continue;
      currentAnswered++;
      if (a.is_correct) currentCorrect++;
      distribution[a.response] = (distribution[a.response] ?? 0) + 1;
    }
  }

  return Response.json({
    session: sessionInfo(session, questions.length),
    sessionId: session.id,
    questions: questions.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, options: q.options, answer: q.answer })),
    participants: (participants ?? []).map((p) => ({
      id: p.id, name: p.display_name, score: p.score, signedIn: !!p.user_id,
      submitted: !!p.submitted_at, answered: answeredBy.get(p.id) ?? 0,
    })),
    current: current ? { answered: currentAnswered, correct: currentCorrect, distribution } : null,
    leaderboard: session.mode === "game" ? (await leaderboard(db, session.id)).slice(0, 10) : [],
  });
}

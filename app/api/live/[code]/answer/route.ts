import { after } from "next/server";
import { z } from "zod";
import { clientIp, getViewer, jsonError } from "@/app/lib/learning/server";
import { findParticipant, GRACE_SECONDS, loadSession, participantToken, sessionQuestions } from "@/app/lib/learning/live";
import { gamePoints, isCorrect } from "@/app/lib/learning/grading";
import { recomputeMastery } from "@/app/lib/learning/mastery-store";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

const schema = z.object({ questionId: z.string().uuid(), response: z.string().max(200) });

/** Game mode: answer the current question once. Points reward accuracy, speed and streaks. */
export async function POST(request: Request, ctx: RouteContext<"/api/live/[code]/answer">) {
  const { code } = await ctx.params;
  const { user, db } = await getViewer();
  const rl = checkRateLimit(`${user?.id ?? clientIp(request)}:live-answer`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid answer", 400);

  const session = await loadSession(db, code);
  if (!session) return jsonError("No session with that code.", 404);
  if (session.mode !== "game" || session.status !== "question") return jsonError("This question is closed.", 409);

  const me = await findParticipant(db, session.id, user, participantToken(request));
  if (!me) return jsonError("Join the session first.", 403);

  const questions = await sessionQuestions(db, session);
  const q = questions[session.current_index];
  if (!q || q.id !== parsed.data.questionId) return jsonError("This question is closed.", 409);

  const elapsedMs = Date.now() - new Date(session.question_started_at ?? Date.now()).getTime();
  if (elapsedMs > (session.question_seconds + GRACE_SECONDS) * 1000) return jsonError("Time's up for this question.", 409);

  const correct = isCorrect(q.type, parsed.data.response, q.answer);
  const points = gamePoints(correct, elapsedMs, session.question_seconds, me.streak);
  const { error } = await db.from("answers").insert({
    user_id: me.user_id, session_id: session.id, participant_id: me.id, question_id: q.id,
    response: parsed.data.response, is_correct: correct, time_ms: elapsedMs, points, source: "live",
  });
  if (error) {
    if (error.code === "23505") return jsonError("You already answered this question.", 409);
    return jsonError(error.message, 500);
  }
  await db.from("session_participants")
    .update({ score: me.score + points, streak: correct ? me.streak + 1 : 0 })
    .eq("id", me.id);

  // Mastery updates after every answer for signed-in students — off the response path.
  if (me.user_id) {
    const userId = me.user_id;
    after(() => recomputeMastery(db, userId).catch(() => {}));
  }
  return Response.json({ ok: true });
}

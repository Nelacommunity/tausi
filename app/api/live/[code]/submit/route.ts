import { z } from "zod";
import { clientIp, getViewer, jsonError } from "@/app/lib/learning/server";
import { findParticipant, LATE_SUBMIT_SECONDS, loadSession, participantToken, sessionQuestions } from "@/app/lib/learning/live";
import { isCorrect } from "@/app/lib/learning/grading";
import { recomputeMastery } from "@/app/lib/learning/mastery-store";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

const schema = z.object({
  responses: z.array(z.object({ questionId: z.string().uuid(), response: z.string().max(200) })).max(200),
});

/** Exam mode: hand in every answer at once. Unanswered questions count as wrong. */
export async function POST(request: Request, ctx: RouteContext<"/api/live/[code]/submit">) {
  const { code } = await ctx.params;
  const { user, db } = await getViewer();
  const rl = checkRateLimit(`${user?.id ?? clientIp(request)}:live-submit`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid submission", 400);

  const session = await loadSession(db, code);
  if (!session || session.mode !== "exam") return jsonError("No exam with that code.", 404);
  const now = Date.now();
  const lateOk = session.status === "finished" && session.ended_at
    && now - new Date(session.ended_at).getTime() < LATE_SUBMIT_SECONDS * 1000;
  if (session.status !== "active" && !lateOk) return jsonError("This exam is not open for submissions.", 409);
  if (session.status === "active" && session.started_at
    && now - new Date(session.started_at).getTime() > (session.time_limit_seconds + LATE_SUBMIT_SECONDS) * 1000) {
    return jsonError("Time is up for this exam.", 409);
  }

  const me = await findParticipant(db, session.id, user, participantToken(request));
  if (!me) return jsonError("Join the exam first.", 403);
  if (me.submitted_at) return jsonError("You have already submitted.", 409);

  const questions = await sessionQuestions(db, session);
  const given = new Map(parsed.data.responses.map((r) => [r.questionId, r.response]));
  const startedMs = session.started_at ? new Date(session.started_at).getTime() : now;
  const rows = questions.map((q) => {
    const response = given.get(q.id) ?? "";
    return {
      user_id: me.user_id, session_id: session.id, participant_id: me.id, question_id: q.id,
      response, is_correct: isCorrect(q.type, response, q.answer), time_ms: now - startedMs, points: 0, source: "live",
    };
  });
  const { error } = await db.from("answers").upsert(rows, { onConflict: "participant_id,question_id", ignoreDuplicates: true });
  if (error) return jsonError(error.message, 500);

  const score = rows.filter((r) => r.is_correct).length;
  await db.from("session_participants").update({ score, submitted_at: new Date(now).toISOString() }).eq("id", me.id);
  if (me.user_id) await recomputeMastery(db, me.user_id);
  return Response.json({ ok: true, score, total: questions.length });
}

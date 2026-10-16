import { clientIp, getViewer, jsonError } from "@/app/lib/learning/server";
import { findParticipant, loadSession, participantToken, sessionQuestions } from "@/app/lib/learning/live";
import { participantReview } from "@/app/lib/learning/review";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

/**
 * A player's personal review: every question, their answer, the correct one.
 * Exam mode: after they submit. Game mode: once the session has finished.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/live/[code]/review">) {
  const { code } = await ctx.params;
  const { user, db } = await getViewer();
  const rl = checkRateLimit(`${user?.id ?? clientIp(request)}:live-review`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const session = await loadSession(db, code);
  if (!session) return jsonError("No session with that code.", 404);
  const me = await findParticipant(db, session.id, user, participantToken(request));
  if (!me) return jsonError("You did not take part in this session.", 403);
  const open = session.mode === "exam" ? !!me.submitted_at : session.status === "finished";
  if (!open) return jsonError("Your review opens when you finish.", 409);

  const questions = await sessionQuestions(db, session);
  const items = await participantReview(db, me.id, questions.map((q) => q.id));
  // Game mode: questions the player never answered still appear, marked wrong.
  const answered = new Set(items.map((i) => i.questionId));
  for (const q of questions) {
    if (answered.has(q.id)) continue;
    items.push({ questionId: q.id, type: q.type, prompt: q.prompt, options: q.options, response: "", answer: q.answer, isCorrect: false, kps: [] });
  }
  const pos = new Map(questions.map((q, i) => [q.id, i]));
  items.sort((a, b) => (pos.get(a.questionId) ?? 0) - (pos.get(b.questionId) ?? 0));

  return Response.json({
    title: session.assessments.title, mode: session.mode, displayName: me.display_name,
    score: me.score, correct: items.filter((i) => i.isCorrect).length, total: questions.length,
    signedIn: !!me.user_id, items,
  });
}

import { getViewer, jsonError } from "@/app/lib/learning/server";
import { sessionQuestions } from "@/app/lib/learning/live";
import { answerFacts, distribution, kpStats, questionStats } from "@/app/lib/learning/reports";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

/** Session report for the host: score spread, hardest questions, weakest KPs, per-student results. */
export async function GET(_request: Request, ctx: RouteContext<"/api/reports/sessions/[id]">) {
  const { id } = await ctx.params;
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:session-report`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const { data: s } = await db.from("live_sessions")
    .select("id, host_id, class_id, join_code, mode, status, started_at, created_at, assessment_id, assessments(title)")
    .eq("id", id).maybeSingle();
  if (!s || s.host_id !== user.id) return jsonError("Not found", 404);

  const questions = await sessionQuestions(db, s);
  const total = questions.length;
  const [{ facts, prompts }, { data: participants }] = await Promise.all([
    answerFacts(db, { sessionIds: [id] }),
    db.from("session_participants").select("id, user_id, display_name, score, submitted_at").eq("session_id", id),
  ]);

  const correctBy = new Map<string, number>();
  const answersBy = new Map<string, Map<string, { response: string; isCorrect: boolean }>>();
  for (const f of facts) {
    if (!f.participantId) continue;
    if (f.isCorrect) correctBy.set(f.participantId, (correctBy.get(f.participantId) ?? 0) + 1);
    const m = answersBy.get(f.participantId) ?? new Map();
    m.set(f.questionId, { response: f.response, isCorrect: f.isCorrect });
    answersBy.set(f.participantId, m);
  }
  const students = (participants ?? []).map((p) => {
    const correct = correctBy.get(p.id) ?? 0;
    return {
      participantId: p.id, userId: p.user_id as string | null, name: p.display_name, score: p.score,
      correct, total, pct: total ? correct / total : 0,
      answers: questions.map((q) => answersBy.get(p.id)?.get(q.id) ?? null),
    };
  }).sort((a, b) => b.pct - a.pct || b.score - a.score);

  return Response.json({
    id: s.id, code: s.join_code, mode: s.mode, status: s.status, classId: s.class_id,
    title: (s.assessments as unknown as { title: string })?.title ?? "", date: s.started_at ?? s.created_at,
    questions: questions.map((q) => ({ id: q.id, prompt: q.prompt, answer: q.answer })),
    average: students.length ? students.reduce((sum, x) => sum + x.pct, 0) / students.length : 0,
    distribution: distribution(students.map((x) => x.pct)),
    hardestQuestions: questionStats(facts, prompts).sort((a, b) => a.accuracy - b.accuracy).slice(0, 5),
    weakestKps: kpStats(facts).sort((a, b) => a.accuracy - b.accuracy).slice(0, 6),
    students,
  });
}

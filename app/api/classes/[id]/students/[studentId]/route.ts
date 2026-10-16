import { getViewer, jsonError } from "@/app/lib/learning/server";
import { displayNameOf } from "@/app/lib/learning/reports";
import { studentLevels, studentSessions } from "@/app/lib/learning/progress";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

/** Teacher drill-down into one student of their class. */
export async function GET(_request: Request, ctx: RouteContext<"/api/classes/[id]/students/[studentId]">) {
  const { id, studentId } = await ctx.params;
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:student-report`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const { data: cls } = await db.from("classes").select("id, name, teacher_id").eq("id", id).maybeSingle();
  if (!cls || cls.teacher_id !== user.id) return jsonError("Not found", 404);
  const { data: member } = await db.from("class_members").select("student_id").eq("class_id", id).eq("student_id", studentId).maybeSingle();
  if (!member) return jsonError("Not found", 404);

  const { data: profile } = await db.from("profiles").select("display_name, full_name, email").eq("id", studentId).maybeSingle();
  const { data: sessions } = await db.from("live_sessions").select("id").eq("class_id", id);
  const [levels, history, { data: mistakes }] = await Promise.all([
    studentLevels(db, studentId),
    studentSessions(db, studentId, (sessions ?? []).map((s) => s.id as string)),
    db.from("answers").select("response, created_at, questions(prompt, answer)").eq("user_id", studentId).eq("is_correct", false)
      .order("created_at", { ascending: false }).limit(8),
  ]);

  return Response.json({
    className: cls.name,
    name: displayNameOf(profile ?? {}),
    levels,
    history,
    mistakes: ((mistakes ?? []) as unknown as { response: string; created_at: string; questions: { prompt: string; answer: string } }[])
      .map((m) => ({ prompt: m.questions.prompt, response: m.response, answer: m.questions.answer, date: m.created_at })),
  });
}

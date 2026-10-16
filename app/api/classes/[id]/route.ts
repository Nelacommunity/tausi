import { z } from "zod";
import { getViewer, jsonError } from "@/app/lib/learning/server";
import { answerFacts, displayNameOf, distribution, questionStats } from "@/app/lib/learning/reports";
import { WEAK_BELOW } from "@/app/lib/mastery";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

/** Class view for the teacher: weakest KPs, hardest questions, score spread, every student. */
export async function GET(_request: Request, ctx: RouteContext<"/api/classes/[id]">) {
  const { id } = await ctx.params;
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:class-report`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const { data: cls } = await db.from("classes").select("id, name, join_code, teacher_id, is_public").eq("id", id).maybeSingle();
  if (!cls || cls.teacher_id !== user.id) return jsonError("Not found", 404);

  const { data: members } = await db.from("class_members").select("student_id").eq("class_id", id);
  const studentIds = (members ?? []).map((m) => m.student_id as string);
  const { data: profiles } = studentIds.length
    ? await db.from("profiles").select("id, display_name, full_name, email").in("id", studentIds)
    : { data: [] };
  const students = (profiles ?? []).map((p) => ({ id: p.id as string, name: displayNameOf(p) }));

  const { data: sessions } = await db.from("live_sessions")
    .select("id, join_code, mode, status, started_at, created_at, assessments(title)")
    .eq("class_id", id).order("created_at", { ascending: false });
  const sessionIds = (sessions ?? []).map((s) => s.id as string);

  const [{ facts, prompts }, { data: mastery }] = await Promise.all([
    answerFacts(db, { sessionIds }),
    studentIds.length
      ? db.from("kp_mastery").select("user_id, mastery, attempts, kp_id, knowledge_points(name, code, curriculum_levels(name))").in("user_id", studentIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Weakest KPs across the class, from each student's mastery.
  type K = { user_id: string; mastery: number; attempts: number; kp_id: string; knowledge_points: { name: string; code: string; curriculum_levels: { name: string } } };
  const kpAgg = new Map<string, { name: string; level: string; sum: number; n: number; weak: number }>();
  const perStudent = new Map<string, { sum: number; n: number; weakest: { name: string; m: number }[] }>();
  for (const k of (mastery ?? []) as unknown as K[]) {
    const a = kpAgg.get(k.kp_id) ?? { name: k.knowledge_points.name, level: k.knowledge_points.curriculum_levels.name, sum: 0, n: 0, weak: 0 };
    a.sum += k.mastery; a.n++; if (k.mastery < WEAK_BELOW) a.weak++;
    kpAgg.set(k.kp_id, a);
    const s = perStudent.get(k.user_id) ?? { sum: 0, n: 0, weakest: [] };
    s.sum += k.mastery; s.n++; s.weakest.push({ name: k.knowledge_points.name, m: k.mastery });
    perStudent.set(k.user_id, s);
  }
  const weakestKps = [...kpAgg].map(([kpId, a]) => ({ kpId, name: a.name, level: a.level, mastery: a.sum / a.n, students: a.n, weakStudents: a.weak }))
    .sort((a, b) => a.mastery - b.mastery);

  // Per-student accuracy in class sessions.
  const acc = new Map<string, { ok: number; n: number }>();
  for (const f of facts) {
    if (!f.userId) continue;
    const s = acc.get(f.userId) ?? { ok: 0, n: 0 };
    s.n++; if (f.isCorrect) s.ok++;
    acc.set(f.userId, s);
  }

  return Response.json({
    id: cls.id, name: cls.name, code: cls.join_code, isPublic: cls.is_public as boolean,
    sessions: (sessions ?? []).map((s) => {
      const sf = facts.filter((f) => f.sessionId === s.id);
      return {
        id: s.id, code: s.join_code, mode: s.mode, status: s.status, date: s.started_at ?? s.created_at,
        title: (s.assessments as unknown as { title: string })?.title ?? "",
        accuracy: sf.length ? sf.filter((f) => f.isCorrect).length / sf.length : null,
        players: new Set(sf.map((f) => f.participantId)).size,
      };
    }),
    distribution: distribution([...acc.values()].map((a) => a.ok / a.n)),
    hardestQuestions: questionStats(facts, prompts).filter((q) => q.attempts >= 3).sort((a, b) => a.accuracy - b.accuracy).slice(0, 8),
    weakestKps: weakestKps.slice(0, 10),
    students: students.map((s) => {
      const m = perStudent.get(s.id);
      const a = acc.get(s.id);
      return {
        id: s.id, name: s.name,
        mastery: m ? m.sum / m.n : null,
        accuracy: a ? a.ok / a.n : null,
        answers: a?.n ?? 0,
        weakest: (m?.weakest ?? []).filter((w) => w.m < WEAK_BELOW).sort((x, y) => x.m - y.m).slice(0, 2).map((w) => w.name),
      };
    }).sort((x, y) => (x.mastery ?? 1) - (y.mastery ?? 1)),
  });
}

const patchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  /** Public: anyone with the code may join this class's exams. Private: members only. */
  isPublic: z.boolean().optional(),
});

/** Rename a class or change who may join its exams (teacher only). */
export async function PATCH(request: Request, ctx: RouteContext<"/api/classes/[id]">) {
  const { id } = await ctx.params;
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:class-patch`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request", 400);
  const { data: cls } = await db.from("classes").select("teacher_id").eq("id", id).maybeSingle();
  if (!cls || cls.teacher_id !== user.id) return jsonError("Not found", 404);

  const updates: Record<string, unknown> = {};
  if (parsed.data.name) updates.name = parsed.data.name;
  if (parsed.data.isPublic !== undefined) updates.is_public = parsed.data.isPublic;
  if (Object.keys(updates).length) {
    const { error } = await db.from("classes").update(updates).eq("id", id);
    if (error) return jsonError(error.message, 500);
  }
  return Response.json({ ok: true });
}

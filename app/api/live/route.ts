import { z } from "zod";
import { getViewer, insertWithCode, jsonError } from "@/app/lib/learning/server";
import { ownedAssessment } from "@/app/lib/learning/queries";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";
import { notifyClass } from "@/app/lib/learning/notify";

/** The host's recent sessions. */
export async function GET() {
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:live-list`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const { data } = await db
    .from("live_sessions")
    .select("id, join_code, mode, status, created_at, started_at, assessments(title), classes(name), session_participants(count)")
    .eq("host_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  type Row = { id: string; join_code: string; mode: string; status: string; created_at: string; started_at: string | null; assessments: { title: string }; classes: { name: string } | null; session_participants: { count: number }[] };
  return Response.json(((data ?? []) as unknown as Row[]).map((s) => ({
    id: s.id, code: s.join_code, mode: s.mode, status: s.status, createdAt: s.started_at ?? s.created_at,
    title: s.assessments?.title ?? "", className: s.classes?.name ?? null,
    participants: s.session_participants?.[0]?.count ?? 0,
  })));
}

const schema = z.object({
  assessmentId: z.string().uuid(),
  mode: z.enum(["exam", "game"]),
  requireLogin: z.boolean(),
  classId: z.string().uuid().nullable().optional(),
  questionSeconds: z.number().int().min(5).max(120).default(20),
  timeLimitMinutes: z.number().int().min(1).max(180).default(15),
});

/** Host a published practice exam live. Returns the join code. */
export async function POST(request: Request) {
  const { user, role, db } = await getViewer({ withRole: true });
  if (!user) return jsonError("Unauthorized", 401);
  if (role !== "teacher") return jsonError("Teachers only", 403);
  const rl = checkRateLimit(`${user.id}:live-create`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request", 400);
  const p = parsed.data;

  const a = await ownedAssessment(db, p.assessmentId, user.id);
  if (!a) return jsonError("Not found", 404);
  if (a.status !== "published") return jsonError("Publish the exam before hosting it.", 400);
  let cls: { teacher_id: string; name: string; is_public: boolean } | null = null;
  if (p.classId) {
    const { data } = await db.from("classes").select("teacher_id, name, is_public").eq("id", p.classId).maybeSingle();
    if (data?.teacher_id !== user.id) return jsonError("Class not found", 404);
    cls = data;
  }

  try {
    const session = await insertWithCode<{ id: string; join_code: string }>(db, "live_sessions", {
      assessment_id: a.id, host_id: user.id, class_id: p.classId ?? null, mode: p.mode,
      // A private class's exam checks membership, so students must be signed in.
      require_login: p.requireLogin || (!!cls && !cls.is_public),
      question_seconds: p.questionSeconds, time_limit_seconds: p.timeLimitMinutes * 60,
    });
    if (cls && p.classId) await notifyClass(db, p.classId, cls.name, a.title, p.mode, session);
    return Response.json({ id: session.id, code: session.join_code });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not create session", 500);
  }
}

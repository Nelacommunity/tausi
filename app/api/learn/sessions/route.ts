import { getViewer, jsonError } from "@/app/lib/learning/server";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

/** Live exams currently open in classes I belong to — one tap to join. */
export async function GET() {
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:learn-sessions`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const { data: memberships } = await db.from("class_members").select("class_id").eq("student_id", user.id);
  const classIds = (memberships ?? []).map((m) => m.class_id as string);
  if (!classIds.length) return Response.json([]);

  const { data } = await db.from("live_sessions")
    .select("id, join_code, mode, status, created_at, assessments(title), classes(name), session_participants(user_id, submitted_at)")
    .in("class_id", classIds).neq("status", "finished")
    .order("created_at", { ascending: false }).limit(20);
  type Row = { id: string; join_code: string; mode: string; status: string; created_at: string; assessments: { title: string }; classes: { name: string } | null; session_participants: { user_id: string | null; submitted_at: string | null }[] };
  return Response.json(((data ?? []) as unknown as Row[]).map((s) => {
    const me = s.session_participants.find((p) => p.user_id === user.id);
    return {
      id: s.id, code: s.join_code, mode: s.mode, status: s.status, createdAt: s.created_at,
      title: s.assessments?.title ?? "", className: s.classes?.name ?? "",
      joined: !!me, submitted: !!me?.submitted_at,
    };
  }));
}

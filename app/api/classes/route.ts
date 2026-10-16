import { z } from "zod";
import { getViewer, insertWithCode, jsonError } from "@/app/lib/learning/server";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

/** Classes I teach and classes I belong to. */
export async function GET() {
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:classes`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const [{ data: teaching }, { data: member }] = await Promise.all([
    db.from("classes").select("id, name, join_code, created_at, curricula(name), class_members(count)").eq("teacher_id", user.id).order("created_at", { ascending: false }),
    db.from("class_members").select("classes(id, name, curricula(name))").eq("student_id", user.id),
  ]);
  type T = { id: string; name: string; join_code: string; curricula: { name: string } | null; class_members: { count: number }[] };
  type M = { classes: { id: string; name: string; curricula: { name: string } | null } };
  return Response.json({
    teaching: ((teaching ?? []) as unknown as T[]).map((c) => ({
      id: c.id, name: c.name, code: c.join_code, curriculumName: c.curricula?.name ?? null, memberCount: c.class_members?.[0]?.count ?? 0,
    })),
    member: ((member ?? []) as unknown as M[]).map((m) => ({ id: m.classes.id, name: m.classes.name, curriculumName: m.classes.curricula?.name ?? null })),
  });
}

const schema = z.object({ name: z.string().trim().min(1).max(100), curriculumId: z.string().uuid().nullable().optional() });

export async function POST(request: Request) {
  const { user, role, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  if (role !== "teacher") return jsonError("Teachers only", 403);
  const rl = checkRateLimit(`${user.id}:classes-create`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Give the class a name.", 400);
  try {
    const cls = await insertWithCode<{ id: string; join_code: string }>(db, "classes", {
      teacher_id: user.id, name: parsed.data.name, curriculum_id: parsed.data.curriculumId ?? null,
    });
    return Response.json({ id: cls.id, code: cls.join_code });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not create class", 500);
  }
}

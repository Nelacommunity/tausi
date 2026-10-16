import { z } from "zod";
import { getViewer, jsonError } from "@/app/lib/learning/server";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";
import type { AssessmentSummary } from "@/app/lib/learning/types";

export async function GET() {
  const { user, role, db } = await getViewer({ withRole: true });
  if (!user) return jsonError("Unauthorized", 401);
  if (role !== "teacher") return jsonError("Teachers only", 403);
  const rl = checkRateLimit(`${user.id}:assessments`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const { data } = await db
    .from("assessments")
    .select("id, title, status, created_at, curricula(name), curriculum_levels(name), assessment_items(count)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  type Row = { id: string; title: string; status: "draft" | "published"; created_at: string; curricula: { name: string }; curriculum_levels: { name: string }; assessment_items: { count: number }[] };
  const list: AssessmentSummary[] = ((data ?? []) as unknown as Row[]).map((a) => ({
    id: a.id, title: a.title, status: a.status, createdAt: a.created_at,
    curriculumName: a.curricula?.name ?? "", levelName: a.curriculum_levels?.name ?? "",
    itemCount: a.assessment_items?.[0]?.count ?? 0,
  }));
  return Response.json(list);
}

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  levelId: z.string().uuid(),
});

export async function POST(request: Request) {
  const { user, role, db } = await getViewer({ withRole: true });
  if (!user) return jsonError("Unauthorized", 401);
  if (role !== "teacher") return jsonError("Teachers only", 403);
  const rl = checkRateLimit(`${user.id}:assessments-create`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Give the exam a title and choose a level.", 400);

  const { data: level } = await db.from("curriculum_levels").select("id, curriculum_id").eq("id", parsed.data.levelId).maybeSingle();
  if (!level) return jsonError("Level not found", 404);

  const { data, error } = await db.from("assessments").insert({
    owner_id: user.id, title: parsed.data.title, curriculum_id: level.curriculum_id, level_id: level.id,
  }).select("id").single();
  if (error) return jsonError(error.message, 500);
  return Response.json({ id: data.id });
}

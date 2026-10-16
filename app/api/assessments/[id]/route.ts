import { z } from "zod";
import { getViewer, jsonError } from "@/app/lib/learning/server";
import { assessmentDetail, assessmentQuestions, ownedAssessment } from "@/app/lib/learning/queries";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

export async function GET(_request: Request, ctx: RouteContext<"/api/assessments/[id]">) {
  const { id } = await ctx.params;
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:assessment-get`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const detail = await assessmentDetail(db, id, user.id);
  if (!detail) return jsonError("Not found", 404);
  return Response.json(detail);
}

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  publish: z.boolean().optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/assessments/[id]">) {
  const { id } = await ctx.params;
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:assessment-patch`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const a = await ownedAssessment(db, id, user.id);
  if (!a) return jsonError("Not found", 404);
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request", 400);

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.title) updates.title = parsed.data.title;

  if (parsed.data.publish) {
    // Publishing keeps only approved questions — drafts must be reviewed first.
    const questions = await assessmentQuestions(db, id);
    const pending = questions.filter((q) => q.status === "draft");
    if (pending.length) return jsonError(`Review ${pending.length} draft question${pending.length > 1 ? "s" : ""} first (approve or reject).`, 400);
    const approved = questions.filter((q) => q.status === "approved");
    if (!approved.length) return jsonError("Approve at least one question before publishing.", 400);
    const rejected = questions.filter((q) => q.status === "rejected").map((q) => q.id);
    if (rejected.length) await db.from("assessment_items").delete().eq("assessment_id", id).in("question_id", rejected);
    // Renumber so positions stay contiguous.
    await db.from("assessment_items").upsert(approved.map((q, i) => ({ assessment_id: id, question_id: q.id, position: i })));
    updates.status = "published";
  }

  const { error } = await db.from("assessments").update(updates).eq("id", id);
  if (error) return jsonError(error.message, 500);
  return Response.json(await assessmentDetail(db, id, user.id));
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/assessments/[id]">) {
  const { id } = await ctx.params;
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const a = await ownedAssessment(db, id, user.id);
  if (!a) return jsonError("Not found", 404);
  await db.from("assessments").delete().eq("id", id);
  return Response.json({ ok: true });
}

import { z } from "zod";
import { getViewer, jsonError } from "@/app/lib/learning/server";
import { assessmentDetail, ownedAssessment } from "@/app/lib/learning/queries";
import { appendItems, draftForAssessment, insertQuestions, levelKps } from "@/app/lib/learning/builder";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";
import { MAX_PER_DRAFT, MAX_PER_TYPE } from "@/app/lib/learning/limits";

const schema = z.object({
  kpIds: z.array(z.string().uuid()).min(1).max(60),
  counts: z.object({
    mcq: z.number().int().min(0).max(MAX_PER_TYPE).default(0),
    true_false: z.number().int().min(0).max(MAX_PER_TYPE).default(0),
    fill_blank: z.number().int().min(0).max(MAX_PER_TYPE).default(0),
  }),
  note: z.string().trim().max(500).optional(),
});

/** AI drafts questions for the chosen KPs; they land as "draft" for the teacher to review. */
export async function POST(request: Request, ctx: RouteContext<"/api/assessments/[id]/draft">) {
  const { id } = await ctx.params;
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:ai-draft`, LIMITS.ai);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const a = await ownedAssessment(db, id, user.id);
  if (!a) return jsonError("Not found", 404);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Choose at least one knowledge point.", 400);
  const { kpIds, counts, note } = parsed.data;
  const total = counts.mcq + counts.true_false + counts.fill_blank;
  if (total < 1 || total > MAX_PER_DRAFT) return jsonError(`Ask for between 1 and ${MAX_PER_DRAFT} questions at a time.`, 400);

  const kps = await levelKps(db, a.level_id, kpIds);
  if (!kps.length) return jsonError("Those knowledge points are not in this level.", 400);

  try {
    const drafted = await draftForAssessment(db, a, kps, counts, note);
    if (!drafted.length) return jsonError("The AI returned no usable questions — try again.", 502);
    const ids = await insertQuestions(db, {
      curriculumId: a.curriculum_id, levelId: a.level_id, userId: user.id, provenance: "ai_draft", status: "draft",
    }, drafted, new Map(kps.map((k) => [k.code, k.id])));
    await appendItems(db, id, ids);
    if (a.status === "published") await db.from("assessments").update({ status: "draft" }).eq("id", id);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Drafting failed", 502);
  }
  return Response.json(await assessmentDetail(db, id, user.id));
}

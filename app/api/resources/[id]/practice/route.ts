import { z } from "zod";
import { getViewer, jsonError } from "@/app/lib/learning/server";
import { viewableResource } from "@/app/lib/learning/resources";
import { draftQuestions } from "@/app/lib/learning/ai";
import { insertQuestions, levelKps } from "@/app/lib/learning/builder";
import { levelKpStates } from "@/app/lib/learning/mastery-store";
import { toStudentQuestion } from "@/app/lib/learning/queries";
import { MAX_PER_DRAFT, MAX_PER_TYPE } from "@/app/lib/learning/limits";
import { checkAiRateLimit, rateLimitError } from "@/app/lib/rate-limit";
import type { QuestionType } from "@/app/lib/learning/grading";

export const maxDuration = 120;

const schema = z.object({
  counts: z.object({
    mcq: z.number().int().min(0).max(MAX_PER_TYPE).default(0),
    true_false: z.number().int().min(0).max(MAX_PER_TYPE).default(0),
    fill_blank: z.number().int().min(0).max(MAX_PER_TYPE).default(0),
  }),
});

/**
 * A student (or teacher) builds a practice exam from a resource. Questions
 * are drafted from the resource text, tagged with its topics, and stored as
 * "ai_practice" — usable for self-practice, never offered in the teacher's
 * reviewed question bank. Answers are submitted through /api/practice, so
 * they update mastery exactly like any other practice set.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/resources/[id]/practice">) {
  const { id } = await ctx.params;
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = await checkAiRateLimit(`${user.id}:resource-practice`);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request", 400);
  const counts = parsed.data.counts;
  const total = counts.mcq + counts.true_false + counts.fill_blank;
  if (total < 1 || total > MAX_PER_DRAFT) return jsonError(`Ask for between 1 and ${MAX_PER_DRAFT} questions.`, 400);

  const r = await viewableResource(db, id, user.id);
  if (!r || r.status !== "ready" || !r.level_id || !r.content_text) return jsonError("This resource is not ready yet.", 404);

  const kps = await levelKps(db, r.level_id);
  const { data: level } = await db.from("curriculum_levels").select("curriculum_id").eq("id", r.level_id).single();
  try {
    const drafted = await draftQuestions({
      curriculum: "Teacher's class materials", level: r.title,
      kps: kps.map(({ code, name, description }) => ({ code, name, description })),
      counts: counts as Partial<Record<QuestionType, number>>,
      examples: [], avoid: [],
      source: { title: r.title, text: r.content_text },
    });
    if (!drafted.length) return jsonError("The AI returned no usable questions — try again.", 502);
    const ids = await insertQuestions(db, {
      curriculumId: level!.curriculum_id as string, levelId: r.level_id, userId: user.id, provenance: "ai_practice", status: "approved",
    }, drafted, new Map(kps.map((k) => [k.code, k.id])));

    const byId = new Map(drafted.map((d, i) => [ids[i], d]));
    const targets = await levelKpStates(db, user.id, r.level_id);
    return Response.json({
      levelId: r.level_id,
      levelName: r.title,
      curriculumName: "",
      targets: targets.map((t) => ({ kpId: t.kpId, name: t.name, mastery: t.mastery, attempts: t.attempts })),
      questions: ids.map((qid) => toStudentQuestion({ id: qid, type: byId.get(qid)!.type, prompt: byId.get(qid)!.prompt, options: byId.get(qid)!.options })),
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not create the practice exam", 502);
  }
}

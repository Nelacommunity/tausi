import { z } from "zod";
import { getViewer, jsonError } from "@/app/lib/learning/server";
import { assessmentDetail, ownedAssessment, QUESTION_COLUMNS, type QuestionRow } from "@/app/lib/learning/queries";
import { draftForAssessment, insertQuestions, levelKps, swapItem } from "@/app/lib/learning/builder";
import { checkAiRateLimit, rateLimitError } from "@/app/lib/rate-limit";

const schema = z.object({ assessmentId: z.string().uuid(), note: z.string().trim().max(300).optional() });

/** Replace one question with a fresh AI draft on the same KPs and type. */
export async function POST(request: Request, ctx: RouteContext<"/api/questions/[id]/regenerate">) {
  const { id } = await ctx.params;
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = await checkAiRateLimit(`${user.id}:ai-draft`);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request", 400);
  const a = await ownedAssessment(db, parsed.data.assessmentId, user.id);
  if (!a) return jsonError("Not found", 404);

  const { data: q } = await db.from("questions").select(QUESTION_COLUMNS).eq("id", id).maybeSingle();
  if (!q) return jsonError("Not found", 404);
  const question = q as unknown as QuestionRow;
  const kps = await levelKps(db, a.level_id, question.question_kps.map((k) => k.kp_id));
  if (!kps.length) return jsonError("Question has no knowledge points", 400);

  try {
    const [drafted] = await draftForAssessment(db, a, kps, { [question.type]: 1 }, parsed.data.note);
    if (!drafted) return jsonError("The AI returned no usable question — try again.", 502);
    const kpIdByCode = new Map(kps.map((k) => [k.code, k.id]));

    if (question.created_by === user.id) {
      await db.from("questions").update({
        type: drafted.type, prompt: drafted.prompt, options: drafted.options, answer: drafted.answer,
        difficulty: drafted.difficulty, provenance: "ai_draft", status: "draft", updated_at: new Date().toISOString(),
      }).eq("id", id);
      await db.from("question_kps").delete().eq("question_id", id);
      await db.from("question_kps").insert(drafted.kpCodes.map((c) => ({ question_id: id, kp_id: kpIdByCode.get(c)! })));
    } else {
      const [newId] = await insertQuestions(db, {
        curriculumId: a.curriculum_id, levelId: a.level_id, userId: user.id, provenance: "ai_draft", status: "draft",
      }, [drafted], kpIdByCode);
      await swapItem(db, a.id, id, newId);
    }
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Regeneration failed", 502);
  }
  return Response.json(await assessmentDetail(db, a.id, user.id));
}

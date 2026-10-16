import { z } from "zod";
import { getViewer, jsonError } from "@/app/lib/learning/server";
import { assessmentDetail, ownedAssessment, QUESTION_COLUMNS, type QuestionRow } from "@/app/lib/learning/queries";
import { validateDrafted } from "@/app/lib/learning/ai";
import { insertQuestions, levelKps, swapItem } from "@/app/lib/learning/builder";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

const schema = z.object({
  assessmentId: z.string().uuid(),
  status: z.enum(["draft", "approved", "rejected"]).optional(),
  content: z.object({
    type: z.enum(["mcq", "true_false", "fill_blank"]),
    prompt: z.string(),
    options: z.array(z.string()),
    answer: z.string(),
    difficulty: z.number().int().min(1).max(3),
    kpIds: z.array(z.string().uuid()).min(1),
  }).optional(),
});

/**
 * Teacher review of one question inside an exam: approve / reject, or edit.
 * Editing an AI draft marks it "ai_edited". Editing a shared bank question
 * makes the teacher's own copy (provenance "teacher") and swaps it into the exam.
 */
export async function PATCH(request: Request, ctx: RouteContext<"/api/questions/[id]">) {
  const { id } = await ctx.params;
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:question-patch`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request", 400);
  const { assessmentId, status, content } = parsed.data;

  const a = await ownedAssessment(db, assessmentId, user.id);
  if (!a) return jsonError("Not found", 404);
  const { data: inExam } = await db.from("assessment_items").select("question_id").eq("assessment_id", assessmentId).eq("question_id", id).maybeSingle();
  if (!inExam) return jsonError("Question is not in this exam", 404);
  const { data: q } = await db.from("questions").select(QUESTION_COLUMNS).eq("id", id).single();
  const question = q as unknown as QuestionRow;
  const owned = question.created_by === user.id;

  if (content) {
    const kps = await levelKps(db, a.level_id, content.kpIds);
    const codeById = new Map(kps.map((k) => [k.id, k.code]));
    const valid = validateDrafted(
      { ...content, kpCodes: content.kpIds.map((k) => codeById.get(k)).filter(Boolean) },
      new Set(kps.map((k) => k.code)),
    );
    if (!valid) {
      return jsonError(content.type === "mcq"
        ? "A multiple-choice question needs 4 different options and the answer must match one of them."
        : "Check the prompt, answer and knowledge points.", 400);
    }

    if (owned) {
      const { error } = await db.from("questions").update({
        type: valid.type, prompt: valid.prompt, options: valid.options, answer: valid.answer, difficulty: valid.difficulty,
        provenance: question.provenance === "ai_draft" ? "ai_edited" : question.provenance,
        status: status ?? "approved", updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) return jsonError(error.message, 500);
      await db.from("question_kps").delete().eq("question_id", id);
      await db.from("question_kps").insert(kps.map((k) => ({ question_id: id, kp_id: k.id })));
    } else {
      const [newId] = await insertQuestions(db, {
        curriculumId: a.curriculum_id, levelId: a.level_id, userId: user.id, provenance: "teacher", status: "approved",
      }, [valid], new Map(kps.map((k) => [k.code, k.id])));
      await swapItem(db, assessmentId, id, newId);
    }
  } else if (status) {
    if (!owned) return jsonError("Bank questions are already approved — remove it from the exam instead.", 400);
    await db.from("questions").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  }

  return Response.json(await assessmentDetail(db, assessmentId, user.id));
}

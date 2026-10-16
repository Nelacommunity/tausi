// Server-side helpers for the teacher-in-the-loop exam builder.
import type { SupabaseClient } from "@supabase/supabase-js";
import { draftQuestions, type DraftedQuestion, type KpBrief } from "./ai";
import { assessmentQuestions, nextPosition } from "./queries";
import type { QuestionType } from "./grading";
import type { Provenance } from "./types";

export interface LevelKp extends KpBrief { id: string }

/** KPs of a level, optionally restricted to `ids`. */
export async function levelKps(db: SupabaseClient, levelId: string, ids?: string[]): Promise<LevelKp[]> {
  let q = db.from("knowledge_points").select("id, code, name, description").eq("level_id", levelId).order("ordinal");
  if (ids?.length) q = q.in("id", ids);
  const { data } = await q;
  return (data ?? []) as LevelKp[];
}

/** Ask the AI for drafts, using approved bank questions on the same KPs as style examples. */
export async function draftForAssessment(
  db: SupabaseClient,
  a: { id: string; curricula: { name: string }; curriculum_levels: { name: string } },
  kps: LevelKp[],
  counts: Partial<Record<QuestionType, number>>,
  note?: string,
  source?: { title: string; text: string },
): Promise<DraftedQuestion[]> {
  const { data: ex } = await db
    .from("question_kps")
    .select("questions!inner(type, prompt, options, answer, status)")
    .in("kp_id", kps.map((k) => k.id))
    .eq("questions.status", "approved")
    .limit(40);
  const examples = ((ex ?? []) as unknown as { questions: { type: string; prompt: string; options: string[]; answer: string } }[])
    .map((r) => r.questions)
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);
  const existing = await assessmentQuestions(db, a.id);
  return draftQuestions({
    curriculum: a.curricula.name,
    level: a.curriculum_levels.name,
    kps: kps.map(({ code, name, description }) => ({ code, name, description })),
    counts, examples,
    avoid: existing.map((q) => q.prompt),
    teacherNote: note,
    source,
  });
}

export async function insertQuestions(
  db: SupabaseClient,
  ctx: { curriculumId: string; levelId: string; userId: string; provenance: Provenance; status: "draft" | "approved" },
  drafted: DraftedQuestion[],
  kpIdByCode: Map<string, string>,
): Promise<string[]> {
  if (!drafted.length) return [];
  const rows = drafted.map((d) => ({
    id: crypto.randomUUID(),
    curriculum_id: ctx.curriculumId, level_id: ctx.levelId, type: d.type, prompt: d.prompt,
    options: d.options, answer: d.answer, difficulty: d.difficulty,
    provenance: ctx.provenance, status: ctx.status, created_by: ctx.userId,
  }));
  const { error } = await db.from("questions").insert(rows);
  if (error) throw new Error(error.message);
  const links = drafted.flatMap((d, i) => d.kpCodes.map((c) => ({ question_id: rows[i].id, kp_id: kpIdByCode.get(c)! })).filter((l) => l.kp_id));
  if (links.length) await db.from("question_kps").insert(links);
  return rows.map((r) => r.id);
}

export async function appendItems(db: SupabaseClient, assessmentId: string, questionIds: string[]) {
  if (!questionIds.length) return;
  const start = await nextPosition(db, assessmentId);
  const { error } = await db.from("assessment_items").insert(
    questionIds.map((qid, i) => ({ assessment_id: assessmentId, question_id: qid, position: start + i })),
  );
  if (error) throw new Error(error.message);
}

/** Replace one question with another at the same position in an assessment. */
export async function swapItem(db: SupabaseClient, assessmentId: string, oldId: string, newId: string) {
  await db.from("assessment_items").update({ question_id: newId }).eq("assessment_id", assessmentId).eq("question_id", oldId);
}

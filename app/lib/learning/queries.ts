import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssessmentDetail, CurriculumNode, StudentQuestion, TeacherQuestion } from "./types";
import type { QuestionType } from "./grading";

export interface QuestionRow {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  answer: string;
  difficulty: number;
  provenance: TeacherQuestion["provenance"];
  status: TeacherQuestion["status"];
  created_by: string | null;
  question_kps: { kp_id: string }[];
}

export const QUESTION_COLUMNS = "id, type, prompt, options, answer, difficulty, provenance, status, created_by, question_kps(kp_id)";

export function toTeacherQuestion(row: QuestionRow, userId: string): TeacherQuestion {
  return {
    id: row.id, type: row.type, prompt: row.prompt, options: row.options ?? [], answer: row.answer,
    difficulty: row.difficulty, provenance: row.provenance, status: row.status,
    kpIds: row.question_kps.map((k) => k.kp_id),
    editable: row.created_by === userId,
  };
}

export function toStudentQuestion(row: Pick<QuestionRow, "id" | "type" | "prompt" | "options">): StudentQuestion {
  return { id: row.id, type: row.type, prompt: row.prompt, options: row.options ?? [] };
}

/** Public curricula plus the viewer's own private ones (their class materials). */
export async function curriculumTree(db: SupabaseClient, viewerId: string): Promise<CurriculumNode[]> {
  const { data: curricula } = await db
    .from("curricula")
    .select("id, slug, name, subject, description, curriculum_levels(id, code, name, ordinal, knowledge_points(id, code, name, description, category, is_core, ordinal))")
    .or(`owner_id.is.null,owner_id.eq.${viewerId}`)
    .order("name");
  const { data: counts } = await db.from("question_kps").select("kp_id, questions!inner(status)").eq("questions.status", "approved");
  const perKp = new Map<string, number>();
  for (const r of counts ?? []) perKp.set(r.kp_id as string, (perKp.get(r.kp_id as string) ?? 0) + 1);

  type L = { id: string; code: string; name: string; ordinal: number; knowledge_points: { id: string; code: string; name: string; description: string; category: string; is_core: boolean; ordinal: number }[] };
  return (curricula ?? []).map((c) => ({
    id: c.id, slug: c.slug, name: c.name, subject: c.subject, description: c.description,
    levels: ((c.curriculum_levels ?? []) as L[])
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((l) => ({
        id: l.id, code: l.code, name: l.name,
        kps: l.knowledge_points
          .sort((a, b) => a.ordinal - b.ordinal)
          .map((k) => ({
            id: k.id, code: k.code, name: k.name, description: k.description, category: k.category,
            isCore: k.is_core, questionCount: perKp.get(k.id) ?? 0,
          })),
      })),
  }));
}

/** The assessment if `userId` owns it, else null. */
export async function ownedAssessment(db: SupabaseClient, id: string, userId: string) {
  const { data } = await db
    .from("assessments")
    .select("id, title, status, owner_id, curriculum_id, level_id, curricula(name), curriculum_levels(name, code)")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.owner_id !== userId) return null;
  return data as unknown as {
    id: string; title: string; status: "draft" | "published"; owner_id: string;
    curriculum_id: string; level_id: string;
    curricula: { name: string }; curriculum_levels: { name: string; code: string };
  };
}

/** Questions of an assessment in order. */
export async function assessmentQuestions(db: SupabaseClient, assessmentId: string): Promise<QuestionRow[]> {
  const { data } = await db
    .from("assessment_items")
    .select(`position, questions(${QUESTION_COLUMNS})`)
    .eq("assessment_id", assessmentId)
    .order("position");
  return ((data ?? []) as unknown as { questions: QuestionRow }[]).map((r) => r.questions).filter(Boolean);
}

export async function assessmentDetail(db: SupabaseClient, id: string, userId: string): Promise<AssessmentDetail | null> {
  const a = await ownedAssessment(db, id, userId);
  if (!a) return null;
  const rows = await assessmentQuestions(db, id);
  return {
    id: a.id, title: a.title, status: a.status, curriculumId: a.curriculum_id, levelId: a.level_id,
    curriculumName: a.curricula.name, levelName: a.curriculum_levels.name,
    questions: rows.map((r) => toTeacherQuestion(r, userId)),
  };
}

export async function nextPosition(db: SupabaseClient, assessmentId: string): Promise<number> {
  const { data } = await db.from("assessment_items").select("position").eq("assessment_id", assessmentId)
    .order("position", { ascending: false }).limit(1);
  return ((data?.[0]?.position as number | undefined) ?? -1) + 1;
}

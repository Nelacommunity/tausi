import type { SupabaseClient } from "@supabase/supabase-js";
import { explainQuestions, type ExplainLang } from "./ai";
import type { QuestionType } from "./grading";

export interface ReviewItem {
  questionId: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  response: string;
  answer: string;
  isCorrect: boolean;
  kps: { id: string; name: string }[];
}

interface Row {
  question_id: string;
  response: string;
  is_correct: boolean;
  questions: {
    type: QuestionType; prompt: string; options: string[]; answer: string;
    question_kps: { knowledge_points: { id: string; name: string } }[];
  };
}

const COLUMNS = "question_id, response, is_correct, created_at, questions(type, prompt, options, answer, question_kps(knowledge_points(id, name)))";

function toItems(rows: Row[], order?: string[]): ReviewItem[] {
  const items = rows.map((r) => ({
    questionId: r.question_id, type: r.questions.type, prompt: r.questions.prompt, options: r.questions.options ?? [],
    response: r.response, answer: r.questions.answer, isCorrect: r.is_correct,
    kps: r.questions.question_kps.map((k) => k.knowledge_points),
  }));
  if (!order) return items;
  const pos = new Map(order.map((id, i) => [id, i]));
  return items.sort((a, b) => (pos.get(a.questionId) ?? 0) - (pos.get(b.questionId) ?? 0));
}

export async function participantReview(db: SupabaseClient, participantId: string, order: string[]): Promise<ReviewItem[]> {
  const { data } = await db.from("answers").select(COLUMNS).eq("participant_id", participantId);
  return toItems((data ?? []) as unknown as Row[], order);
}

/** The most recent practice answers for these questions. */
export async function practiceReview(db: SupabaseClient, userId: string, questionIds: string[]): Promise<ReviewItem[]> {
  const { data } = await db.from("answers").select(COLUMNS).eq("user_id", userId).eq("source", "practice")
    .in("question_id", questionIds).order("created_at", { ascending: false });
  const seen = new Set<string>();
  const latest = ((data ?? []) as unknown as Row[]).filter((r) => !seen.has(r.question_id) && seen.add(r.question_id));
  return toItems(latest, questionIds);
}

export interface CachedExplanation { explanation: string; culturalNote: string | null }

/**
 * Explanations for these questions in `lang`: read from the cache, generate
 * the missing ones in a single AI call, store them, return all.
 */
export async function explanationsFor(db: SupabaseClient, questionIds: string[], lang: ExplainLang): Promise<Record<string, CachedExplanation>> {
  const out: Record<string, CachedExplanation> = {};
  if (!questionIds.length) return out;
  const { data: cached } = await db.from("question_explanations").select("question_id, explanation, cultural_note")
    .eq("lang", lang).in("question_id", questionIds);
  for (const c of cached ?? []) out[c.question_id] = { explanation: c.explanation, culturalNote: c.cultural_note };

  const missing = questionIds.filter((id) => !out[id]);
  if (!missing.length) return out;

  const { data: qs } = await db.from("questions")
    .select("id, prompt, options, answer, question_kps(knowledge_points(name))").in("id", missing);
  type Q = { id: string; prompt: string; options: string[]; answer: string; question_kps: { knowledge_points: { name: string } }[] };
  const input = ((qs ?? []) as unknown as Q[]).map((q) => ({
    id: q.id, prompt: q.prompt, options: q.options ?? [], answer: q.answer,
    kps: q.question_kps.map((k) => k.knowledge_points.name),
  }));
  // Batches of 15 keep each response well inside the output limit.
  for (let i = 0; i < input.length; i += 15) {
    const generated = await explainQuestions(input.slice(i, i + 15), lang);
    if (!generated.length) continue;
    await db.from("question_explanations").upsert(generated.map((g) => ({
      question_id: g.id, lang, explanation: g.explanation, cultural_note: g.culturalNote,
    })), { onConflict: "question_id,lang", ignoreDuplicates: true });
    for (const g of generated) out[g.id] = { explanation: g.explanation, culturalNote: g.culturalNote };
  }
  return out;
}

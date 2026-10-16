// Aggregations for teacher reports (session and class views).
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AnswerFact {
  sessionId: string | null;
  participantId: string | null;
  userId: string | null;
  questionId: string;
  response: string;
  isCorrect: boolean;
  kps: { id: string; name: string }[];
}

export interface QuestionStat {
  questionId: string;
  prompt: string;
  answer: string;
  attempts: number;
  accuracy: number;
  commonWrong: string | null;
}

export interface KpStat { kpId: string; name: string; attempts: number; accuracy: number }

/** Answers with their question's KPs. `filter` narrows the query (by session or users). */
export async function answerFacts(
  db: SupabaseClient,
  filter: { sessionIds?: string[]; userIds?: string[] },
): Promise<{ facts: AnswerFact[]; prompts: Map<string, { prompt: string; answer: string }> }> {
  const facts: AnswerFact[] = [];
  const prompts = new Map<string, { prompt: string; answer: string }>();
  if (filter.sessionIds && !filter.sessionIds.length) return { facts, prompts };
  if (filter.userIds && !filter.userIds.length) return { facts, prompts };
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let q = db.from("answers")
      .select("session_id, participant_id, user_id, question_id, response, is_correct, questions(prompt, answer, question_kps(knowledge_points(id, name)))")
      .order("created_at")
      .range(from, from + PAGE - 1);
    if (filter.sessionIds) q = q.in("session_id", filter.sessionIds);
    if (filter.userIds) q = q.in("user_id", filter.userIds);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    type Row = { session_id: string | null; participant_id: string | null; user_id: string | null; question_id: string; response: string; is_correct: boolean; questions: { prompt: string; answer: string; question_kps: { knowledge_points: { id: string; name: string } }[] } };
    for (const r of (data ?? []) as unknown as Row[]) {
      prompts.set(r.question_id, { prompt: r.questions.prompt, answer: r.questions.answer });
      facts.push({
        sessionId: r.session_id, participantId: r.participant_id, userId: r.user_id, questionId: r.question_id,
        response: r.response, isCorrect: r.is_correct,
        kps: r.questions.question_kps.map((k) => k.knowledge_points),
      });
    }
    if ((data ?? []).length < PAGE) break;
  }
  return { facts, prompts };
}

export function questionStats(facts: AnswerFact[], prompts: Map<string, { prompt: string; answer: string }>): QuestionStat[] {
  const by = new Map<string, AnswerFact[]>();
  for (const f of facts) {
    const list = by.get(f.questionId) ?? [];
    list.push(f);
    by.set(f.questionId, list);
  }
  return [...by].map(([qid, list]) => {
    const wrong = new Map<string, number>();
    for (const f of list) if (!f.isCorrect && f.response) wrong.set(f.response, (wrong.get(f.response) ?? 0) + 1);
    const commonWrong = [...wrong].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return {
      questionId: qid, prompt: prompts.get(qid)?.prompt ?? "", answer: prompts.get(qid)?.answer ?? "",
      attempts: list.length, accuracy: list.filter((f) => f.isCorrect).length / list.length, commonWrong,
    };
  });
}

export function kpStats(facts: AnswerFact[]): KpStat[] {
  const by = new Map<string, { name: string; n: number; ok: number }>();
  for (const f of facts) for (const kp of f.kps) {
    const s = by.get(kp.id) ?? { name: kp.name, n: 0, ok: 0 };
    s.n++; if (f.isCorrect) s.ok++;
    by.set(kp.id, s);
  }
  return [...by].map(([kpId, s]) => ({ kpId, name: s.name, attempts: s.n, accuracy: s.ok / s.n }));
}

/** Five buckets of percentage scores: 0–19, 20–39, 40–59, 60–79, 80–100. */
export function distribution(percentages: number[]): number[] {
  const buckets = [0, 0, 0, 0, 0];
  for (const p of percentages) buckets[Math.min(4, Math.floor(p * 5))]++;
  return buckets;
}

export function displayNameOf(p: { display_name?: string | null; full_name?: string | null; email?: string | null }): string {
  return p.display_name || p.full_name || p.email?.split("@")[0] || "Student";
}

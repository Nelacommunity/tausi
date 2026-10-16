import type { SupabaseClient } from "@supabase/supabase-js";
import { computeMastery, type AnswerEvent, type KpState } from "../mastery.ts";

interface AnswerRow {
  is_correct: boolean;
  created_at: string;
  questions: { question_kps: { kp_id: string }[] } | null;
}

/** All of a student's answers grouped by knowledge point. */
async function answersByKp(db: SupabaseClient, userId: string): Promise<Map<string, AnswerEvent[]>> {
  const byKp = new Map<string, AnswerEvent[]>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("answers")
      .select("is_correct, created_at, questions!inner(question_kps(kp_id))")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as AnswerRow[];
    for (const row of rows) {
      for (const { kp_id } of row.questions?.question_kps ?? []) {
        const list = byKp.get(kp_id) ?? [];
        list.push({ isCorrect: row.is_correct, at: row.created_at });
        byKp.set(kp_id, list);
      }
    }
    if (rows.length < PAGE) break;
  }
  return byKp;
}

/**
 * Recompute and store kp_mastery for one student from their full answer
 * history (see app/lib/mastery.ts for the formula). Cheap enough to run after
 * every submission: a student has at most a few thousand answers.
 */
export async function recomputeMastery(db: SupabaseClient, userId: string, now = Date.now()): Promise<void> {
  const byKp = await answersByKp(db, userId);
  if (byKp.size === 0) return;
  const rows = [...byKp].map(([kpId, events]) => ({
    user_id: userId,
    kp_id: kpId,
    mastery: computeMastery(events, now),
    attempts: events.length,
    updated_at: new Date(now).toISOString(),
  }));
  const { error } = await db.from("kp_mastery").upsert(rows, { onConflict: "user_id,kp_id" });
  if (error) throw new Error(error.message);
}

/** KP states for one level (every KP, including unpractised ones). */
export async function levelKpStates(db: SupabaseClient, userId: string, levelId: string): Promise<KpState[]> {
  const { data: kps } = await db
    .from("knowledge_points")
    .select("id, code, name, is_core, ordinal")
    .eq("level_id", levelId)
    .order("ordinal");
  const ids = (kps ?? []).map((k) => k.id);
  const { data: mastery } = ids.length
    ? await db.from("kp_mastery").select("kp_id, mastery, attempts").eq("user_id", userId).in("kp_id", ids)
    : { data: [] };
  const m = new Map((mastery ?? []).map((r) => [r.kp_id as string, r]));
  return (kps ?? []).map((k) => ({
    kpId: k.id,
    code: k.code,
    name: k.name,
    isCore: k.is_core,
    mastery: (m.get(k.id)?.mastery as number | undefined) ?? 0.5,
    attempts: (m.get(k.id)?.attempts as number | undefined) ?? 0,
  }));
}

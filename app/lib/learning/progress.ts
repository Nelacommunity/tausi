import type { SupabaseClient } from "@supabase/supabase-js";
import { computeReadiness, type KpState, type Readiness } from "../mastery.ts";
import { levelKpStates } from "./mastery-store.ts";

export interface LevelProgress {
  levelId: string;
  levelName: string;
  curriculumName: string;
  kps: KpState[];
  readiness: Readiness;
}

/** Every curriculum level the student has practised, with KP states and readiness. */
export async function studentLevels(db: SupabaseClient, userId: string): Promise<LevelProgress[]> {
  const { data } = await db
    .from("kp_mastery")
    .select("knowledge_points(level_id, curriculum_levels(id, name, ordinal, curricula(name)))")
    .eq("user_id", userId);
  type Row = { knowledge_points: { level_id: string; curriculum_levels: { id: string; name: string; ordinal: number; curricula: { name: string } } } };
  const levels = new Map<string, Row["knowledge_points"]["curriculum_levels"]>();
  for (const r of (data ?? []) as unknown as Row[]) levels.set(r.knowledge_points.level_id, r.knowledge_points.curriculum_levels);

  const out: LevelProgress[] = [];
  for (const [levelId, l] of [...levels].sort((a, b) => a[1].curricula.name.localeCompare(b[1].curricula.name) || a[1].ordinal - b[1].ordinal)) {
    const kps = await levelKpStates(db, userId, levelId);
    out.push({ levelId, levelName: l.name, curriculumName: l.curricula.name, kps, readiness: computeReadiness(kps) });
  }
  return out;
}

export interface SessionResult {
  code: string;
  title: string;
  mode: string;
  status: string;
  date: string;
  correct: number;
  total: number;
  submitted: boolean;
}

/** Live sessions a student took part in, newest first. */
export async function studentSessions(db: SupabaseClient, userId: string, sessionIds?: string[]): Promise<SessionResult[]> {
  let q = db.from("session_participants")
    .select("id, submitted_at, joined_at, live_sessions(id, join_code, mode, status, started_at, assessments(title, assessment_items(count)))")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(30);
  if (sessionIds) q = q.in("session_id", sessionIds);
  const { data } = await q;
  type Row = { id: string; submitted_at: string | null; joined_at: string; live_sessions: { id: string; join_code: string; mode: string; status: string; started_at: string | null; assessments: { title: string; assessment_items: { count: number }[] } } };
  const rows = (data ?? []) as unknown as Row[];
  const ids = rows.map((r) => r.id);
  const { data: ans } = ids.length
    ? await db.from("answers").select("participant_id, is_correct").in("participant_id", ids)
    : { data: [] };
  const correct = new Map<string, number>();
  for (const a of ans ?? []) if (a.is_correct) correct.set(a.participant_id as string, (correct.get(a.participant_id as string) ?? 0) + 1);
  return rows.map((r) => ({
    code: r.live_sessions.join_code, title: r.live_sessions.assessments.title, mode: r.live_sessions.mode,
    status: r.live_sessions.status, date: r.live_sessions.started_at ?? r.joined_at,
    correct: correct.get(r.id) ?? 0, total: r.live_sessions.assessments.assessment_items?.[0]?.count ?? 0,
    submitted: !!r.submitted_at,
  }));
}

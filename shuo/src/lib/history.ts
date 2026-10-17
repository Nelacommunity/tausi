import { currentUser, supabase } from './supabase';

export type ActivityKind = 'lesson' | 'voice' | 'speaking' | 'chat' | 'pronunciation' | 'reading' | 'writing' | 'mistakes';

export interface Activity {
  id: string;
  kind: ActivityKind;
  title: string;
  score: number | null;
  xp: number;
  details: Record<string, unknown>;
  created_at: string;
}

/**
 * Record a finished activity in the student's learning history
 * (shuo_activity). Fire-and-forget: a failed write never interrupts practice.
 */
export function logActivity(kind: ActivityKind, title: string, opts: { score?: number; xp?: number; details?: Record<string, unknown> } = {}) {
  const user = currentUser();
  if (!user) return;
  supabase.from('shuo_activity').insert({
    user_id: user.id,
    kind,
    title: title.slice(0, 200),
    score: opts.score === undefined ? null : Math.max(0, Math.min(100, Math.round(opts.score))),
    xp: Math.max(0, Math.round(opts.xp ?? 0)),
    details: opts.details ?? {},
  }).then(({ error }) => { if (error) console.warn('[shuo] history not saved:', error.message); });
}

/** A page of history, newest first. */
export async function loadHistory(before?: string, limit = 50): Promise<Activity[]> {
  const user = currentUser();
  if (!user) return [];
  let q = supabase.from('shuo_activity').select('id, kind, title, score, xp, details, created_at')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit);
  if (before) q = q.lt('created_at', before);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Activity[];
}

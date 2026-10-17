import { useSyncExternalStore } from 'react';
import { currentUser, supabase } from './supabase';

/**
 * Persisted store usable from React via `.use()`.
 *
 * - Cached in localStorage per signed-in user (so two students sharing a
 *   device never see each other's progress), for instant start-up.
 * - Stores created with `{ sync: true }` are also saved to Supabase
 *   (`shuo_state`, one row per store), so progress follows the student
 *   across devices. `initCloudSync()` pulls them once at start-up; after that
 *   every change is pushed (debounced).
 */
interface Synced { key: string; get: () => unknown; load: (v: unknown) => void }
const synced: Synced[] = [];

export function persisted<T>(key: string, initial: T, opts: { sync?: boolean } = {}) {
  const storageKey = `shuo:${currentUser()?.id ?? 'anon'}:${key}`;
  const merge = (loaded: unknown): T =>
    initial && typeof initial === 'object' && !Array.isArray(initial)
      ? ({ ...initial, ...(loaded as object) } as T)
      : (loaded as T);

  let state: T = initial;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw != null) state = merge(JSON.parse(raw));
  } catch {
    /* ignore corrupt / unavailable storage */
  }
  const listeners = new Set<() => void>();
  const writeLocal = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* quota exceeded etc. */
    }
  };

  const get = () => state;
  const set = (next: T | ((prev: T) => T)) => {
    state = typeof next === 'function' ? (next as (p: T) => T)(state) : next;
    writeLocal();
    listeners.forEach((l) => l());
    if (opts.sync) schedulePush(key, () => state);
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  };
  const use = () => useSyncExternalStore(subscribe, get, get);

  if (opts.sync) {
    synced.push({
      key,
      get,
      load: (v) => {
        state = merge(v);
        writeLocal();
        listeners.forEach((l) => l());
      },
    });
  }
  return { get, set, subscribe, use };
}

// ── Cloud sync ────────────────────────────────────────────────────────────
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function schedulePush(key: string, read: () => unknown) {
  const user = currentUser();
  if (!user) return;
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => {
    timers.delete(key);
    supabase.from('shuo_state')
      .upsert({ user_id: user.id, key, value: read(), updated_at: new Date().toISOString() })
      .then(({ error }) => { if (error) console.warn('[shuo] sync failed', key, error.message); });
  }, 1500));
}

/**
 * Pull the student's saved stores from Supabase. A store with no saved copy
 * yet is uploaded from this device (so progress made before syncing existed
 * isn't lost). Call once, after every store module has been imported.
 */
export async function initCloudSync(): Promise<void> {
  const user = currentUser();
  if (!user || !synced.length) return;
  const { data, error } = await supabase.from('shuo_state').select('key, value').eq('user_id', user.id);
  if (error) {
    console.warn('[shuo] could not load saved progress:', error.message);
    return;
  }
  const saved = new Map((data ?? []).map((r) => [r.key as string, r.value]));
  for (const s of synced) {
    if (saved.has(s.key)) s.load(saved.get(s.key));
    else schedulePush(s.key, s.get);
  }
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

import { useEffect, useState } from 'react';
import { ErrorBox, PageHeader, Spinner } from '../components/ui';
import { loadHistory, type Activity, type ActivityKind } from '../lib/history';
import { locale, useT } from '../lib/i18n';
import type { Dict } from '../locales/en';
import { errorText } from '../lib/gemini';

export const KIND_ICON: Record<ActivityKind, string> = {
  lesson: '📚', voice: '🎙️', speaking: '📊', chat: '💬', pronunciation: '🎵', reading: '📖', writing: '✍️', mistakes: '🎯',
};
const KINDS = Object.keys(KIND_ICON) as ActivityKind[];
const PAGE = 50;

/** The student's learning history, newest first, grouped by day. */
export default function History() {
  const T = useT();
  const [items, setItems] = useState<Activity[] | null>(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<ActivityKind | 'all'>('all');

  async function load(before?: string) {
    setBusy(true);
    setError(null);
    try {
      const page = await loadHistory(before, PAGE);
      setItems((prev) => (before ? [...(prev ?? []), ...page] : page));
      setMore(page.length === PAGE);
    } catch (e) {
      setError(`${T.history.notSaved} ${errorText(e)}`);
      setItems((prev) => prev ?? []);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = (items ?? []).filter((a) => kind === 'all' || a.kind === kind);
  const days = groupByDay(shown);

  return (
    <div>
      <PageHeader title={T.history.title} subtitle={T.history.subtitle} />
      <ErrorBox error={error} onRetry={() => load()} />

      <div className="segmented history-filters">
        <button className={kind === 'all' ? 'active' : ''} onClick={() => setKind('all')}>{T.history.all}</button>
        {KINDS.map((k) => (
          <button key={k} className={kind === k ? 'active' : ''} onClick={() => setKind(k)}>
            {KIND_ICON[k]} {T.history.kinds[k]}
          </button>
        ))}
      </div>

      {items === null ? (
        <Spinner label={T.history.loading} />
      ) : days.length === 0 ? (
        <section className="card empty">
          <div className="big-emoji">🗂️</div>
          <p className="muted">{T.history.empty}</p>
        </section>
      ) : (
        days.map((d) => (
          <div key={d.key} className="history-day">
            <div className="history-day-head">
              <h3>{dayLabel(d.date, T)}</h3>
              <span className="muted small">
                {T.history.activities(d.items.length)} · {T.history.totalXp(d.items.reduce((n, a) => n + (a.xp ?? 0), 0))}
              </span>
            </div>
            <section className="card history-list">
              {d.items.map((a) => <ActivityRow key={a.id} a={a} />)}
            </section>
          </div>
        ))
      )}

      {more && items && (
        <div className="row center">
          <button className="btn" disabled={busy} onClick={() => load(items[items.length - 1]?.created_at)}>
            {busy ? <span className="spinner sm" /> : null} {T.history.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}

export function ActivityRow({ a }: { a: Activity }) {
  const T = useT();
  const time = new Date(a.created_at).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="history-row">
      <span className="history-icon">{KIND_ICON[a.kind] ?? '•'}</span>
      <div className="history-body">
        <strong>{a.title}</strong>
        <span className="muted small">
          {T.history.kinds[a.kind] ?? a.kind} · {time}
          {detailText(a, T)}
          {a.xp ? ` · +${a.xp} XP` : ''}
        </span>
      </div>
      {a.score !== null && a.score !== undefined && (
        <span className={`history-score ${a.score >= 80 ? 'good' : a.score >= 50 ? 'mid' : 'low'}`}>{a.score}%</span>
      )}
    </div>
  );
}

function detailText(a: Activity, T: Dict) {
  const d = a.details ?? {};
  const num = (k: string) => (typeof d[k] === 'number' ? (d[k] as number) : undefined);
  const correct = num('correct');
  const total = num('total');
  if (correct !== undefined && total) return ` · ${T.history.correct(correct, total)}`;
  const seconds = num('seconds');
  if (seconds && (a.kind === 'voice' || a.kind === 'speaking')) return ` · ${T.history.minutes(Math.max(1, Math.round(seconds / 60)))}`;
  const mistakes = num('mistakes');
  if (mistakes !== undefined && a.kind === 'writing') return ` · ${T.history.mistakes(mistakes)}`;
  return '';
}

function groupByDay(items: Activity[]) {
  const out: { key: string; date: Date; items: Activity[] }[] = [];
  for (const a of items) {
    const date = new Date(a.created_at);
    const key = date.toDateString();
    const last = out[out.length - 1];
    if (last?.key === key) last.items.push(a);
    else out.push({ key, date, items: [a] });
  }
  return out;
}

function dayLabel(date: Date, T: Dict) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return T.history.today;
  if (date.toDateString() === yesterday.toDateString()) return T.history.yesterday;
  return date.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

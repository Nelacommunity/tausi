import { useEffect, useRef, useState } from 'react';
import { settingsStore } from '../lib/state';

export interface ShareableResult {
  kind: 'lesson' | 'speaking';
  title: string;
  /** 0–100 */
  score: number;
  details: Record<string, unknown>;
}

interface ClassOption { id: string; name: string }

async function send(result: ShareableResult, opts: { auto: boolean; classIds?: string[] }) {
  const res = await fetch('/api/shuo/results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...result, ...opts }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not send — try again.');
  return (data.sent ?? []) as ClassOption[];
}

/**
 * Sends a lesson score or speaking report to the student's teachers — the
 * way the student chose in Settings: automatically, or with a button.
 * Render it once per finished attempt (give it a fresh `key` per attempt).
 */
export function ShareResult({ result }: { result: ShareableResult }) {
  const { shareMode } = settingsStore.use();
  const [classes, setClasses] = useState<ClassOption[] | null>(null);
  const [target, setTarget] = useState('all');
  const [state, setState] = useState<{ status: 'idle' | 'sending' | 'sent' | 'error'; sentTo?: ClassOption[]; error?: string }>({ status: 'idle' });
  const autoSent = useRef(false);

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => (r.ok ? r.json() : { member: [] }))
      .then((d) => setClasses(d.member ?? []))
      .catch(() => setClasses([]));
  }, []);

  const submit = (auto: boolean, classIds?: string[]) => {
    setState({ status: 'sending' });
    send(result, { auto, classIds })
      .then((sentTo) => setState({ status: 'sent', sentTo }))
      .catch((e: Error) => setState({ status: 'error', error: e.message }));
  };

  // Automatic mode: send once, as soon as we know the student has a class.
  useEffect(() => {
    if (shareMode !== 'auto' || autoSent.current || !classes?.length) return;
    autoSent.current = true;
    submit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareMode, classes]);

  if (classes === null) return null;
  if (!classes.length) {
    return (
      <div className="share-panel">
        <span className="muted">Join a class in Tausi to share results with your teacher.</span>
        <a className="btn btn-sm" href="/learn">Join a class</a>
      </div>
    );
  }
  if (state.status === 'sent') {
    return (
      <div className="share-panel">
        <span>✓ Sent to your teacher{state.sentTo && state.sentTo.length > 1 ? 's' : ''}{state.sentTo?.length ? ` · ${state.sentTo.map((c) => c.name).join(', ')}` : ''}</span>
      </div>
    );
  }
  if (shareMode === 'auto' && state.status !== 'error') {
    return <div className="share-panel"><span className="muted">Sending to your teacher…</span></div>;
  }
  return (
    <div className="share-panel">
      {classes.length > 1 && (
        <select className="input" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Class">
          <option value="all">All my classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      <button className="btn btn-primary btn-sm" disabled={state.status === 'sending'}
        onClick={() => submit(false, target === 'all' ? undefined : [target])}>
        {state.status === 'sending' ? 'Sending…' : '📤 Send to teacher'}
      </button>
      {state.status === 'error' && <span className="small" style={{ color: 'var(--bad)' }}>{state.error}</span>}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useT } from "@/app/lib/language-context";
import type { PlayerState } from "@/app/lib/learning/live";
import type { ReviewItem } from "@/app/lib/learning/review";
import { api, ApiError, guestToken } from "@/app/components/learn/api";
import { QuestionInput } from "@/app/components/learn/QuestionInput";
import { ReviewList } from "@/app/components/learn/ReviewList";
import { useLiveUpdates } from "@/app/components/learn/useLiveUpdates";
import { Badge, Button, Card, ErrorNote, Field, inputClass, Spinner } from "@/app/components/learn/ui";

interface Review { title: string; mode: string; displayName: string; score: number; correct: number; total: number; signedIn: boolean; items: ReviewItem[] }

function remaining(startIso: string | null, seconds: number, skewMs: number, now: number) {
  if (!startIso) return null;
  return Math.max(0, Math.ceil((new Date(startIso).getTime() + seconds * 1000 - (now + skewMs)) / 1000));
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

const examKey = (code: string) => `tausi_exam_${code}`;

/** The student's phone screen for a live session: join, answer, see results, review. */
export function PlayScreen({ code }: { code: string }) {
  const L = useT().T.learn;
  const [token, setToken] = useState<string | null>(() => (typeof window === "undefined" ? null : guestToken.get(code)));
  const [state, setState] = useState<PlayerState | null>(null);
  const [skew, setSkew] = useState(0);
  const [fatal, setFatal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    api<PlayerState>(`/api/live/${code}`, { token })
      .then((s) => { setState(s); setSkew(new Date(s.session.serverNow).getTime() - Date.now()); })
      .catch((e: ApiError) => { if (e.status === 404) setFatal(L.noSession); });
  }, [code, token, L.noSession]);
  useEffect(() => { refresh(); }, [refresh]);

  const { ping } = useLiveUpdates({ code, sessionId: state?.session.id ?? null, refresh });

  if (fatal) return <Shell><Card className="text-center py-10"><p className="text-body">{fatal}</p><Link href="/join" className="text-teal text-sm mt-3 inline-block">{L.joinTitle}</Link></Card></Shell>;
  if (!state) return <Shell><div className="flex justify-center py-20 text-dim"><Spinner className="w-6 h-6" /></div></Shell>;

  const s = state.session;
  const me = state.me;

  if (!me) {
    if (s.status === "finished") return <Shell><Card className="text-center py-10 text-body">{L.sessionEnded}</Card></Shell>;
    return <Shell title={s.title}><JoinForm code={code} state={state} token={token} onJoined={(t) => { if (t) { guestToken.set(code, t); setToken(t); } ping(); refresh(); }} /></Shell>;
  }

  const reviewOpen = s.mode === "exam" ? me.submitted : s.status === "finished";
  if (reviewOpen) return <Shell title={s.title}><Results code={code} token={token} state={state} /></Shell>;

  return (
    <Shell title={s.title} name={me.displayName} score={s.mode === "game" ? me.score : undefined}>
      <ErrorNote message={error} />
      {s.status === "lobby" && (
        <Card className="text-center py-12 space-y-2">
          <p className="font-display text-3xl font-bold text-teal">{L.youreIn}</p>
          <p className="text-snow text-lg">{me.displayName}</p>
          <p className="text-sm text-dim flex items-center justify-center gap-2"><Spinner className="w-3.5 h-3.5" /> {L.waitingStart}</p>
        </Card>
      )}
      {s.mode === "game" && (s.status === "question" || s.status === "reveal") && state.question && (
        <GameQuestion key={state.question.id} code={code} token={token} state={state} skew={skew}
          onAnswered={() => { ping(); refresh(); }} onError={setError} />
      )}
      {s.mode === "exam" && s.status === "active" && state.questions && (
        <ExamPaper code={code} token={token} state={state} skew={skew} onSubmitted={() => { ping(); refresh(); }} onError={setError} />
      )}
      {s.mode === "exam" && s.status === "finished" && !me.submitted && (
        <ExamPaper code={code} token={token} state={state} skew={skew} onSubmitted={() => { ping(); refresh(); }} onError={setError} autoSubmit />
      )}
    </Shell>
  );
}

function Shell({ children, title, name, score }: { children: React.ReactNode; title?: string; name?: string; score?: number }) {
  return (
    <main className="min-h-screen bg-ink text-snow">
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <header className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/android-chrome-192x192.png" alt="Tausi" className="w-7 h-7 rounded-lg" />
          </Link>
          {title && <p className="text-sm font-semibold text-body truncate flex-1 text-center">{title}</p>}
          <span className="flex items-center gap-2 shrink-0 text-xs">
            {name && <span className="text-dim max-w-24 truncate">{name}</span>}
            {score !== undefined && <span className="font-mono font-bold text-gold">{score}</span>}
          </span>
        </header>
        {children}
      </div>
    </main>
  );
}

function JoinForm({ code, state, token, onJoined }: { code: string; state: PlayerState; token: string | null; onJoined: (token: string | null) => void }) {
  const L = useT().T.learn;
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needLogin = state.session.requireLogin && !state.signedIn;
  const next = encodeURIComponent(`/play/${code}`);

  if (needLogin) {
    return (
      <Card className="text-center py-10 space-y-4">
        <p className="text-body">{L.loginRequired}</p>
        <div className="flex justify-center gap-2">
          <Link href={`/login?next=${next}`} className="rounded-xl bg-gold text-on-gold font-semibold px-5 py-2.5 text-sm">{L.signIn}</Link>
          <Link href={`/signup?next=${next}`} className="rounded-xl border border-line px-5 py-2.5 text-sm">{L.signUp}</Link>
        </div>
      </Card>
    );
  }

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await api<{ token: string | null }>(`/api/live/${code}/join`, { method: "POST", json: { displayName: name }, token });
      onJoined(res.token);
    } catch (err) { setError((err as Error).message); setBusy(false); }
  };

  return (
    <Card>
      <form onSubmit={join} className="space-y-4">
        <p className="text-center font-mono text-2xl font-bold tracking-[0.25em] text-teal">{code}</p>
        <Field label={L.displayName}>
          <input className={`${inputClass} text-lg py-3`} value={name} onChange={(e) => setName(e.target.value)} placeholder={L.displayNamePh} maxLength={40} autoFocus required />
        </Field>
        <ErrorNote message={error} />
        <Button type="submit" variant="primary" className="w-full text-base py-3" disabled={busy || !name.trim()}>{busy && <Spinner />} {L.enter}</Button>
      </form>
    </Card>
  );
}

function GameQuestion({ code, token, state, skew, onAnswered, onError }: {
  code: string; token: string | null; state: PlayerState; skew: number; onAnswered: () => void; onError: (m: string | null) => void;
}) {
  const L = useT().T.learn;
  const s = state.session;
  const q = state.question!;
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const revealed = s.status === "reveal";
  const answered = !!state.myAnswer;
  const now = useNow(!revealed);
  const left = remaining(s.questionStartedAt, s.questionSeconds, skew, now);

  const send = async (response: string) => {
    if (answered || sending || !response.trim()) return;
    setSending(true); onError(null);
    try {
      await api(`/api/live/${code}/answer`, { method: "POST", json: { questionId: q.id, response }, token });
      onAnswered();
    } catch (e) { onError((e as Error).message); }
    setSending(false);
  };

  const shown = state.myAnswer?.response ?? value;
  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-dim">{L.questionOf(s.currentIndex + 1, s.questionCount)}</span>
        {!revealed && left !== null && <span className={`font-mono text-2xl font-bold ${left <= 5 ? "text-bad" : "text-snow"}`}>{left}</span>}
      </div>
      {!revealed && left !== null && (
        <div className="h-1 rounded-full bg-ink-3 overflow-hidden">
          <div className="h-full bg-teal transition-all duration-300" style={{ width: `${(left / s.questionSeconds) * 100}%` }} />
        </div>
      )}
      <p className="font-display text-xl sm:text-2xl font-bold leading-snug">{q.prompt}</p>
      <QuestionInput question={q} size="lg" value={shown}
        onChange={(v) => { setValue(v); if (q.type !== "fill_blank") send(v); }}
        disabled={answered || sending || left === 0}
        correctAnswer={revealed ? state.correctAnswer : undefined} />
      {q.type === "fill_blank" && !answered && !revealed && (
        <Button variant="primary" className="w-full py-3" onClick={() => send(value)} disabled={sending || !value.trim() || left === 0}>{L.enter}</Button>
      )}
      {!revealed && answered && <p className="text-center text-sm text-teal">{L.answerLocked} · {L.waitReveal}</p>}
      {!revealed && !answered && left === 0 && <p className="text-center text-sm text-gold">{L.timeUp}</p>}
      {revealed && (
        <div className={`rounded-xl px-4 py-3 text-center ${state.myAnswer?.isCorrect ? "bg-good/10 text-good" : "bg-bad/10 text-bad"}`}>
          <p className="font-display text-2xl font-bold">{state.myAnswer?.isCorrect ? L.correct : state.myAnswer ? L.incorrect : L.timeUp}</p>
          <p className="text-sm mt-1 text-body">
            {state.myAnswer?.points ? L.pointsN(state.myAnswer.points) : ""}
            {state.me?.rank ? ` · ${L.rankN(state.me.rank)}` : ""}
            {state.me && state.me.streak > 1 ? ` · ${L.streakN(state.me.streak)}` : ""}
          </p>
          {q.type === "fill_blank" && <p className="text-sm mt-1 text-snow">{L.correctAnswer}: {state.correctAnswer}</p>}
        </div>
      )}
    </Card>
  );
}

function ExamPaper({ code, token, state, skew, onSubmitted, onError, autoSubmit = false }: {
  code: string; token: string | null; state: PlayerState; skew: number; onSubmitted: () => void; onError: (m: string | null) => void; autoSubmit?: boolean;
}) {
  const L = useT().T.learn;
  const s = state.session;
  const questions = state.questions ?? [];
  // Answers are kept on the device until submitted, so a refresh loses nothing.
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(examKey(code)) ?? "{}"); } catch { return {}; }
  });
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const now = useNow(true);
  const left = remaining(s.startedAt, s.timeLimitSeconds, skew, now);

  useEffect(() => {
    try { localStorage.setItem(examKey(code), JSON.stringify(answers)); } catch { /* ignore */ }
  }, [answers, code]);

  const submitted = useRef(false);
  const submit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true;
    setBusy(true); onError(null);
    try {
      await api(`/api/live/${code}/submit`, {
        method: "POST", token,
        json: { responses: Object.entries(answers).map(([questionId, response]) => ({ questionId, response })) },
      });
      try { localStorage.removeItem(examKey(code)); } catch { /* ignore */ }
      onSubmitted();
    } catch (e) { submitted.current = false; onError((e as Error).message); setBusy(false); }
  }, [answers, code, token, onSubmitted, onError]);

  // Hand in automatically when time runs out or the teacher ends the exam.
  useEffect(() => {
    if (!autoSubmit && left !== 0) return;
    const t = setTimeout(submit, 0);
    return () => clearTimeout(t);
  }, [autoSubmit, left, submit]);

  const unanswered = questions.filter((q) => !answers[q.id]?.trim()).length;
  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-ink/95 backdrop-blur flex items-center justify-between border-b border-line">
        <span className="text-xs text-dim">{L.unanswered(unanswered)}</span>
        <span className={`font-mono text-xl font-bold ${left !== null && left < 60 ? "text-bad" : "text-snow"}`}>
          {left !== null ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : "—"}
        </span>
      </div>
      {questions.map((q, i) => (
        <Card key={q.id} className="space-y-3">
          <p className="text-sm sm:text-base text-snow leading-relaxed"><span className="text-dim mr-2">{i + 1}.</span>{q.prompt}</p>
          <QuestionInput question={q} value={answers[q.id] ?? ""} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} disabled={busy} />
        </Card>
      ))}
      <Card className="space-y-3 text-center">
        {confirm && <p className="text-sm text-body">{L.submitConfirm}</p>}
        <Button variant="primary" className="w-full py-3 text-base" disabled={busy}
          onClick={() => (confirm ? submit() : setConfirm(true))}>
          {busy ? <><Spinner /> {L.submitting}</> : confirm ? L.confirmAgain : L.submitAnswers}
        </Button>
      </Card>
    </div>
  );
}

function Results({ code, token, state }: { code: string; token: string | null; state: PlayerState }) {
  const L = useT().T.learn;
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Review>(`/api/live/${code}/review`, { token }).then(setReview).catch((e: Error) => setError(e.message));
  }, [code, token]);

  return (
    <div className="space-y-4">
      <Card className="text-center py-8 space-y-2">
        <p className="text-xs uppercase tracking-widest text-dim">{state.session.mode === "game" ? L.gameOver : L.submittedTitle}</p>
        {review && <p className="font-display text-3xl font-bold">{L.scoreOf(review.correct, review.total)}</p>}
        {state.session.mode === "game" && state.me && (
          <p className="text-sm text-body">{state.me.score} · {state.me.rank ? L.rankN(state.me.rank) : ""}</p>
        )}
        {state.leaderboard && state.leaderboard.length > 0 && (
          <ol className="max-w-xs mx-auto pt-3 space-y-1 text-left">
            {state.leaderboard.slice(0, 3).map((p, i) => (
              <li key={p.participantId} className={`flex justify-between text-sm ${p.participantId === state.me?.participantId ? "text-teal font-semibold" : ""}`}>
                <span><span className="text-gold font-bold mr-2">{i + 1}</span>{p.name}</span><span className="font-mono">{p.score}</span>
              </li>
            ))}
          </ol>
        )}
        <div className="pt-3">
          {state.signedIn
            ? <Link href="/learn" className="inline-flex rounded-xl bg-gold text-on-gold font-semibold px-5 py-2.5 text-sm">{L.seeWeakAreas}</Link>
            : <p className="text-xs text-dim">{L.createAccountHint} <Link href="/signup" className="text-teal">{L.signUp}</Link></p>}
        </div>
      </Card>
      <ErrorNote message={error} />
      {review ? (
        <>
          <h2 className="font-display text-lg font-bold">{L.reviewTitle}</h2>
          <ReviewList items={review.items} code={code} token={token} />
        </>
      ) : !error && <div className="flex justify-center py-6 text-dim"><Spinner /></div>}
      <Badge>{code}</Badge>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useT } from "@/app/lib/language-context";
import type { SessionInfo } from "@/app/lib/learning/live";
import { api } from "@/app/components/learn/api";
import { QrCode } from "@/app/components/learn/QrCode";
import { useLiveUpdates } from "@/app/components/learn/useLiveUpdates";
import { Badge, Button, Card, ErrorNote, SectionTitle, Spinner } from "@/app/components/learn/ui";
import { shareOrigin } from "@/app/lib/site";

interface HostState {
  session: SessionInfo;
  sessionId: string;
  questions: { id: string; type: string; prompt: string; options: string[]; answer: string }[];
  participants: { id: string; name: string; score: number; signedIn: boolean; submitted: boolean; answered: number }[];
  current: { answered: number; correct: number; distribution: Record<string, number> } | null;
  leaderboard: { participantId: string; name: string; score: number }[];
}

/** Seconds left on a timer that started at `startIso` and runs for `seconds`, corrected for clock skew. */
function useCountdown(startIso: string | null, seconds: number, skewMs: number): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startIso) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startIso]);
  if (!startIso) return null;
  return Math.max(0, Math.ceil((new Date(startIso).getTime() + seconds * 1000 - (now + skewMs)) / 1000));
}

export function formatClock(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function JoinPanel({ big, code, playUrl, copied, onCopy }: { big: boolean; code: string; playUrl: string; copied: boolean; onCopy: () => void }) {
  const L = useT().T.learn;
  return (
    <Card className={`flex ${big ? "flex-col md:flex-row" : "flex-col"} items-center gap-5 ${big ? "md:gap-8 py-8" : ""}`}>
      <QrCode value={playUrl} size={big ? 240 : 140} label={`${L.joinAt} ${playUrl}`} />
      <div className={`text-center ${big ? "md:text-left" : ""} space-y-2`}>
        <p className="text-xs text-dim uppercase tracking-widest">{L.joinAt}</p>
        <p className={`font-semibold text-snow break-all ${big ? "text-xl" : "text-sm"}`}>{new URL(playUrl).host}/join</p>
        <p className="text-xs text-dim uppercase tracking-widest pt-2">{L.code}</p>
        <p className={`font-mono font-bold text-teal tracking-[0.25em] ${big ? "text-5xl sm:text-6xl" : "text-3xl"}`}>{code}</p>
        <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={onCopy}>{copied ? L.copied : L.copyLink}</Button>
      </div>
    </Card>
  );
}

export function HostScreen({ code }: { code: string }) {
  const L = useT().T.learn;
  const [state, setState] = useState<HostState | null>(null);
  const [skew, setSkew] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(() => {
    api<HostState>(`/api/live/${code}/host`)
      .then((s) => { setState(s); setSkew(new Date(s.session.serverNow).getTime() - Date.now()); setError(null); })
      .catch((e: Error) => setError(e.message));
  }, [code]);
  useEffect(() => { refresh(); }, [refresh]);

  const { connected, ping } = useLiveUpdates({ code, sessionId: state?.sessionId ?? null, host: true, refresh });

  const control = useCallback(async (action: "start" | "reveal" | "next" | "end") => {
    setActing(true);
    try {
      await api(`/api/live/${code}/control`, { method: "POST", json: { action } });
      ping();
      refresh();
    } catch (e) { setError((e as Error).message); }
    setActing(false);
  }, [code, ping, refresh]);

  const s = state?.session;
  const questionLeft = useCountdown(s?.status === "question" ? s.questionStartedAt : null, s?.questionSeconds ?? 0, skew);
  const examLeft = useCountdown(s?.mode === "exam" && s.status === "active" ? s.startedAt : null, s?.timeLimitSeconds ?? 0, skew);

  // Game: reveal automatically when the timer runs out or everyone has answered.
  const autoRevealed = useRef(-1);
  useEffect(() => {
    if (!state || s?.status !== "question" || acting) return;
    const everyone = state.participants.length > 0 && (state.current?.answered ?? 0) >= state.participants.length;
    if ((questionLeft === 0 || everyone) && autoRevealed.current !== s.currentIndex) {
      autoRevealed.current = s.currentIndex;
      control("reveal");
    }
  }, [state, s, questionLeft, acting, control]);

  if (!state || !s) {
    return <main className="min-h-screen bg-ink text-snow flex items-center justify-center p-6">{error ? <ErrorNote message={error} /> : <Spinner className="w-6 h-6 text-dim" />}</main>;
  }

  // Only reached on the client (state loads after mount), so window is available.
  const origin = shareOrigin();
  const playUrl = `${origin}/play/${s.code}`;
  const q = state.questions[s.currentIndex];
  const count = state.participants.length;

  const copy = () => {
    navigator.clipboard?.writeText(playUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  };


  return (
    <main className="min-h-screen bg-ink text-snow">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href="/teach" className="text-xs text-dim hover:text-snow">← {L.teachTitle}</Link>
            <h1 className="font-display text-xl sm:text-2xl font-bold truncate">{s.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={s.mode === "game" ? "magenta" : "teal"}>{s.mode === "game" ? L.modeGame : L.modeExam}</Badge>
            <Badge tone={connected ? "good" : "gold"}>
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-good" : "bg-gold animate-pulse"}`} />
              {connected ? L.liveSync : L.pollingSync}
            </Badge>
          </div>
        </header>
        <ErrorNote message={error} />

        {s.status === "lobby" && (
          <>
            <JoinPanel big code={s.code} playUrl={playUrl} copied={copied} onCopy={copy} />
            <Card>
              <SectionTitle action={<span className="text-sm font-semibold text-teal">{L.playersN(count)}</span>}>{L.students}</SectionTitle>
              {count === 0 ? <p className="text-sm text-dim">{L.waitingPlayers}</p> : (
                <ul className="flex flex-wrap gap-2">
                  {state.participants.map((p) => (
                    <li key={p.id} className="rounded-full border border-line bg-ink-3 px-3 py-1 text-sm text-snow card-enter">
                      {p.name} <span className="text-[10px] text-dim">· {p.signedIn ? L.account : L.guest}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <div className="flex gap-2">
              <Button variant="primary" className="text-base px-8" onClick={() => control("start")} disabled={acting}>{acting && <Spinner />} {L.start}</Button>
              <Button variant="ghost" onClick={() => control("end")} disabled={acting}>{L.endSession}</Button>
            </div>
          </>
        )}

        {(s.status === "question" || s.status === "reveal") && q && (
          <div className="grid lg:grid-cols-[1fr_300px] gap-5 items-start">
            <Card className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-dim">{L.questionOf(s.currentIndex + 1, s.questionCount)}</span>
                {s.status === "question" && questionLeft !== null && (
                  <span className={`font-mono text-3xl font-bold ${questionLeft <= 5 ? "text-bad" : "text-snow"}`} aria-live="polite">{questionLeft}</span>
                )}
              </div>
              <p className="font-display text-2xl sm:text-3xl font-bold leading-snug">{q.prompt}</p>
              {q.type !== "fill_blank" ? (
                <ul className="grid sm:grid-cols-2 gap-3">
                  {q.options.map((o) => {
                    const n = state.current?.distribution[o] ?? 0;
                    const total = Math.max(1, state.current?.answered ?? 0);
                    const reveal = s.status === "reveal";
                    const right = o === q.answer;
                    return (
                      <li key={o} className={`relative overflow-hidden rounded-xl border-2 px-4 py-3 text-lg ${reveal ? (right ? "border-good text-snow" : "border-line text-dim") : "border-line text-snow"}`}>
                        {reveal && <span className={`absolute inset-y-0 left-0 ${right ? "bg-good/20" : "bg-ink-3"}`} style={{ width: `${(n / total) * 100}%` }} />}
                        <span className="relative flex justify-between gap-3">
                          <span>{q.type === "true_false" ? (o === "True" ? L.trueLabel : L.falseLabel) : o}</span>
                          {reveal && <span className="font-mono font-bold">{n}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : s.status === "reveal" && (
                <p className="text-lg"><span className="text-dim">{L.correctWas}: </span><span className="text-good font-bold">{q.answer}</span></p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-sm text-body">{L.answeredOf(state.current?.answered ?? 0, count)}</span>
                <div className="flex gap-2">
                  {s.status === "question"
                    ? <Button variant="teal" onClick={() => control("reveal")} disabled={acting}>{L.reveal}</Button>
                    : <Button variant="primary" onClick={() => control("next")} disabled={acting}>
                        {s.currentIndex + 1 >= s.questionCount ? L.finish : L.next}
                      </Button>}
                  <Button variant="ghost" onClick={() => control("end")} disabled={acting}>{L.endSession}</Button>
                </div>
              </div>
            </Card>
            <div className="space-y-4">
              <Card>
                <SectionTitle>{L.leaderboard}</SectionTitle>
                <ol className="space-y-1.5">
                  {state.leaderboard.slice(0, 8).map((p, i) => (
                    <li key={p.participantId} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate"><span className="text-dim font-mono mr-2">{i + 1}</span>{p.name}</span>
                      <span className="font-mono font-semibold text-gold">{p.score}</span>
                    </li>
                  ))}
                </ol>
              </Card>
              <JoinPanel big={false} code={s.code} playUrl={playUrl} copied={copied} onCopy={copy} />
            </div>
          </div>
        )}

        {s.mode === "exam" && s.status === "active" && (
          <div className="grid lg:grid-cols-[1fr_300px] gap-5 items-start">
            <Card className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-dim uppercase tracking-widest">{L.timeLeft}</p>
                  <p className={`font-mono text-4xl font-bold ${examLeft !== null && examLeft < 60 ? "text-bad" : "text-snow"}`}>{formatClock(examLeft ?? 0)}</p>
                </div>
                <p className="text-sm text-body">{L.submittedOf(state.participants.filter((p) => p.submitted).length, count)}</p>
                <Button variant="primary" onClick={() => control("end")} disabled={acting}>{L.endSession}</Button>
              </div>
              <ul className="divide-y divide-line">
                {state.participants.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="truncate">{p.name}</span>
                    {p.submitted ? <Badge tone="good">{L.submittedTitle} · {p.score}/{s.questionCount}</Badge> : <Badge tone="gold">{L.statusLive}</Badge>}
                  </li>
                ))}
              </ul>
            </Card>
            <JoinPanel big={false} code={s.code} playUrl={playUrl} copied={copied} onCopy={copy} />
          </div>
        )}

        {s.status === "finished" && (
          <Card className="text-center py-10 space-y-4">
            <h2 className="font-display text-2xl font-bold">{L.sessionOver}</h2>
            <p className="text-sm text-body">{L.playersN(count)}</p>
            {state.leaderboard.length > 0 && (
              <ol className="max-w-xs mx-auto space-y-1.5 text-left">
                {state.leaderboard.slice(0, 3).map((p, i) => (
                  <li key={p.participantId} className="flex justify-between text-sm">
                    <span><span className="text-gold font-bold mr-2">{i + 1}</span>{p.name}</span>
                    <span className="font-mono">{p.score}</span>
                  </li>
                ))}
              </ol>
            )}
            <Link href={`/teach/sessions/${state.sessionId}`} className="inline-flex rounded-xl bg-gold text-on-gold font-semibold px-5 py-2.5 text-sm hover:bg-gold-hover">
              {L.viewResults}
            </Link>
          </Card>
        )}
      </div>
    </main>
  );
}

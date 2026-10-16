"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/app/components/Header";
import { useT } from "@/app/lib/language-context";
import { api } from "@/app/components/learn/api";
import { Badge, Card, DistributionBars, ErrorNote, formatDate, pct, SectionTitle, Spinner } from "@/app/components/learn/ui";

interface Report {
  id: string; code: string; mode: "exam" | "game"; status: string; classId: string | null; title: string; date: string;
  questions: { id: string; prompt: string; answer: string }[];
  average: number;
  distribution: number[];
  hardestQuestions: { questionId: string; prompt: string; answer: string; attempts: number; accuracy: number; commonWrong: string | null }[];
  weakestKps: { kpId: string; name: string; attempts: number; accuracy: number }[];
  students: { participantId: string; userId: string | null; name: string; score: number; correct: number; total: number; pct: number; answers: ({ response: string; isCorrect: boolean } | null)[] }[];
}

export function SessionReport({ id }: { id: string }) {
  const { T, lang } = useT();
  const L = T.learn;
  const [r, setR] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { api<Report>(`/api/reports/sessions/${id}`).then(setR).catch((e: Error) => setError(e.message)); }, [id]);

  return (
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7 pb-bottom-nav md:pb-10 space-y-5">
        <Link href="/teach" className="text-xs text-dim hover:text-snow">← {L.teachTitle}</Link>
        <ErrorNote message={error} />
        {!r ? !error && <div className="flex justify-center py-16 text-dim"><Spinner className="w-6 h-6" /></div> : (
          <>
            <Card className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs text-dim uppercase tracking-widest">{L.sessionReport}</p>
                <h1 className="font-display text-2xl font-bold">{r.title}</h1>
                <p className="text-xs text-dim mt-1">{r.mode === "exam" ? L.modeExam : L.modeGame} · {formatDate(r.date, lang)} · {L.playersN(r.students.length)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-dim">{L.average}</p>
                <p className="font-display text-4xl font-bold text-teal">{pct(r.average)}</p>
              </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-5">
              <Card>
                <SectionTitle>{L.scoreDistribution}</SectionTitle>
                <DistributionBars buckets={r.distribution} />
              </Card>
              <Card>
                <SectionTitle>{L.weakestKps}</SectionTitle>
                {r.weakestKps.length === 0 ? <p className="text-sm text-dim">{L.noData}</p> : (
                  <ul className="space-y-2.5">
                    {r.weakestKps.map((k) => (
                      <li key={k.kpId}>
                        <div className="flex justify-between text-sm mb-1"><span className="truncate">{k.name}</span><span className="font-mono text-body">{pct(k.accuracy)}</span></div>
                        <div className="h-1.5 rounded-full bg-ink-3 overflow-hidden">
                          <div className={`h-full ${k.accuracy < 0.5 ? "bg-bad" : k.accuracy < 0.8 ? "bg-gold" : "bg-good"}`} style={{ width: `${k.accuracy * 100}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <Card>
              <SectionTitle>{L.hardestQuestions}</SectionTitle>
              {r.hardestQuestions.length === 0 ? <p className="text-sm text-dim">{L.noData}</p> : (
                <ol className="space-y-3">
                  {r.hardestQuestions.map((q) => (
                    <li key={q.questionId} className="rounded-xl border border-line p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-snow">{q.prompt}</p>
                        <Badge tone={q.accuracy < 0.5 ? "bad" : "gold"}>{L.accuracyPct(Math.round(q.accuracy * 100))}</Badge>
                      </div>
                      <p className="text-xs text-dim mt-1.5">
                        {L.correctAnswer}: <span className="text-good">{q.answer}</span>
                        {q.commonWrong && <> · {L.commonWrong}: <span className="text-bad">{q.commonWrong}</span></>}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card>
              <SectionTitle>{L.students}</SectionTitle>
              <ul className="divide-y divide-line">
                {r.students.map((s) => (
                  <li key={s.participantId} className="py-2.5">
                    <button type="button" onClick={() => setOpen(open === s.participantId ? null : s.participantId)} aria-expanded={open === s.participantId}
                      className="w-full flex items-center justify-between gap-3 text-sm cursor-pointer">
                      <span className="truncate text-left">{s.name} {!s.userId && <span className="text-[10px] text-dim">· {L.guest}</span>}</span>
                      <span className="flex items-center gap-3 shrink-0">
                        <span className="w-20 h-1.5 rounded-full bg-ink-3 overflow-hidden hidden sm:block">
                          <span className={`block h-full ${s.pct < 0.5 ? "bg-bad" : s.pct < 0.8 ? "bg-gold" : "bg-good"}`} style={{ width: `${s.pct * 100}%` }} />
                        </span>
                        <span className="font-mono">{s.correct}/{s.total}</span>
                        {r.mode === "game" && <span className="font-mono text-gold w-14 text-right">{s.score}</span>}
                      </span>
                    </button>
                    {open === s.participantId && (
                      <div className="mt-2 space-y-2">
                        <div className="flex flex-wrap gap-1" aria-label={L.allAnswers}>
                          {s.answers.map((a, i) => (
                            <span key={i} title={`${i + 1}. ${r.questions[i]?.prompt ?? ""} — ${a?.response || L.noAnswer}`}
                              className={`w-7 h-7 rounded-md text-[11px] font-bold flex items-center justify-center ${a === null ? "bg-ink-3 text-dim" : a.isCorrect ? "bg-good/20 text-good" : "bg-bad/20 text-bad"}`}>
                              {i + 1}
                            </span>
                          ))}
                        </div>
                        {s.userId && r.classId && (
                          <Link href={`/teach/classes/${r.classId}/students/${s.userId}`} className="text-xs text-teal">{L.details} →</Link>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

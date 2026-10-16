"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/app/components/Header";
import { useT } from "@/app/lib/language-context";
import { api } from "@/app/components/learn/api";
import { Badge, Card, DistributionBars, ErrorNote, formatDate, pct, SectionTitle, Spinner } from "@/app/components/learn/ui";

interface ClassData {
  id: string; name: string; code: string;
  sessions: { id: string; code: string; mode: string; status: string; date: string; title: string; accuracy: number | null; players: number }[];
  distribution: number[];
  hardestQuestions: { questionId: string; prompt: string; answer: string; attempts: number; accuracy: number; commonWrong: string | null }[];
  weakestKps: { kpId: string; name: string; level: string; mastery: number; students: number; weakStudents: number }[];
  students: { id: string; name: string; mastery: number | null; accuracy: number | null; answers: number; weakest: string[] }[];
}

export function ClassReport({ id }: { id: string }) {
  const { T, lang } = useT();
  const L = T.learn;
  const [c, setC] = useState<ClassData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<ClassData>(`/api/classes/${id}`).then(setC).catch((e: Error) => setError(e.message)); }, [id]);

  return (
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7 pb-bottom-nav md:pb-10 space-y-5">
        <Link href="/teach" className="text-xs text-dim hover:text-snow">← {L.teachTitle}</Link>
        <ErrorNote message={error} />
        {!c ? !error && <div className="flex justify-center py-16 text-dim"><Spinner className="w-6 h-6" /></div> : (
          <>
            <Card className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-dim uppercase tracking-widest">{L.classReport}</p>
                <h1 className="font-display text-2xl font-bold">{c.name}</h1>
                <p className="text-xs text-dim mt-1">{L.studentsN(c.students.length)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-dim">{L.shareClassCode}</p>
                <p className="font-mono text-3xl font-bold tracking-[0.2em] text-teal">{c.code}</p>
              </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-5">
              <Card>
                <SectionTitle>{L.weakestKps}</SectionTitle>
                {c.weakestKps.length === 0 ? <p className="text-sm text-dim">{L.noData}</p> : (
                  <ul className="space-y-2.5">
                    {c.weakestKps.map((k) => (
                      <li key={k.kpId}>
                        <div className="flex justify-between gap-2 text-sm mb-1">
                          <span className="truncate">{k.name} <span className="text-[11px] text-dim">· {k.level}</span></span>
                          <span className="shrink-0 flex items-center gap-2">
                            {k.weakStudents > 0 && <Badge tone="bad">{L.weakStudentsN(k.weakStudents)}</Badge>}
                            <span className="font-mono text-body">{pct(k.mastery)}</span>
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-ink-3 overflow-hidden">
                          <div className={`h-full ${k.mastery < 0.5 ? "bg-bad" : k.mastery < 0.8 ? "bg-gold" : "bg-good"}`} style={{ width: `${k.mastery * 100}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card>
                <SectionTitle>{L.scoreDistribution}</SectionTitle>
                <DistributionBars buckets={c.distribution} />
              </Card>
            </div>

            <Card>
              <SectionTitle>{L.students}</SectionTitle>
              {c.students.length === 0 ? <p className="text-sm text-dim">{L.noData}</p> : (
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="text-left text-[11px] text-dim uppercase tracking-wider">
                        <th className="py-2 font-semibold">{L.students}</th>
                        <th className="py-2 font-semibold">{L.avgMastery}</th>
                        <th className="py-2 font-semibold">{L.score}</th>
                        <th className="py-2 font-semibold">{L.atRisk}</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {c.students.map((s) => (
                        <tr key={s.id}>
                          <td className="py-2.5 pr-3">{s.name}</td>
                          <td className={`py-2.5 pr-3 font-mono ${s.mastery !== null && s.mastery < 0.5 ? "text-bad" : ""}`}>{pct(s.mastery)}</td>
                          <td className="py-2.5 pr-3 font-mono">{pct(s.accuracy)}</td>
                          <td className="py-2.5 pr-3"><div className="flex flex-wrap gap-1">{s.weakest.map((w) => <Badge key={w} tone="bad">{w}</Badge>)}</div></td>
                          <td className="py-2.5 text-right"><Link href={`/teach/classes/${c.id}/students/${s.id}`} className="text-xs text-teal whitespace-nowrap">{L.details} →</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card>
              <SectionTitle>{L.hardestQuestions}</SectionTitle>
              {c.hardestQuestions.length === 0 ? <p className="text-sm text-dim">{L.noData}</p> : (
                <ol className="space-y-2">
                  {c.hardestQuestions.map((q) => (
                    <li key={q.questionId} className="flex items-start justify-between gap-3 rounded-xl border border-line p-3">
                      <div className="min-w-0">
                        <p className="text-sm">{q.prompt}</p>
                        <p className="text-xs text-dim mt-1">{L.correctAnswer}: <span className="text-good">{q.answer}</span>
                          {q.commonWrong && <> · {L.commonWrong}: <span className="text-bad">{q.commonWrong}</span></>}</p>
                      </div>
                      <Badge tone={q.accuracy < 0.5 ? "bad" : "gold"}>{L.accuracyPct(Math.round(q.accuracy * 100))}</Badge>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card>
              <SectionTitle>{L.liveSessions}</SectionTitle>
              {c.sessions.length === 0 ? <p className="text-sm text-dim">{L.noSessions}</p> : (
                <ul className="divide-y divide-line">
                  {c.sessions.map((s) => (
                    <li key={s.id}>
                      <Link href={`/teach/sessions/${s.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-teal">
                        <span className="min-w-0">
                          <span className="block truncate">{s.title}</span>
                          <span className="block text-[11px] text-dim">{s.mode === "exam" ? L.modeExam : L.modeGame} · {formatDate(s.date, lang)} · {L.playersN(s.players)}</span>
                        </span>
                        <span className="font-mono shrink-0">{pct(s.accuracy)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

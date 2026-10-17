"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/app/components/Header";
import { useT } from "@/app/lib/language-context";
import type { LevelProgress, SessionResult } from "@/app/lib/learning/progress";
import { api } from "@/app/components/learn/api";
import { LevelReadiness } from "@/app/learn/LearnHome";
import { ShuoResults, type ShuoResult } from "@/app/components/learn/ShuoResults";
import { Card, ErrorNote, formatDate, SectionTitle, Spinner } from "@/app/components/learn/ui";

interface Detail {
  className: string;
  shuoResults: ShuoResult[];
  name: string;
  levels: LevelProgress[];
  history: SessionResult[];
  mistakes: { prompt: string; response: string; answer: string; date: string }[];
}

/** Teacher's view of one student: the same diagnosis the student sees, plus history and recent mistakes. */
export function StudentDetail({ classId, studentId }: { classId: string; studentId: string }) {
  const { T, lang } = useT();
  const L = T.learn;
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Detail>(`/api/classes/${classId}/students/${studentId}`).then(setD).catch((e: Error) => setError(e.message));
  }, [classId, studentId]);

  return (
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7 pb-bottom-nav md:pb-10 space-y-5">
        <Link href={`/teach/classes/${classId}`} className="text-xs text-dim hover:text-snow">← {d?.className ?? L.classReport}</Link>
        <ErrorNote message={error} />
        {!d ? !error && <div className="flex justify-center py-16 text-dim"><Spinner className="w-6 h-6" /></div> : (
          <>
            <h1 className="font-display text-2xl font-bold">{d.name}</h1>
            <div className="grid lg:grid-cols-3 gap-5 items-start">
              <section className="lg:col-span-2 space-y-4">
                {d.levels.length === 0 ? <Card><p className="text-sm text-dim">{L.noData}</p></Card>
                  : d.levels.map((l) => <LevelReadiness key={l.levelId} level={l} />)}
                <ShuoResults results={d.shuoResults ?? []} showStudent={false} />
              </section>
              <aside className="space-y-4">
                <Card>
                  <SectionTitle>{L.sessionHistory}</SectionTitle>
                  {d.history.length === 0 ? <p className="text-sm text-dim">—</p> : (
                    <ul className="space-y-2">
                      {d.history.map((h) => (
                        <li key={h.code} className="flex justify-between gap-2 text-sm">
                          <span className="min-w-0">
                            <span className="block truncate">{h.title}</span>
                            <span className="block text-[11px] text-dim">{formatDate(h.date, lang)}</span>
                          </span>
                          <span className="font-mono shrink-0">{h.correct}/{h.total}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
                <Card>
                  <SectionTitle>{L.recentMistakes}</SectionTitle>
                  {d.mistakes.length === 0 ? <p className="text-sm text-dim">—</p> : (
                    <ul className="space-y-3">
                      {d.mistakes.map((m, i) => (
                        <li key={i} className="text-sm">
                          <p className="text-snow">{m.prompt}</p>
                          <p className="text-xs mt-0.5"><span className="text-bad">{m.response || L.noAnswer}</span> → <span className="text-good">{m.answer}</span></p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

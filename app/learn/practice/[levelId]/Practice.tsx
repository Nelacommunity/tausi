"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/app/components/Header";
import { useT } from "@/app/lib/language-context";
import type { StudentQuestion } from "@/app/lib/learning/types";
import type { ReviewItem } from "@/app/lib/learning/review";
import { api } from "@/app/components/learn/api";
import { QuestionInput } from "@/app/components/learn/QuestionInput";
import { ReviewList } from "@/app/components/learn/ReviewList";
import { Badge, Button, Card, ErrorNote, pct, Spinner } from "@/app/components/learn/ui";

interface PracticeSet {
  levelName: string;
  curriculumName: string;
  targets: { kpId: string; name: string; mastery: number; attempts: number }[];
  questions: StudentQuestion[];
}
interface Result {
  correct: number;
  total: number;
  items: ReviewItem[];
  changes: { kpId: string; name: string; before: number; after: number }[];
}

/** "Practice my weak areas": an adaptive set, then the review and how mastery moved. */
export function Practice({ levelId }: { levelId: string }) {
  const L = useT().T.learn;
  const [set, setSet] = useState<PracticeSet | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<PracticeSet>(`/api/practice?levelId=${levelId}`)
      .then((s) => { setSet(s); setAnswers({}); setResult(null); })
      .catch((e: Error) => setError(e.message));
  }, [levelId]);
  useEffect(() => { load(); }, [load]);

  const check = async () => {
    if (!set) return;
    setBusy(true); setError(null);
    try {
      const r = await api<Result>("/api/practice", {
        method: "POST",
        json: { levelId, responses: set.questions.map((q) => ({ questionId: q.id, response: answers[q.id] ?? "" })) },
      });
      setResult(r);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };

  const again = () => { setSet(null); load(); };

  return (
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-7 pb-bottom-nav md:pb-10 space-y-5">
        <Link href="/learn" className="text-xs text-dim hover:text-snow">← {L.backToLearn}</Link>
        <ErrorNote message={error} />
        {!set ? <div className="flex justify-center py-16 text-dim"><Spinner className="w-6 h-6" /></div> : (
          <>
            <Card className="space-y-3">
              <p className="text-xs text-dim">{set.curriculumName}</p>
              <h1 className="font-display text-2xl font-bold">{L.practiceTitle(set.levelName)}</h1>
              <p className="text-sm text-body">{L.targeting}</p>
              <div className="flex flex-wrap gap-1.5">
                {set.targets.map((t) => <Badge key={t.kpId} tone={t.attempts ? (t.mastery < 0.5 ? "bad" : "gold") : "neutral"}>{t.name}{t.attempts ? ` · ${pct(t.mastery)}` : ""}</Badge>)}
              </div>
            </Card>

            {result ? (
              <>
                <Card className="space-y-4">
                  <p className="font-display text-3xl font-bold text-center">{L.scoreOf(result.correct, result.total)}</p>
                  <div>
                    <p className="text-xs font-bold text-dim uppercase tracking-widest mb-2">{L.masteryChange}</p>
                    <ul className="space-y-1.5">
                      {result.changes.map((c) => {
                        const up = c.after >= c.before;
                        return (
                          <li key={c.kpId} className="flex items-center justify-between gap-3 text-sm">
                            <span className="truncate">{c.name}</span>
                            <span className="font-mono shrink-0">
                              <span className="text-dim">{pct(c.before)}</span>
                              <span className={`mx-1.5 ${up ? "text-good" : "text-bad"}`}>{up ? "↑" : "↓"}</span>
                              <span className={up ? "text-good" : "text-bad"}>{pct(c.after)}</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" onClick={again}>{L.practiceAgain}</Button>
                    <Link href="/learn" className="inline-flex items-center rounded-xl border border-line px-4 py-2.5 text-sm">{L.backToLearn}</Link>
                  </div>
                </Card>
                <h2 className="font-display text-lg font-bold">{L.reviewTitle}</h2>
                <ReviewList items={result.items} />
              </>
            ) : (
              <>
                {set.questions.map((q, i) => (
                  <Card key={q.id} className="space-y-3">
                    <p className="text-sm sm:text-base leading-relaxed"><span className="text-dim mr-2">{i + 1}.</span>{q.prompt}</p>
                    <QuestionInput question={q} value={answers[q.id] ?? ""} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} disabled={busy} />
                  </Card>
                ))}
                <Button variant="primary" className="w-full py-3 text-base" onClick={check} disabled={busy || !set.questions.length}>
                  {busy ? <><Spinner /> {L.submitting}</> : L.checkAnswers}
                </Button>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

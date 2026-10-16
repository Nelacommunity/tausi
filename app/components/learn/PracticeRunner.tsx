"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/app/lib/language-context";
import type { StudentQuestion } from "@/app/lib/learning/types";
import type { ReviewItem } from "@/app/lib/learning/review";
import { api } from "./api";
import { QuestionInput } from "./QuestionInput";
import { ReviewList } from "./ReviewList";
import { Badge, Button, Card, ErrorNote, pct, Spinner } from "./ui";

export interface PracticeSet {
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

/**
 * Take a practice set: answer, check (graded and recorded via /api/practice,
 * which updates mastery), then see how mastery moved and review each answer.
 */
export function PracticeRunner({ set, levelId, title, onAgain }: { set: PracticeSet; levelId: string; title?: string; onAgain: () => void }) {
  const L = useT().T.learn;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
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

  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        {set.curriculumName && <p className="text-xs text-dim">{set.curriculumName}</p>}
        <h1 className="font-display text-2xl font-bold">{title ?? L.practiceTitle(set.levelName)}</h1>
        <p className="text-sm text-body">{L.targeting}</p>
        <div className="flex flex-wrap gap-1.5">
          {set.targets.map((t) => <Badge key={t.kpId} tone={t.attempts ? (t.mastery < 0.5 ? "bad" : "gold") : "neutral"}>{t.name}{t.attempts ? ` · ${pct(t.mastery)}` : ""}</Badge>)}
        </div>
      </Card>
      <ErrorNote message={error} />

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
              <Button variant="primary" onClick={onAgain}>{L.practiceAgain}</Button>
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
    </div>
  );
}

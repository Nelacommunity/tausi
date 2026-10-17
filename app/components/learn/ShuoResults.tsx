"use client";

import { useT } from "@/app/lib/language-context";
import { Badge, Card, formatDate, SectionTitle } from "./ui";

export interface ShuoResult {
  id: string;
  studentId?: string;
  studentName?: string;
  kind: "lesson" | "speaking";
  title: string;
  score: number;
  details: Record<string, unknown>;
  auto: boolean;
  date: string;
}

/** Lesson scores and speaking reports students shared from Shuō, for the teacher. */
export function ShuoResults({ results, showStudent = true }: { results: ShuoResult[]; showStudent?: boolean }) {
  const { T, lang } = useT();
  const L = T.learn;
  return (
    <Card>
      <SectionTitle>{L.shuoResults}</SectionTitle>
      <p className="text-xs text-dim -mt-1 mb-3">{L.shuoResultsSub}</p>
      {results.length === 0 ? <p className="text-sm text-dim">{L.noShuoResults}</p> : (
        <ul className="divide-y divide-line">
          {results.map((r) => {
            const d = r.details as { summary?: string; estimatedLevel?: string; scores?: Record<string, number>; correct?: number; total?: number };
            return (
              <li key={r.id} className="py-2.5">
                <details className="group">
                  <summary className="flex items-center justify-between gap-3 cursor-pointer list-none">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm">
                        <Badge tone={r.kind === "lesson" ? "teal" : "magenta"}>{r.kind === "lesson" ? L.shuoLesson : L.shuoSpeaking}</Badge>
                        <span className="truncate">{showStudent && r.studentName ? <strong className="font-semibold">{r.studentName} · </strong> : null}{r.title}</span>
                      </span>
                      <span className="block text-[11px] text-dim mt-0.5">
                        {formatDate(r.date, lang)}{r.auto ? ` · ${L.sentAuto}` : ""}
                        {r.kind === "lesson" && d.total ? ` · ${d.correct}/${d.total}` : ""}
                      </span>
                    </span>
                    <span className={`font-mono font-bold shrink-0 ${r.score >= 80 ? "text-good" : r.score >= 50 ? "text-gold" : "text-bad"}`}>{r.score}%</span>
                  </summary>
                  {r.kind === "speaking" && (d.summary || d.scores) && (
                    <div className="mt-2 rounded-xl border border-line bg-ink/40 p-3 space-y-2 text-sm">
                      {d.estimatedLevel && <p className="text-xs text-dim">{L.estLevel}: <span className="text-snow">{d.estimatedLevel}</span></p>}
                      {d.scores && (
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(d.scores).map(([k, v]) => <Badge key={k}>{k} {v}</Badge>)}
                        </div>
                      )}
                      {d.summary && <p className="text-body leading-relaxed">{d.summary}</p>}
                    </div>
                  )}
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

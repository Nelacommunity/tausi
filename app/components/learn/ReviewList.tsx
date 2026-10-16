"use client";

import { useEffect, useState } from "react";
import { useT } from "@/app/lib/language-context";
import type { Lang } from "@/app/lib/translations";
import type { ReviewItem } from "@/app/lib/learning/review";
import { api } from "./api";
import { Badge, Spinner } from "./ui";

type Explanations = Record<string, { explanation: string; culturalNote: string | null }>;

/**
 * Personal review: each question, the student's answer, the correct answer,
 * and an explanation in the language they pick (generated once, then cached
 * server-side for everyone).
 */
export function ReviewList({ items, code, token }: { items: ReviewItem[]; code?: string; token?: string | null }) {
  const { T, lang: uiLang } = useT();
  const L = T.learn;
  const [lang, setLang] = useState<Lang>(uiLang);
  const [byLang, setByLang] = useState<Partial<Record<Lang, Explanations>>>({});
  const [failed, setFailed] = useState<Partial<Record<Lang, boolean>>>({});

  const answeredIds = items.filter((i) => i.response).map((i) => i.questionId);
  const idsKey = answeredIds.join(",");
  const explanations = byLang[lang];

  useEffect(() => {
    if (explanations || !idsKey) return;
    let live = true;
    api<Explanations>("/api/explanations", { method: "POST", json: { questionIds: idsKey.split(","), lang, code }, token })
      .then((data) => { if (live) setByLang((m) => ({ ...m, [lang]: data })); })
      .catch(() => { if (live) setFailed((f) => ({ ...f, [lang]: true })); });
    return () => { live = false; };
  }, [lang, idsKey, code, token, explanations]);
  const status = failed[lang] ? "error" : !explanations && idsKey ? "loading" : "idle";

  const label = (item: ReviewItem, v: string) =>
    item.type === "true_false" ? (v === "True" ? L.trueLabel : v === "False" ? L.falseLabel : v) : v;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-dim">{L.explainIn}</span>
        <div className="flex items-center rounded-lg border border-line overflow-hidden" role="group" aria-label={L.explainIn}>
          {([["en", "English"], ["sw", "Kiswahili"], ["zh", "中文"]] as const).map(([l, name]) => (
            <button key={l} type="button" onClick={() => setLang(l)} lang={l} aria-pressed={lang === l}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${lang === l ? "bg-teal text-ink" : "text-dim hover:text-snow"}`}>
              {name}
            </button>
          ))}
        </div>
      </div>
      {status === "loading" && (
        <p className="flex items-center gap-2 text-xs text-dim"><Spinner className="w-3.5 h-3.5" /> {L.writingExplanations}</p>
      )}
      {status === "error" && <p className="text-xs text-bad">{L.explanationsFailed}</p>}

      <ol className="space-y-3">
        {items.map((item, i) => {
          const ex = explanations?.[item.questionId];
          return (
            <li key={item.questionId} className={`rounded-2xl border p-4 sm:p-5 ${item.isCorrect ? "border-good/30 bg-good/[0.04]" : "border-bad/30 bg-bad/[0.04]"}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="text-sm sm:text-base text-snow font-medium leading-relaxed">
                  <span className="text-dim mr-2">{i + 1}.</span>{item.prompt}
                </p>
                <Badge tone={item.isCorrect ? "good" : "bad"}>{item.isCorrect ? L.correct : L.incorrect}</Badge>
              </div>
              <dl className="grid sm:grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-ink/60 border border-line px-3 py-2">
                  <dt className="text-[11px] text-dim mb-0.5">{L.yourAnswer}</dt>
                  <dd className={item.isCorrect ? "text-good" : "text-bad"}>{item.response ? label(item, item.response) : L.noAnswer}</dd>
                </div>
                <div className="rounded-xl bg-ink/60 border border-line px-3 py-2">
                  <dt className="text-[11px] text-dim mb-0.5">{L.correctAnswer}</dt>
                  <dd className="text-snow">{label(item, item.answer)}</dd>
                </div>
              </dl>
              {item.kps.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {item.kps.map((k) => <Badge key={k.id} tone="teal">{k.name}</Badge>)}
                </div>
              )}
              {ex && (
                <div className="mt-3 space-y-2" lang={lang}>
                  <p className="text-sm text-body leading-relaxed"><span className="font-semibold text-snow">{L.why}: </span>{ex.explanation}</p>
                  {ex.culturalNote && (
                    <p className="text-sm text-body leading-relaxed rounded-xl border border-gold/30 bg-gold/5 px-3 py-2">
                      <span className="font-semibold text-gold">{L.culturalNote}: </span>{ex.culturalNote}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

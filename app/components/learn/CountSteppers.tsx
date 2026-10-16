"use client";

import { useT } from "@/app/lib/language-context";
import type { QuestionType } from "@/app/lib/learning/grading";
import { MAX_PER_DRAFT, MAX_PER_TYPE } from "@/app/lib/learning/limits";

export type Counts = Record<QuestionType, number>;

export const countTotal = (c: Counts) => c.mcq + c.true_false + c.fill_blank;

/** One row per question type with −/+ buttons, capped per type and in total. */
export function CountSteppers({ counts, onChange }: { counts: Counts; onChange: (c: Counts) => void }) {
  const L = useT().T.learn;
  const total = countTotal(counts);
  return (
    <div className="space-y-2">
      {([["mcq", L.countMcq], ["true_false", L.countTf], ["fill_blank", L.countFill]] as const).map(([k, label]) => {
        // Each type may go up to MAX_PER_TYPE, as long as the total stays within MAX_PER_DRAFT.
        const cap = Math.min(MAX_PER_TYPE, counts[k] + MAX_PER_DRAFT - total);
        const set = (v: number) => onChange({ ...counts, [k]: Math.max(0, Math.min(cap, v)) });
        return (
          <div key={k} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink px-3 py-2">
            <label htmlFor={`count-${k}`} className="text-sm text-snow min-w-0">{label}</label>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" aria-label={`${L.less}: ${label}`} onClick={() => set(counts[k] - 1)} disabled={counts[k] <= 0}
                className="w-8 h-8 rounded-lg border border-line text-snow hover:border-line-2 disabled:opacity-40 cursor-pointer">−</button>
              <input id={`count-${k}`} type="number" inputMode="numeric" min={0} max={cap} value={counts[k]}
                onChange={(e) => set(Number(e.target.value) || 0)}
                className="w-14 h-8 rounded-lg border border-line bg-ink-2 text-center text-sm font-semibold text-snow outline-none focus:border-teal" />
              <button type="button" aria-label={`${L.more}: ${label}`} onClick={() => set(counts[k] + 1)} disabled={counts[k] >= cap}
                className="w-8 h-8 rounded-lg border border-line text-snow hover:border-line-2 disabled:opacity-40 cursor-pointer">+</button>
            </div>
          </div>
        );
      })}
      <p className={`text-right text-xs font-semibold ${total > MAX_PER_DRAFT ? "text-bad" : "text-dim"}`}>{L.totalOf(total, MAX_PER_DRAFT)}</p>
    </div>
  );
}

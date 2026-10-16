"use client";

import { useT } from "@/app/lib/language-context";
import type { StudentQuestion } from "@/app/lib/learning/types";
import { inputClass } from "./ui";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * One question with its answer control: big tappable options for
 * multiple choice / true-false, a text box for fill-in-the-blank.
 * With `correctAnswer` set it shows the outcome instead of accepting input.
 */
export function QuestionInput({
  question, value, onChange, disabled = false, correctAnswer, size = "md",
}: {
  question: StudentQuestion;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  correctAnswer?: string;
  size?: "md" | "lg";
}) {
  const L = useT().T.learn;
  const revealed = correctAnswer !== undefined;
  const label = (o: string) => (question.type === "true_false" ? (o === "True" ? L.trueLabel : o === "False" ? L.falseLabel : o) : o);

  if (question.type === "fill_blank") {
    return (
      <input
        className={`${inputClass} ${size === "lg" ? "text-lg py-3.5" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || revealed}
        placeholder={L.typeAnswer}
        aria-label={L.typeAnswer}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={200}
      />
    );
  }

  return (
    <div className={`grid gap-2.5 ${question.type === "true_false" ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`} role="radiogroup">
      {question.options.map((o, i) => {
        const selected = value === o;
        let tone = selected ? "border-teal bg-teal/10 text-snow" : "border-line bg-ink hover:border-line-2 text-body";
        if (revealed) {
          if (o === correctAnswer) tone = "border-good bg-good/10 text-snow";
          else if (selected) tone = "border-bad bg-bad/10 text-snow";
          else tone = "border-line bg-ink text-dim opacity-70";
        }
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled || revealed}
            onClick={() => onChange(o)}
            className={`flex items-center gap-3 rounded-xl border-2 text-left transition-colors cursor-pointer disabled:cursor-default ${size === "lg" ? "px-4 py-4 text-lg" : "px-3.5 py-3 text-sm"} ${tone}`}
          >
            <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${selected ? "bg-teal text-ink" : "bg-ink-3 text-dim"}`}>
              {LETTERS[i]}
            </span>
            <span className="min-w-0 break-words">{label(o)}</span>
          </button>
        );
      })}
    </div>
  );
}

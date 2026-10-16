// Auto-grading and game scoring. Pure functions — no I/O.

export type QuestionType = "mcq" | "true_false" | "fill_blank";

/**
 * Normalise a fill-in answer: trim, lower-case, full-width → half-width,
 * drop whitespace, punctuation (Latin and CJK) and thousands separators.
 */
export function normaliseAnswer(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s,，。．.!！?？、;；:："'“”‘’「」()（）]/g, "")
    .trim();
}

export function isCorrect(type: QuestionType, response: string, answer: string): boolean {
  if (type === "fill_blank") return normaliseAnswer(response) !== "" && normaliseAnswer(response) === normaliseAnswer(answer);
  return response === answer;
}

/**
 * Game-mode points: 500 for a correct answer, up to +500 for speed (linear
 * over the question timer), +50 per answer in the current streak (max +250).
 */
export function gamePoints(correct: boolean, timeMs: number, questionSeconds: number, streakBefore: number): number {
  if (!correct) return 0;
  const limit = questionSeconds * 1000;
  const speed = 1 - Math.min(Math.max(timeMs, 0), limit) / limit;
  return Math.round(500 + 500 * speed) + Math.min(streakBefore, 5) * 50;
}

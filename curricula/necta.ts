// Small Tanzanian NECTA sample — Form Two (FTNA) Basic Mathematics. A handful
// of knowledge points with original, generated questions, included to show the
// curriculum engine is not tied to one syllabus.

import type { SeedCurriculum, SeedQuestion } from "./types.ts";
import { rng, shuffle } from "./util.ts";

const rand = rng(42);
const ri = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

function numericMcq(prompt: string, answer: number, distractors: number[], kp: string, difficulty: 1 | 2 | 3, unit = ""): SeedQuestion {
  const opts = [...new Set([answer, ...distractors])].filter((x) => Number.isFinite(x)).slice(0, 4);
  while (opts.length < 4) opts.push(answer + opts.length * 3);
  return {
    type: "mcq", prompt,
    options: shuffle(opts.map((x) => `${x}${unit}`), rand),
    answer: `${answer}${unit}`, difficulty, kps: [kp],
  };
}

const questions: SeedQuestion[] = [];

// Percentages
for (let i = 0; i < 6; i++) {
  const p = [10, 20, 25, 30, 40, 75][i];
  const n = ri(2, 9) * 40;
  const ans = (p * n) / 100;
  questions.push(numericMcq(`Find ${p}% of ${n}.`, ans, [ans + 10, ans * 2, n - ans], "F2-PCT", i < 3 ? 1 : 2));
}
questions.push({ type: "fill_blank", prompt: "A shirt costs 20,000 TZS. It is sold at a 15% discount. What is the new price in TZS? (numbers only)", options: [], answer: "17000", difficulty: 3, kps: ["F2-PCT"] });

// Linear equations: ax + b = c
for (let i = 0; i < 6; i++) {
  const a = ri(2, 6), x = ri(1, 9), b = ri(1, 12);
  const c = a * x + b;
  questions.push(numericMcq(`Solve for x: ${a}x + ${b} = ${c}`, x, [x + 1, c - b, x - 1 || x + 2], "F2-ALG", i < 2 ? 1 : 2));
}
questions.push({ type: "fill_blank", prompt: "Solve for x: 3(x − 2) = 12", options: [], answer: "6", difficulty: 3, kps: ["F2-ALG"] });

// Area & perimeter of rectangles
for (let i = 0; i < 5; i++) {
  const l = ri(4, 15), w = ri(2, 9);
  if (i % 2 === 0) {
    questions.push(numericMcq(`A rectangle is ${l} cm long and ${w} cm wide. What is its area?`, l * w, [2 * (l + w), l + w, l * w + w], "F2-MENS", 1, " cm²"));
  } else {
    questions.push(numericMcq(`A rectangular garden is ${l} m by ${w} m. What is its perimeter?`, 2 * (l + w), [l * w, l + w, 2 * l + w], "F2-MENS", 2, " m"));
  }
}

// Ratio
for (let i = 0; i < 5; i++) {
  const a = ri(1, 4), b = ri(2, 5), k = ri(2, 6) * 500;
  const total = (a + b) * k;
  questions.push(numericMcq(`Share ${total} TZS in the ratio ${a} : ${b}. How much is the larger share?`, Math.max(a, b) * k, [Math.min(a, b) * k, total / 2, Math.max(a, b) * k + k], "F2-RATIO", 2, " TZS"));
}

// Indices
const indexItems: [string, string, string[]][] = [
  ["Simplify 2³ × 2⁴", "2⁷", ["2¹²", "4⁷", "2¹"]],
  ["Simplify 5⁶ ÷ 5²", "5⁴", ["5³", "5⁸", "1³"]],
  ["Evaluate 3⁰", "1", ["0", "3", "30"]],
  ["Simplify (x²)³", "x⁶", ["x⁵", "x⁸", "2x³"]],
  ["Evaluate 2⁻²", "1/4", ["−4", "4", "−1/4"]],
];
for (const [prompt, answer, wrong] of indexItems) {
  questions.push({ type: "mcq", prompt, options: shuffle([answer, ...wrong], rand), answer, difficulty: 2, kps: ["F2-IND"] });
}
questions.push({ type: "true_false", prompt: "True or false: a⁰ = 1 for any non-zero number a.", options: ["True", "False"], answer: "True", difficulty: 1, kps: ["F2-IND"] });

// Fractions
const fracItems: [string, string, string[]][] = [
  ["1/2 + 1/4 =", "3/4", ["2/6", "1/6", "2/4"]],
  ["2/3 − 1/6 =", "1/2", ["1/3", "1/6", "3/6"]],
  ["3/5 × 10 =", "6", ["30/5", "13/5", "3/50"]],
  ["Which fraction is largest?", "3/4", ["2/3", "5/8", "1/2"]],
  ["1/3 ÷ 1/6 =", "2", ["1/18", "1/2", "3"]],
];
for (const [prompt, answer, wrong] of fracItems) {
  questions.push({ type: "mcq", prompt, options: shuffle([answer, ...wrong], rand), answer, difficulty: 2, kps: ["F2-FRAC"] });
}

export const necta: SeedCurriculum = {
  slug: "necta-ftna-math",
  name: "NECTA Form Two — Basic Mathematics (sample)",
  subject: "Mathematics",
  description: "A small sample of Form Two Basic Mathematics topics, included to show the engine works with any curriculum.",
  levels: [{
    code: "F2", name: "Form Two",
    knowledgePoints: [
      { code: "F2-FRAC",  name: "Fractions",                  category: "number",      isCore: true,  description: "Adding, subtracting, multiplying and dividing fractions." },
      { code: "F2-PCT",   name: "Percentages",                category: "number",      isCore: true,  description: "Percentage of a quantity, discounts." },
      { code: "F2-RATIO", name: "Ratio & proportion",         category: "number",      isCore: false, description: "Sharing in a given ratio." },
      { code: "F2-ALG",   name: "Linear equations",           category: "algebra",     isCore: true,  description: "Solving equations in one unknown." },
      { code: "F2-IND",   name: "Indices",                    category: "algebra",     isCore: false, description: "Laws of indices, zero and negative powers." },
      { code: "F2-MENS",  name: "Area & perimeter",           category: "measurement", isCore: true,  description: "Rectangles and composite shapes." },
    ],
    questions,
  }],
};

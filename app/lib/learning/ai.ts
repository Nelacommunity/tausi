// AI pipeline for the learning platform: drafting curriculum-aligned questions
// for teachers, and writing (once, then cached) explanations for students.
// Every call asks Gemini for JSON against a schema and validates it with zod
// before anything touches the database.

import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";
import { z } from "zod";
import { GEMINI_MODEL, LOW_THINKING } from "@/app/lib/ai";
import { DRAFT_BATCH } from "./limits";
import type { QuestionType } from "./grading";

function model(system: string, schema: ResponseSchema) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: system,
    generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.8, ...LOW_THINKING },
  });
}

// ── Question drafting ────────────────────────────────────────────────────

export interface KpBrief { code: string; name: string; description: string }

export interface DraftRequest {
  curriculum: string;
  level: string;
  kps: KpBrief[];
  counts: Partial<Record<QuestionType, number>>;
  /** A few approved bank questions, so drafts match the house style. */
  examples: { type: string; prompt: string; options: string[]; answer: string }[];
  /** Prompts already in the exam — drafts must not repeat them. */
  avoid: string[];
  teacherNote?: string;
}

export interface DraftedQuestion {
  type: QuestionType;
  prompt: string;
  options: string[];
  answer: string;
  difficulty: 1 | 2 | 3;
  kpCodes: string[];
}

const QUESTION_SYSTEM = `You are an experienced teacher writing ORIGINAL practice questions aligned to a curriculum's knowledge points (KPs). The questions help students find their weak areas and help teachers build curriculum-aligned practice exams.

Rules:
- Every question must test at least one of the given KP codes, and list them in kpCodes.
- Never copy questions from real past exam papers; write new ones.
- Types:
  • "mcq": exactly 4 distinct options, exactly one correct; "answer" is the exact text of the correct option.
  • "true_false": options must be exactly ["True", "False"]; "answer" is "True" or "False". Start the prompt with "True or false:".
  • "fill_blank": options is []; mark the gap with ___; the answer must be short and unambiguous (one word, character or number); say in the prompt what to fill in.
- Distractors should reflect real student mistakes, not nonsense.
- difficulty: 1 = recall, 2 = apply, 3 = discriminate between close alternatives.
- Write instructions in English. Keep target-language content (e.g. Chinese characters) in the target language; add pinyin only where a question tests meaning rather than reading.
- No duplicates of the "avoid" list or of each other.`;

const questionSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    questions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          type: { type: SchemaType.STRING, format: "enum", enum: ["mcq", "true_false", "fill_blank"] },
          prompt: { type: SchemaType.STRING },
          options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          answer: { type: SchemaType.STRING },
          difficulty: { type: SchemaType.INTEGER },
          kpCodes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ["type", "prompt", "options", "answer", "difficulty", "kpCodes"],
      },
    },
  },
  required: ["questions"],
};

const draftedSchema = z.object({
  type: z.enum(["mcq", "true_false", "fill_blank"]),
  prompt: z.string().trim().min(3).max(600),
  options: z.array(z.string().trim().min(1).max(200)).max(6),
  answer: z.string().trim().min(1).max(200),
  difficulty: z.number().int().min(1).max(3),
  kpCodes: z.array(z.string()).min(1),
});

/** Validate one AI question; returns null if it is malformed. */
export function validateDrafted(raw: unknown, allowedKps: Set<string>): DraftedQuestion | null {
  const parsed = draftedSchema.safeParse(raw);
  if (!parsed.success) return null;
  const q = parsed.data;
  const kpCodes = q.kpCodes.filter((c) => allowedKps.has(c));
  if (!kpCodes.length) return null;
  if (q.type === "mcq" && (q.options.length !== 4 || new Set(q.options).size !== 4 || !q.options.includes(q.answer))) return null;
  if (q.type === "true_false") {
    if (!["True", "False"].includes(q.answer)) return null;
    q.options = ["True", "False"];
  }
  if (q.type === "fill_blank") q.options = [];
  return { ...q, difficulty: q.difficulty as 1 | 2 | 3, kpCodes };
}

/**
 * Split a request into batches of at most DRAFT_BATCH questions, keeping the
 * type mix: e.g. 12 mcq + 18 fill_blank → three batches of 10.
 */
function batchCounts(counts: Partial<Record<QuestionType, number>>): Partial<Record<QuestionType, number>>[] {
  const queue = (Object.entries(counts) as [QuestionType, number][]).flatMap(([t, n]) => Array<QuestionType>(n ?? 0).fill(t));
  const batches: Partial<Record<QuestionType, number>>[] = [];
  for (let i = 0; i < queue.length; i += DRAFT_BATCH) {
    const b: Partial<Record<QuestionType, number>> = {};
    for (const t of queue.slice(i, i + DRAFT_BATCH)) b[t] = (b[t] ?? 0) + 1;
    batches.push(b);
  }
  return batches;
}

const promptKey = (p: string) => p.replace(/\s+/g, "").toLowerCase();

/**
 * Draft questions for the requested counts. Large requests run as parallel
 * batches (each told about the others' focus via a batch note) and are
 * de-duplicated by prompt before returning.
 */
export async function draftQuestions(req: DraftRequest): Promise<DraftedQuestion[]> {
  const batches = batchCounts(req.counts);
  const results = await Promise.allSettled(batches.map((counts, i) => draftBatch({
    ...req, counts,
    teacherNote: [req.teacherNote, batches.length > 1 ? `This is batch ${i + 1} of ${batches.length}; vary the knowledge points and sentence topics so batches do not overlap.` : ""].filter(Boolean).join(" "),
  })));
  const ok = results.filter((r): r is PromiseFulfilledResult<DraftedQuestion[]> => r.status === "fulfilled");
  if (!ok.length) throw (results[0] as PromiseRejectedResult).reason;
  const seen = new Set(req.avoid.map(promptKey));
  return ok.flatMap((r) => r.value).filter((q) => {
    const k = promptKey(q.prompt);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function draftBatch(req: DraftRequest): Promise<DraftedQuestion[]> {
  const wanted = Object.entries(req.counts).filter(([, n]) => (n ?? 0) > 0).map(([t, n]) => `${n} × ${t}`).join(", ");
  const prompt = [
    `Curriculum: ${req.curriculum}`,
    `Level: ${req.level}`,
    `Knowledge points (spread questions across all of them):`,
    ...req.kps.map((k) => `- ${k.code}: ${k.name} — ${k.description}`),
    `Write: ${wanted}.`,
    req.examples.length ? `Style examples from the approved bank:\n${JSON.stringify(req.examples)}` : "",
    req.avoid.length ? `Avoid repeating these prompts:\n${JSON.stringify(req.avoid.slice(0, 60))}` : "",
    req.teacherNote ? `Teacher's note: ${req.teacherNote}` : "",
  ].filter(Boolean).join("\n");

  const result = await model(QUESTION_SYSTEM, questionSchema).generateContent(prompt);
  const data = JSON.parse(result.response.text()) as { questions?: unknown[] };
  const allowed = new Set(req.kps.map((k) => k.code));
  return (data.questions ?? []).map((q) => validateDrafted(q, allowed)).filter((q): q is DraftedQuestion => q !== null);
}

// ── Explanations (cached per question + language) ───────────────────────

export type ExplainLang = "en" | "sw" | "zh";

const LANG_NAME: Record<ExplainLang, string> = { en: "English", sw: "Swahili (Kiswahili)", zh: "Simplified Chinese" };

export interface ExplainInput {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
  kps: string[];
}

export interface Explanation { id: string; explanation: string; culturalNote: string | null }

const explainSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          explanation: { type: SchemaType.STRING },
          culturalNote: { type: SchemaType.STRING },
        },
        required: ["id", "explanation", "culturalNote"],
      },
    },
  },
  required: ["items"],
};

export async function explainQuestions(questions: ExplainInput[], lang: ExplainLang): Promise<Explanation[]> {
  const system = `You explain answers to students who have just finished a practice exam. Write in ${LANG_NAME[lang]}.
For each question: 2–3 short sentences explaining WHY the correct answer is right and what the common mistake is. Quote target-language words (e.g. Chinese characters) as they are, with pinyin where it helps.
culturalNote: one sentence of cultural context ONLY when it genuinely helps understanding (e.g. why 吃了吗 works as a greeting, why family names come first). Otherwise return an empty string. Never invent facts.`;
  const result = await model(system, explainSchema).generateContent(JSON.stringify(questions));
  const data = JSON.parse(result.response.text()) as { items?: { id: string; explanation: string; culturalNote: string }[] };
  const ids = new Set(questions.map((q) => q.id));
  return (data.items ?? [])
    .filter((i) => ids.has(i.id) && typeof i.explanation === "string" && i.explanation.trim())
    .map((i) => ({ id: i.id, explanation: i.explanation.trim(), culturalNote: i.culturalNote?.trim() || null }));
}

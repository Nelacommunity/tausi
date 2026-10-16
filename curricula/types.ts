// Shape of a curriculum as data. Seeded into the curricula / curriculum_levels /
// knowledge_points / questions tables by scripts/seed.ts — the app itself never
// hard-codes a curriculum.

export type QuestionType = "mcq" | "true_false" | "fill_blank";

export interface SeedQuestion {
  type: QuestionType;
  prompt: string;
  /** Option texts for mcq/true_false; empty for fill_blank. */
  options: string[];
  /** Exact correct option text (mcq/true_false) or accepted answer (fill_blank). */
  answer: string;
  difficulty: 1 | 2 | 3;
  /** Knowledge-point codes within the same level. */
  kps: string[];
}

export interface SeedKnowledgePoint {
  code: string;
  name: string;
  category: string;
  description: string;
  isCore: boolean;
}

export interface SeedLevel {
  code: string;
  name: string;
  knowledgePoints: SeedKnowledgePoint[];
  questions: SeedQuestion[];
}

export interface SeedCurriculum {
  slug: string;
  name: string;
  subject: string;
  description: string;
  levels: SeedLevel[];
}

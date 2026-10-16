// Shapes shared by the learning API routes and the client pages.
import type { QuestionType } from "./grading";

export type Provenance = "seed" | "ai_draft" | "ai_edited" | "teacher";
export type QuestionStatus = "draft" | "approved" | "rejected";

export interface KpNode {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  isCore: boolean;
  questionCount: number;
}

export interface LevelNode { id: string; code: string; name: string; kps: KpNode[] }

export interface CurriculumNode {
  id: string;
  slug: string;
  name: string;
  subject: string;
  description: string;
  levels: LevelNode[];
}

/** A question as the teacher sees it (includes the answer). */
export interface TeacherQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  answer: string;
  difficulty: number;
  provenance: Provenance;
  status: QuestionStatus;
  kpIds: string[];
  /** True when the teacher may edit it (they created it). Bank questions are read-only. */
  editable: boolean;
}

/** A question as a student sees it before answering (no answer). */
export interface StudentQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
}

export interface AssessmentSummary {
  id: string;
  title: string;
  status: "draft" | "published";
  curriculumName: string;
  levelName: string;
  itemCount: number;
  createdAt: string;
}

export interface AssessmentDetail {
  id: string;
  title: string;
  status: "draft" | "published";
  curriculumId: string;
  levelId: string;
  curriculumName: string;
  levelName: string;
  questions: TeacherQuestion[];
}

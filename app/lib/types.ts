export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  // Credits-based system — primary access control
  credits: number;
  // Legacy subscription fields — kept for backward compat, not used for access control
  tier?: "free" | "premium";
  subscription_status?: string;
  subscription_end?: string | null;
  usage_month?: string | null;
  predictions_used?: number;
  marking_schemes_used?: number;
  ai_markings_used?: number;
  study_sessions_used?: number;
  created_at: string;
}

export interface Exam {
  id: string;
  user_id: string;
  title: string;
  original_filenames: string[];
  pdf_storage_paths: string[];
  predicted_exam: string;
  marking_scheme: string;
  is_public: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  exam_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface MarkingSession {
  id: string;
  user_id: string;
  title: string;
  answer_sheet_paths: string[];
  original_filenames: string[];
  marking_scheme_text: string;
  exam_id: string | null;
  total_marks: number | null;
  max_marks: number | null;
  percentage: number | null;
  raw_feedback: string;
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  title: string;
  document_paths: string[];
  original_filenames: string[];
  created_at: string;
}

export interface StudyMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// Tier limits
export const FREE_LIMITS = {
  predictions: 5,
  marking_schemes: 5,
  ai_markings: 10,
  study_sessions: 5,
} as const;

export const PREMIUM_PRICE_MONTHLY_TZS = 5_000;
export const PREMIUM_PRICE_ANNUAL_TZS = 50_000;

export interface ExamPaper {
  id: string;
  user_id: string;
  name: string;
  exam_type: string;
  year: number;
  subject: string;
  file_paths: string[];
  original_filenames: string[];
  exam_structure: string | null;  // extracted at upload time, enables fast library generation
  created_at: string;
}

export interface WriteDocument {
  id: string;
  user_id: string;
  title: string;
  content: string; // Tiptap HTML
  created_at: string;
  updated_at: string;
}

// ── Gemini model configuration ───────────────────────────────
// Single source of truth for which Gemini model every AI route uses.
// We standardise on the Flash family — fast and cost-efficient, which
// suits question drafting, practice papers, marking, tutoring and writing at scale.
//
// To change the model app-wide, edit this one constant.

/** Default model for all AI generation/chat routes. */
export const GEMINI_MODEL = "gemini-2.5-flash";

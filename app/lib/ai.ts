// ── Gemini model configuration ───────────────────────────────
// Single source of truth for which Gemini model every AI route uses.
// Override with GEMINI_MODEL in the environment; otherwise the default below.
// Google retires older models for new keys, so keep this pinned to a current
// version rather than an alias that can change behaviour unannounced.

/** Model for all AI generation/chat routes. */
export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";

/**
 * Lower "thinking" effort for short, structured tasks (question drafts,
 * explanations): ~4× faster with the same JSON quality in testing. Not typed
 * by @google/generative-ai 0.24, but passed through to the API as-is.
 */
export const LOW_THINKING = { thinkingConfig: { thinkingLevel: "low" } } as Record<string, unknown>;

// Limits shared by the exam builder UI and its API.

/** Most AI-drafted questions of one type in a single request. */
export const MAX_PER_TYPE = 30;
/** Most AI-drafted questions in a single request (all types together). */
export const MAX_PER_DRAFT = 40;
/** Questions per AI call; larger requests are split and run in parallel. */
export const DRAFT_BATCH = 10;

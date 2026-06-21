// ── Shared SEO keyword sets ──────────────────────────────────
// Appended (de-duped) to each page's own keywords. The keywords meta tag is
// weak on its own — the brand + exam terms here also appear in titles,
// descriptions and JSON-LD across the app, which is what actually ranks.

/** Brand-name variants — so Tausi ranks for searches of its own name. */
export const BRAND_KEYWORDS = [
  "Tausi", "Tausi AI", "Tausi app", "tausi.app", "Tausi exam",
  "Tausi Tanzania", "Tausi web", "Tausi exam prediction", "Tausi study app",
  "Tausi NECTA", "Tausi mitihani",
  "Vylos", "Vylos.co", "Vylos Tausi", "Tausi parent company",
];

/** Tanzanian NECTA examinations — the core local search intent. */
export const TANZANIA_EXAM_KEYWORDS = [
  "NECTA", "NECTA exams", "NECTA past papers", "NECTA results", "NECTA mock exams",
  "ACSEE", "ACSEE past papers", "ACSEE prediction", "ACSEE mock", "form six exams Tanzania",
  "CSEE", "CSEE past papers", "CSEE prediction", "CSEE mock", "form four exams Tanzania",
  "FTNA", "FTNA past papers", "form two national assessment Tanzania",
  "PSLE", "PSLE Tanzania", "primary school leaving examination", "standard seven exams Tanzania",
  "mitihani ya necta", "mitihani Tanzania", "Tanzania past papers", "mock exams Tanzania",
];

/** Combined set safe to spread into any page's `keywords`. */
export const TAUSI_KEYWORDS = [...BRAND_KEYWORDS, ...TANZANIA_EXAM_KEYWORDS];

/** Merge arbitrary page keywords with the shared set, de-duplicated. */
export function withSharedKeywords(...pageKeywords: string[]): string[] {
  return Array.from(new Set([...pageKeywords, ...TAUSI_KEYWORDS]));
}

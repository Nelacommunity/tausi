/**
 * Mastery & readiness — the diagnosis model behind Tausi.
 *
 * ── Mastery (per student, per knowledge point) ──────────────────────────
 *
 *   mastery = (P · m₀ + Σ wᵢ · cᵢ) / (P + Σ wᵢ)
 *
 *   cᵢ  1 if answer i was correct, 0 if not
 *   wᵢ  recency weight = 0.5 ^ (ageᵢ / H): an answer loses half its
 *       influence every H days, so recent work counts most
 *   m₀  prior mastery before any evidence (0.5 = "unknown")
 *   P   prior strength, in "virtual answers" — stops one lucky or unlucky
 *       answer from swinging mastery to 0 % or 100 %
 *
 * With P = 2: one correct answer → 67 %, three in a row → 80 %, ten in a
 * row → 92 %. A KP is "weak" below 0.5 and "mastered" at 0.8 or above.
 *
 * ── Readiness (per student, per curriculum level) ───────────────────────
 *
 *   level score = weighted mean of KP mastery (core KPs weight 2, others 1;
 *                 unpractised KPs count at the prior, 0.5)
 *   ready       = score ≥ 0.75, at least 70 % of KPs practised, and no core
 *                 KP below 0.5
 *   almost      = score ≥ 0.6
 *   not_yet     = otherwise
 *
 * At-risk KPs are the practised KPs below 0.5, weakest first.
 */

export const PRIOR_MASTERY = 0.5;
export const PRIOR_STRENGTH = 2;
export const HALF_LIFE_DAYS = 14;
export const WEAK_BELOW = 0.5;
export const MASTERED_AT = 0.8;
export const READY_SCORE = 0.75;
export const ALMOST_SCORE = 0.6;
export const READY_COVERAGE = 0.7;

const DAY_MS = 86_400_000;

export interface AnswerEvent {
  isCorrect: boolean;
  /** ISO timestamp or epoch ms */
  at: string | number;
}

export function recencyWeight(at: string | number, now = Date.now()): number {
  const ageDays = Math.max(0, (now - new Date(at).getTime()) / DAY_MS);
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

export function computeMastery(events: AnswerEvent[], now = Date.now()): number {
  let num = PRIOR_STRENGTH * PRIOR_MASTERY;
  let den = PRIOR_STRENGTH;
  for (const e of events) {
    const w = recencyWeight(e.at, now);
    num += w * (e.isCorrect ? 1 : 0);
    den += w;
  }
  return num / den;
}

export type MasteryBand = "unpractised" | "weak" | "developing" | "mastered";

export function masteryBand(mastery: number, attempts: number): MasteryBand {
  if (attempts === 0) return "unpractised";
  if (mastery < WEAK_BELOW) return "weak";
  if (mastery >= MASTERED_AT) return "mastered";
  return "developing";
}

export interface KpState {
  kpId: string;
  code: string;
  name: string;
  isCore: boolean;
  mastery: number;
  attempts: number;
}

export type ReadinessStatus = "ready" | "almost" | "not_yet";

export interface Readiness {
  score: number;
  coverage: number;
  status: ReadinessStatus;
  atRisk: KpState[];
}

export function computeReadiness(kps: KpState[]): Readiness {
  if (kps.length === 0) return { score: 0, coverage: 0, status: "not_yet", atRisk: [] };
  let num = 0, den = 0, practised = 0;
  for (const kp of kps) {
    const w = kp.isCore ? 2 : 1;
    num += w * (kp.attempts > 0 ? kp.mastery : PRIOR_MASTERY);
    den += w;
    if (kp.attempts > 0) practised++;
  }
  const score = num / den;
  const coverage = practised / kps.length;
  const atRisk = kps
    .filter((k) => k.attempts > 0 && k.mastery < WEAK_BELOW)
    .sort((a, b) => a.mastery - b.mastery);
  const coreWeak = atRisk.some((k) => k.isCore);
  const status: ReadinessStatus =
    score >= READY_SCORE && coverage >= READY_COVERAGE && !coreWeak ? "ready"
    : score >= ALMOST_SCORE ? "almost"
    : "not_yet";
  return { score, coverage, status, atRisk };
}

/**
 * Pick the KPs an adaptive practice set should target: weakest practised KPs
 * first (below "mastered"), then unpractised core KPs, then everything else.
 */
export function pickPracticeTargets(kps: KpState[], count = 3): KpState[] {
  const practisedWeak = kps.filter((k) => k.attempts > 0 && k.mastery < MASTERED_AT).sort((a, b) => a.mastery - b.mastery);
  const unpractisedCore = kps.filter((k) => k.attempts === 0 && k.isCore);
  const rest = kps.filter((k) => !practisedWeak.includes(k) && !unpractisedCore.includes(k)).sort((a, b) => a.mastery - b.mastery);
  return [...practisedWeak, ...unpractisedCore, ...rest].slice(0, count);
}

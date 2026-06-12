import type { SupabaseClient } from "@supabase/supabase-js";

// ── Feature keys ────────────────────────────────────────────
export type Feature =
  | "exam_prediction"
  | "marking_scheme"
  | "ai_marking"
  | "exam_chat"
  | "study_chat"
  | "ai_writer"
  | "paper_prediction"
  | "paper_chat";

// ── Credit costs per action ──────────────────────────────────
export const CREDIT_COSTS: Record<Feature, number> = {
  exam_prediction:  4,
  marking_scheme:   3,
  ai_marking:       3,
  exam_chat:        2,
  study_chat:       2,
  ai_writer:        1,
  paper_prediction: 4,
  paper_chat:       1,
};

// ── Human-readable labels ────────────────────────────────────
export const FEATURE_LABELS: Record<Feature, string> = {
  exam_prediction:  "Exam Prediction",
  marking_scheme:   "Marking Scheme",
  ai_marking:       "AI Marking",
  exam_chat:        "Exam Chat",
  study_chat:       "Study Room",
  ai_writer:        "AI Writer",
  paper_prediction: "Library Prediction",
  paper_chat:       "Paper Chat",
};

// ── Credit check result ──────────────────────────────────────
export interface CreditCheckResult {
  allowed: boolean;
  balance: number;
}

// ── Core: check + deduct credits atomically ──────────────────
export async function checkAndDeductCredits(
  supabase: SupabaseClient,
  userId: string,
  feature: Feature
): Promise<CreditCheckResult> {
  const cost = CREDIT_COSTS[feature];

  // Primary path: atomic deduct via SECURITY DEFINER RPC
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "deduct_credits",
    { p_user_id: userId, p_credits: cost }
  );

  if (!rpcError) {
    const allowed = rpcResult === true;
    const balance = await getCreditBalance(supabase, userId);
    return { allowed, balance };
  }

  // Fallback: manual check + update (RPC not yet deployed in dev)
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();

  const credits: number = (profile?.credits as number) ?? 0;

  if (credits < cost) {
    return { allowed: false, balance: credits };
  }

  await supabase
    .from("profiles")
    .update({ credits: credits - cost })
    .eq("id", userId);

  return { allowed: true, balance: credits - cost };
}

// ── Get credit balance ───────────────────────────────────────
export async function getCreditBalance(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();
  return (data?.credits as number) ?? 0;
}

// ── Insufficient credits error response ─────────────────────
export function insufficientCreditsError(
  feature: Feature,
  balance: number,
  cost: number
): Response {
  const label = FEATURE_LABELS[feature];
  return new Response(
    JSON.stringify({
      error: `Not enough credits for ${label} — you have ${balance} credit${balance !== 1 ? "s" : ""} but this action costs ${cost}. Buy more credits on the pricing page.`,
      code: "INSUFFICIENT_CREDITS",
      feature,
      balance,
      cost,
    }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}

// ── Legacy token limit exports (kept for backward compat) ────
// These allow PricingClient and other imports to still compile.

export const FREE_TOKEN_LIMITS: Record<Feature, number> = {
  exam_prediction:   80_000,
  marking_scheme:    50_000,
  ai_marking:       150_000,
  exam_chat:         30_000,
  study_chat:        30_000,
  ai_writer:         15_000,
  paper_prediction:  80_000,
  paper_chat:        10_000,
};

export const PREMIUM_TOKEN_LIMITS: Record<Feature, number> = {
  exam_prediction:  2_000_000,
  marking_scheme:   1_200_000,
  ai_marking:       4_000_000,
  exam_chat:          600_000,
  study_chat:         600_000,
  ai_writer:          300_000,
  paper_prediction: 2_000_000,
  paper_chat:         300_000,
};

export interface TokenCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  isPremium: boolean;
}

/** @deprecated — use checkAndDeductCredits instead */
export async function checkTokenLimit(
  supabase: SupabaseClient,
  userId: string,
  feature: Feature
): Promise<TokenCheckResult> {
  const result = await checkAndDeductCredits(supabase, userId, feature);
  return {
    allowed: result.allowed,
    used: 0,
    limit: CREDIT_COSTS[feature],
    remaining: result.balance,
    isPremium: false,
  };
}

/** @deprecated — no-op, credits are deducted atomically in checkAndDeductCredits */
export async function recordTokenUsage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _supabase: SupabaseClient,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _feature: Feature,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _tokens: number
): Promise<void> {
  // no-op: credits are deducted atomically before the AI call
}

/** @deprecated — use getCreditBalance */
export async function getMonthlyUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<{ usage: Record<Feature, number>; isPremium: boolean }> {
  void (await getCreditBalance(supabase, userId));
  const usage = Object.fromEntries(
    (Object.keys(FREE_TOKEN_LIMITS) as Feature[]).map((k) => [k, 0])
  ) as Record<Feature, number>;
  return { usage, isPremium: false };
}

/** @deprecated — use insufficientCreditsError */
export function tokenLimitError(feature: Feature, used: number, limit: number): Response {
  return insufficientCreditsError(feature, used, limit);
}

// Legacy alias
export { tokenLimitError as usageLimitError };

/** @deprecated — kept so old study/route.ts still compiles */
export async function checkAndIncrementUsage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _supabase: SupabaseClient,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _type: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  return { allowed: true, used: 0, limit: -1 };
}

import type { SupabaseClient } from "@supabase/supabase-js";

// ── Feature keys ────────────────────────────────────────────
export type Feature =
  | "exam_prediction"
  | "marking_scheme"
  | "ai_marking"
  | "exam_chat"
  | "study_chat"
  | "ai_writer"
  | "paper_prediction";

// ── Monthly token budgets ────────────────────────────────────
// Based on Gemini 2.5 Flash typical usage:
//   exam_prediction  ≈ 12–22k tokens each   (PDF input + long exam output)
//   marking_scheme   ≈  7–14k tokens each   (text only)
//   ai_marking       ≈ 20–40k tokens each   (2 PDFs in + detailed report)
//   exam_chat/study  ≈  2– 5k tokens / msg
//   ai_writer        ≈  1– 3k tokens / req
//   paper_prediction ≈ 12–22k tokens each   (same as exam_prediction)

export const FREE_TOKEN_LIMITS: Record<Feature, number> = {
  exam_prediction:   80_000,   // ~4–6 predictions
  marking_scheme:    50_000,   // ~4–7 schemes
  ai_marking:       150_000,   // ~4–7 markings
  exam_chat:         30_000,   // ~6–15 messages
  study_chat:        30_000,   // ~6–15 messages
  ai_writer:         15_000,   // ~5–15 AI requests
  paper_prediction:  80_000,   // ~4–6 predictions
};

export const PREMIUM_TOKEN_LIMITS: Record<Feature, number> = {
  exam_prediction:  2_000_000,   // ~90–165 predictions
  marking_scheme:   1_200_000,   // ~85–170 schemes
  ai_marking:       4_000_000,   // ~100–200 markings
  exam_chat:          600_000,   // ~120–300 messages
  study_chat:         600_000,   // ~120–300 messages
  ai_writer:          300_000,   // ~100–300 AI requests
  paper_prediction: 2_000_000,   // ~90–165 predictions
};

export const FEATURE_LABELS: Record<Feature, string> = {
  exam_prediction:  "Exam Prediction",
  marking_scheme:   "Marking Scheme",
  ai_marking:       "AI Marking",
  exam_chat:        "Exam Chat",
  study_chat:       "Study Room",
  ai_writer:        "AI Writer",
  paper_prediction: "Library Prediction",
};

// ── Helpers ──────────────────────────────────────────────────
function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export interface TokenCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  isPremium: boolean;
}

export async function checkTokenLimit(
  supabase: SupabaseClient,
  userId: string,
  feature: Feature
): Promise<TokenCheckResult> {
  const month = currentMonth();

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, subscription_status")
    .eq("id", userId)
    .single();

  const isPremium =
    profile?.tier === "premium" && profile?.subscription_status === "active";

  const limit = isPremium
    ? PREMIUM_TOKEN_LIMITS[feature]
    : FREE_TOKEN_LIMITS[feature];

  const { data: row } = await supabase
    .from("token_usage_monthly")
    .select("tokens")
    .eq("user_id", userId)
    .eq("month", month)
    .eq("feature", feature)
    .single();

  const used = (row?.tokens as number) ?? 0;

  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    isPremium,
  };
}

export async function recordTokenUsage(
  supabase: SupabaseClient,
  userId: string,
  feature: Feature,
  tokens: number
): Promise<void> {
  if (!tokens || tokens <= 0) return;
  await supabase.rpc("increment_token_usage", {
    p_user_id: userId,
    p_month:   currentMonth(),
    p_feature: feature,
    p_tokens:  tokens,
  });
}

export async function getMonthlyUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<{ usage: Record<Feature, number>; isPremium: boolean }> {
  const month = currentMonth();

  const [profileRes, usageRes] = await Promise.all([
    supabase.from("profiles").select("tier, subscription_status").eq("id", userId).single(),
    supabase.from("token_usage_monthly").select("feature, tokens").eq("user_id", userId).eq("month", month),
  ]);

  const isPremium =
    profileRes.data?.tier === "premium" &&
    profileRes.data?.subscription_status === "active";

  const usage = Object.fromEntries(
    (Object.keys(FREE_TOKEN_LIMITS) as Feature[]).map(k => [k, 0])
  ) as Record<Feature, number>;

  for (const row of usageRes.data ?? []) {
    if (row.feature in usage) usage[row.feature as Feature] = row.tokens as number;
  }

  return { usage, isPremium };
}

export function tokenLimitError(feature: Feature, used: number, limit: number): Response {
  const label = FEATURE_LABELS[feature];
  const kUsed  = (used  / 1000).toFixed(1);
  const kLimit = (limit / 1000).toFixed(1);
  return new Response(
    JSON.stringify({
      error: `Monthly token limit reached for ${label} — ${kUsed}k / ${kLimit}k tokens used. Upgrade to Premium for much higher limits.`,
      code:  "TOKEN_LIMIT_REACHED",
      feature,
      used,
      limit,
    }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}

// Legacy alias — keeps old call-sites from breaking during migration
export { tokenLimitError as usageLimitError };

/** @deprecated — kept so old study/route.ts still compiles. Remove after refactor. */
export async function checkAndIncrementUsage(
  supabase: SupabaseClient,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _type: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  return { allowed: true, used: 0, limit: -1 };
}

import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createMobilePayment, toIdempKey } from "@/lib/snippe";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

// ── Credit packs ──────────────────────────────────────────────
export const CREDIT_PACKS = {
  starter:  { credits: 20,  amount_tzs: 2_500,  label: "Starter"  },
  scholar:  { credits: 60,  amount_tzs: 6_000,  label: "Scholar"  },
  champion: { credits: 175, amount_tzs: 15_000, label: "Champion" },
} as const;

export type PackKey = keyof typeof CREDIT_PACKS;

// Max number of identical packs a user can buy in one transaction.
const MAX_QUANTITY = 20;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "You must be signed in to purchase credits.", redirect: "/login" }, { status: 401 });
  }

  const rl = checkRateLimit(`${user.id}:checkout`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  let body: { pack?: string; phone?: string; quantity?: number };
  try { body = await request.json(); }
  catch { return jsonErr("Invalid JSON body", 400); }

  const { pack: packKey, phone } = body;

  if (!packKey || !(packKey in CREDIT_PACKS)) {
    return jsonErr(`Invalid pack. Choose one of: ${Object.keys(CREDIT_PACKS).join(", ")}`, 400);
  }
  if (!phone?.trim()) {
    return jsonErr("Phone number is required", 400);
  }

  // Quantity: how many of the same pack to buy in one payment. Default 1.
  const quantity = Math.max(1, Math.min(Math.floor(Number(body.quantity) || 1), MAX_QUANTITY));

  const basePack = CREDIT_PACKS[packKey as PackKey];
  // Scale credits and amount by the chosen quantity. The webhook grants the
  // `credits` stored on the purchase row, so totals flow through automatically.
  const pack = {
    ...basePack,
    credits:    basePack.credits * quantity,
    amount_tzs: basePack.amount_tzs * quantity,
  };

  // Get display name for the Snippe customer object
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const fullName = ((profile?.full_name as string | null) ?? "").trim();
  // Fall back to email username (e.g. "john.doe" from "john.doe@gmail.com") so
  // the Snippe dashboard shows a real identifier instead of the generic "Tausi User".
  const emailUsername = (user.email ?? "").split("@")[0].replace(/[._+]/g, " ").trim();
  const displayName = fullName || emailUsername || "Tausi User";
  const nameParts = displayName.split(/\s+/);
  const firstname = nameParts[0] || "Tausi";
  const lastname  = nameParts.slice(1).join(" ") || "User";

  // Create a pending purchase record first
  const { data: purchase, error: insertError } = await supabase
    .from("credit_purchases")
    .insert({
      user_id:    user.id,
      snippe_ref: `pending-${Date.now()}`,
      pack:       packKey,
      credits:    pack.credits,
      amount_tzs: pack.amount_tzs,
      status:     "pending",
    })
    .select("id")
    .single();

  if (insertError || !purchase) {
    return jsonErr("Failed to create purchase record: " + (insertError?.message ?? "unknown"), 500);
  }

  const purchaseId = purchase.id as string;

  try {
    const snippeData = await createMobilePayment(
      {
        amount:      pack.amount_tzs,
        phoneNumber: phone.trim(),
        customer: {
          firstname,
          lastname,
          email: user.email ?? "user@tausi.app",
        },
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/snippe`,
        metadata: {
          user_id:     user.id,
          pack:        packKey,
          quantity,
          credits:     pack.credits,
          purchase_id: purchaseId,
        },
      },
      toIdempKey(purchaseId) // UUID → 30-char hex string
    );

    const snippeRef = snippeData.reference;
    if (!snippeRef) {
      throw new Error("Snippe did not return a reference");
    }

    // Use admin client — the user-auth client is blocked by RLS on UPDATE.
    // Non-fatal: if this fails, the poll endpoint heals the row on first check.
    try {
      const admin = createAdminClient();
      await admin
        .from("credit_purchases")
        .update({ snippe_ref: snippeRef })
        .eq("id", purchaseId);
    } catch (adminErr) {
      console.error("[checkout] snippe_ref update failed:", adminErr instanceof Error ? adminErr.message : adminErr);
    }

    return Response.json({
      reference:   snippeRef,
      purchase_id: purchaseId,
      status:      snippeData.status ?? "pending",
      payment_url: snippeData.payment_url ?? null,
      message:     "Check your phone to confirm payment",
    });
  } catch (err) {
    try {
      const admin = createAdminClient();
      await admin.from("credit_purchases").delete().eq("id", purchaseId);
    } catch { /* ignore cleanup errors */ }
    const msg = err instanceof Error ? err.message : "Payment initiation failed";
    return jsonErr(msg, 502);
  }
}

function jsonErr(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
}

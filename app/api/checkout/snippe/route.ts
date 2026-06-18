import { createClient } from "@/app/lib/supabase/server";
import { createMobilePayment } from "@/lib/snippe";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

// ── Credit packs ──────────────────────────────────────────────
export const CREDIT_PACKS = {
  starter:  { credits: 20,  amount_tzs: 2_500,  label: "Starter"  },
  scholar:  { credits: 60,  amount_tzs: 6_000,  label: "Scholar"  },
  champion: { credits: 175, amount_tzs: 15_000, label: "Champion" },
} as const;

export type PackKey = keyof typeof CREDIT_PACKS;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "You must be signed in to purchase credits.", redirect: "/login" }, { status: 401 });
  }

  const rl = checkRateLimit(`${user.id}:checkout`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  let body: { pack?: string; phone?: string };
  try { body = await request.json(); }
  catch { return jsonErr("Invalid JSON body", 400); }

  const { pack: packKey, phone } = body;

  if (!packKey || !(packKey in CREDIT_PACKS)) {
    return jsonErr(`Invalid pack. Choose one of: ${Object.keys(CREDIT_PACKS).join(", ")}`, 400);
  }
  if (!phone?.trim()) {
    return jsonErr("Phone number is required", 400);
  }

  const pack = CREDIT_PACKS[packKey as PackKey];

  // Create a pending purchase record first
  const { data: purchase, error: insertError } = await supabase
    .from("credit_purchases")
    .insert({
      user_id:    user.id,
      snippe_ref: `pending-${Date.now()}`, // temp ref, updated after Snippe responds
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
    // Provider is auto-detected from the phone number prefix in createMobilePayment
    const snippeData = await createMobilePayment(
      {
        amount:             pack.amount_tzs,
        phone:              phone.trim(),
        external_reference: purchaseId,
        description:        `Tausi ${pack.label} Pack — ${pack.credits} credits`,
        webhook_url:        `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/snippe`,
        metadata: {
          user_id:     user.id,
          pack:        packKey,
          credits:     pack.credits,
          purchase_id: purchaseId,
        },
      },
      purchaseId // idempotency key
    );

    const snippeRef = snippeData.reference;
    if (!snippeRef) {
      throw new Error("Snippe did not return a reference");
    }

    // Update the purchase record with the real Snippe reference
    await supabase
      .from("credit_purchases")
      .update({ snippe_ref: snippeRef })
      .eq("id", purchaseId);

    return Response.json({
      reference:   snippeRef,
      purchase_id: purchaseId,
      status:      snippeData.status ?? "pending",
      payment_url: snippeData.payment_url ?? null,
      message:     "Check your phone to confirm payment",
    });
  } catch (err) {
    // Clean up the pending purchase record on failure
    await supabase.from("credit_purchases").delete().eq("id", purchaseId);
    const msg = err instanceof Error ? err.message : "Payment initiation failed";
    return jsonErr(msg, 502);
  }
}

function jsonErr(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
}

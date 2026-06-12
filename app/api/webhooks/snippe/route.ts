import { createAdminClient } from "@/app/lib/supabase/admin";
import { verifyWebhookSignature, type SnippeWebhookPayload } from "@/lib/snippe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Read raw body for signature verification
  const rawBody = await request.text();

  const timestamp = request.headers.get("X-Webhook-Timestamp") ?? "";
  const signature = request.headers.get("X-Webhook-Signature") ?? "";
  const event     = request.headers.get("X-Webhook-Event") ?? "";

  // Verify signature (skip if secret not configured — useful for dev)
  if (process.env.SNIPPE_WEBHOOK_SECRET) {
    const valid = verifyWebhookSignature(rawBody, timestamp, signature);
    if (!valid) {
      console.warn("[snippe-webhook] Invalid signature");
      return new Response("Invalid signature", { status: 401 });
    }
  }

  let payload: SnippeWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as SnippeWebhookPayload;
  } catch {
    console.warn("[snippe-webhook] Could not parse JSON body");
    return new Response("Bad request", { status: 400 });
  }

  const supabase = createAdminClient();
  const { reference, external_reference } = payload.data ?? {};
  const lookupRef = reference || external_reference;

  console.log(`[snippe-webhook] event=${event} ref=${lookupRef}`);

  switch (event) {
    case "payment.completed": {
      if (!lookupRef) break;

      // Find the purchase by snippe reference OR external_reference (our purchase ID)
      const { data: purchase } = await supabase
        .from("credit_purchases")
        .select("id, user_id, credits, status")
        .or(`snippe_ref.eq.${reference},snippe_ref.eq.${external_reference}`)
        .single();

      if (!purchase) {
        console.warn(`[snippe-webhook] No purchase found for ref=${lookupRef}`);
        break;
      }

      if (purchase.status !== "pending") {
        console.log(`[snippe-webhook] Purchase ${purchase.id} already ${purchase.status} — skipping`);
        break;
      }

      // Add credits atomically via RPC
      const { error: rpcError } = await supabase.rpc("add_credits", {
        p_user_id: purchase.user_id,
        p_credits: purchase.credits as number,
      });

      if (rpcError) {
        console.warn(`[snippe-webhook] RPC add_credits failed, using manual fallback: ${rpcError.message}`);
        // Fallback: read current credits + update directly
        const { data: profileData } = await supabase
          .from("profiles")
          .select("credits")
          .eq("id", purchase.user_id)
          .single();
        const currentCredits = (profileData?.credits as number) ?? 0;
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ credits: currentCredits + (purchase.credits as number) })
          .eq("id", purchase.user_id);
        if (updateError) {
          console.error(`[snippe-webhook] Failed to add credits: ${updateError.message}`);
          // Don't break — still mark purchase completed so we can investigate
        }
      }

      await supabase
        .from("credit_purchases")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", purchase.id);

      console.log(`[snippe-webhook] Added ${purchase.credits} credits to user ${purchase.user_id}`);
      break;
    }

    case "payment.failed":
    case "payment.voided":
    case "payment.expired": {
      if (!lookupRef) break;

      await supabase
        .from("credit_purchases")
        .update({ status: "failed" })
        .or(`snippe_ref.eq.${reference},snippe_ref.eq.${external_reference}`)
        .eq("status", "pending");

      console.log(`[snippe-webhook] Marked purchase failed for ref=${lookupRef}`);
      break;
    }

    default:
      console.log(`[snippe-webhook] Unhandled event type: ${event}`);
  }

  // Always return 200 to prevent retries
  return new Response("ok", { status: 200 });
}

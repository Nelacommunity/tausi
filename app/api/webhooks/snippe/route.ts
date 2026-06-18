import { createAdminClient } from "@/app/lib/supabase/admin";
import { verifyWebhookSignature, type SnippeWebhookPayload } from "@/lib/snippe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();

  const timestamp   = request.headers.get("X-Webhook-Timestamp") ?? "";
  const signature   = request.headers.get("X-Webhook-Signature") ?? "";
  const headerEvent = request.headers.get("X-Webhook-Event") ?? "";

  if (process.env.SNIPPE_WEBHOOK_SECRET) {
    if (!verifyWebhookSignature(rawBody, timestamp, signature)) {
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

  const event = payload.type || headerEvent;
  const { reference } = payload.data ?? {};
  // purchase_id is always injected in metadata at payment creation time
  const metaPurchaseId = payload.data?.metadata?.purchase_id as string | undefined;

  console.log(`[snippe-webhook] event=${event} ref=${reference} purchase=${metaPurchaseId}`);

  // Always ack immediately so Snippe doesn't retry due to slow processing
  const ack = new Response("ok", { status: 200 });

  const supabase = createAdminClient();

  switch (event) {
    case "payment.completed": {
      if (!reference && !metaPurchaseId) break;

      // Prefer lookup by snippe_ref; fall back to metadata.purchase_id
      let purchase: { id: string; user_id: string; credits: number; status: string } | null = null;

      if (reference) {
        const { data } = await supabase
          .from("credit_purchases")
          .select("id, user_id, credits, status")
          .eq("snippe_ref", reference)
          .single();
        purchase = data;
      }

      if (!purchase && metaPurchaseId) {
        const { data } = await supabase
          .from("credit_purchases")
          .select("id, user_id, credits, status")
          .eq("id", metaPurchaseId)
          .single();
        purchase = data;
      }

      if (!purchase) {
        console.warn(`[snippe-webhook] No purchase found for ref=${reference} purchase=${metaPurchaseId}`);
        break;
      }

      if (purchase.status !== "pending") {
        console.log(`[snippe-webhook] Purchase ${purchase.id} already ${purchase.status} — skipping`);
        break;
      }

      // Mark completed atomically first (guards against double-processing from
      // concurrent webhook retries or status-poll completing it simultaneously)
      const { data: claimed } = await supabase
        .from("credit_purchases")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", purchase.id)
        .eq("status", "pending")   // only succeeds if still pending
        .select("id, user_id, credits")
        .single();

      if (!claimed) {
        // Another process already completed it
        console.log(`[snippe-webhook] Purchase ${purchase.id} already claimed — skipping credits`);
        break;
      }

      // Add credits only after we've claimed ownership
      const { error: rpcError } = await supabase.rpc("add_credits", {
        p_user_id: claimed.user_id,
        p_credits: claimed.credits as number,
      });

      if (rpcError) {
        console.warn(`[snippe-webhook] RPC add_credits failed, using direct fallback: ${rpcError.message}`);
        const { data: profile } = await supabase
          .from("profiles")
          .select("credits")
          .eq("id", claimed.user_id)
          .single();
        const current = (profile?.credits as number) ?? 0;
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ credits: current + (claimed.credits as number) })
          .eq("id", claimed.user_id);
        if (updateError) {
          console.error(`[snippe-webhook] Failed to add credits: ${updateError.message}`);
        }
      }

      console.log(`[snippe-webhook] +${claimed.credits} credits → user ${claimed.user_id}`);
      break;
    }

    case "payment.failed":
    case "payment.voided":
    case "payment.expired": {
      if (!reference && !metaPurchaseId) break;

      if (reference) {
        await supabase
          .from("credit_purchases")
          .update({ status: "failed" })
          .eq("snippe_ref", reference)
          .eq("status", "pending");
      } else if (metaPurchaseId) {
        await supabase
          .from("credit_purchases")
          .update({ status: "failed" })
          .eq("id", metaPurchaseId)
          .eq("status", "pending");
      }

      console.log(`[snippe-webhook] Marked failed — ref=${reference} purchase=${metaPurchaseId}`);
      break;
    }

    default:
      console.log(`[snippe-webhook] Unhandled event: ${event}`);
  }

  return ack;
}

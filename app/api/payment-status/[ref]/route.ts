import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getPaymentStatus } from "@/lib/snippe";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

type Ctx = { params: Promise<{ ref: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { ref } = await ctx.params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:payment-status`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const { data: purchase, error } = await supabase
    .from("credit_purchases")
    .select("id, user_id, status, credits, pack, completed_at")
    .eq("snippe_ref", ref)
    .eq("user_id", user.id)
    .single();

  if (error || !purchase) {
    return Response.json({ error: "Purchase not found" }, { status: 404 });
  }

  let status = purchase.status as "pending" | "completed" | "failed" | "expired";

  // If still pending, poll Snippe directly.
  // This is the fallback path for when webhooks haven't fired yet
  // (dev environments, delivery delays, webhook failures).
  if (status === "pending") {
    try {
      const snippeData = await getPaymentStatus(ref);
      const snippeStatus = snippeData.status;

      if (snippeStatus === "completed") {
        // Atomically claim the completion — .eq("status","pending") ensures
        // only one concurrent caller (this or the webhook) actually adds credits.
        const admin = createAdminClient();
        const { data: claimed } = await admin
          .from("credit_purchases")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", purchase.id)
          .eq("status", "pending")
          .select("id, user_id, credits")
          .single();

        if (claimed) {
          // We claimed it — add credits now
          const { error: rpcError } = await admin.rpc("add_credits", {
            p_user_id: claimed.user_id,
            p_credits: claimed.credits as number,
          });

          if (rpcError) {
            const { data: profile } = await admin
              .from("profiles")
              .select("credits")
              .eq("id", claimed.user_id)
              .single();
            const current = (profile?.credits as number) ?? 0;
            await admin
              .from("profiles")
              .update({ credits: current + (claimed.credits as number) })
              .eq("id", claimed.user_id);
          }
        }

        status = "completed";

      } else if (["failed", "expired", "voided"].includes(snippeStatus)) {
        const admin = createAdminClient();
        await admin
          .from("credit_purchases")
          .update({ status: "failed" })
          .eq("id", purchase.id)
          .eq("status", "pending");

        status = "failed";
      }
    } catch {
      // Non-fatal — return the current DB status and let the frontend retry
    }
  }

  return Response.json({
    status,
    credits:      status === "completed" ? (purchase.credits as number) : undefined,
    pack:         purchase.pack,
    completed_at: purchase.completed_at ?? undefined,
  });
}

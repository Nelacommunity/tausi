import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getPaymentStatus } from "@/lib/snippe";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

type Ctx = { params: Promise<{ ref: string }> };

export async function GET(req: Request, ctx: Ctx) {
  // [ref] is the purchase UUID (stable, created before the Snippe call).
  // ?snippe_ref=SN... is the real Snippe reference passed from the frontend
  // so we can heal the DB row if the UPDATE after checkout silently failed.
  const { ref: purchaseId } = await ctx.params;
  const snippeRefParam = new URL(req.url).searchParams.get("snippe_ref") ?? "";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:payment-status`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const { data: purchase, error } = await supabase
    .from("credit_purchases")
    .select("id, user_id, status, credits, pack, completed_at, snippe_ref")
    .eq("id", purchaseId)
    .eq("user_id", user.id)
    .single();

  if (error || !purchase) {
    return Response.json({ error: "Purchase not found" }, { status: 404 });
  }

  let status = purchase.status as "pending" | "completed" | "failed" | "expired";

  // Heal stale snippe_ref — if the UPDATE after checkout failed the DB row
  // still holds "pending-xxx". Use the ref the frontend got from the checkout
  // response to fix it so subsequent webhook lookups also work.
  let snippeRef = purchase.snippe_ref as string;
  if (snippeRef.startsWith("pending-") && snippeRefParam) {
    snippeRef = snippeRefParam;
    const admin = createAdminClient();
    await admin
      .from("credit_purchases")
      .update({ snippe_ref: snippeRef })
      .eq("id", purchaseId);
  }

  if (status === "pending" && snippeRef && !snippeRef.startsWith("pending-")) {
    try {
      const snippeData = await getPaymentStatus(snippeRef);
      const snippeStatus = snippeData.status;

      if (snippeStatus === "completed") {
        const admin = createAdminClient();
        const { data: claimed } = await admin
          .from("credit_purchases")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", purchase.id)
          .eq("status", "pending")
          .select("id, user_id, credits")
          .single();

        if (claimed) {
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
    } catch (err) {
      console.error("[payment-status] Snippe status check failed:", err instanceof Error ? err.message : err);
    }
  }

  return Response.json({
    status,
    credits:      status === "completed" ? (purchase.credits as number) : undefined,
    pack:         purchase.pack,
    completed_at: purchase.completed_at ?? undefined,
  });
}

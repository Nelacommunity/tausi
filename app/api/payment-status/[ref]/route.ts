import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getPaymentStatus } from "@/lib/snippe";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

type Ctx = { params: Promise<{ ref: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    // [ref] is the purchase UUID — stable, created before the Snippe call.
    // ?snippe_ref= is the real Snippe reference the frontend got from checkout,
    // used to heal the DB row if the UPDATE after checkout silently failed.
    const { ref: purchaseId } = await ctx.params;

    let snippeRefParam = "";
    try {
      snippeRefParam = new URL(req.url).searchParams.get("snippe_ref") ?? "";
    } catch { /* ignore malformed URL */ }

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
      console.error("[payment-status] Purchase not found:", error?.message);
      return Response.json({ error: "Purchase not found" }, { status: 404 });
    }

    let status = purchase.status as "pending" | "completed" | "failed";
    let snippeRef = (purchase.snippe_ref as string) ?? "";

    // Heal stale row: if the UPDATE after checkout failed, DB still has "pending-xxx".
    // Use the real ref the frontend got from the checkout response to fix it.
    if (snippeRef.startsWith("pending-") && snippeRefParam) {
      const admin = createAdminClient();
      await admin
        .from("credit_purchases")
        .update({ snippe_ref: snippeRefParam })
        .eq("id", purchaseId);
      snippeRef = snippeRefParam;
    }

    // Poll Snippe directly if still pending and we have a real reference
    if (status === "pending" && snippeRef && !snippeRef.startsWith("pending-")) {
      try {
        const snippeData = await getPaymentStatus(snippeRef);

        if (snippeData.status === "completed") {
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
              console.error("[payment-status] add_credits RPC failed:", rpcError.message);
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

        } else if (["failed", "expired", "voided"].includes(snippeData.status)) {
          const admin = createAdminClient();
          await admin
            .from("credit_purchases")
            .update({ status: "failed" })
            .eq("id", purchase.id)
            .eq("status", "pending");

          status = "failed";
        }
      } catch (pollErr) {
        // Non-fatal — return current DB status, frontend will retry
        console.error("[payment-status] Snippe poll error:", pollErr instanceof Error ? pollErr.message : pollErr);
      }
    }

    return Response.json({
      status,
      credits:      status === "completed" ? (purchase.credits as number) : undefined,
      pack:         purchase.pack,
      completed_at: purchase.completed_at ?? undefined,
    });

  } catch (err) {
    console.error("[payment-status] Unhandled error:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

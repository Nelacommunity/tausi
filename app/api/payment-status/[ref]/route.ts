import { createClient } from "@/app/lib/supabase/server";
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
    .select("id, status, credits, pack, completed_at")
    .eq("snippe_ref", ref)
    .eq("user_id", user.id)
    .single();

  if (error || !purchase) {
    return Response.json({ error: "Purchase not found" }, { status: 404 });
  }

  const status = purchase.status as "pending" | "completed" | "failed" | "expired";
  return Response.json({
    status,
    credits:      status === "completed" ? (purchase.credits as number) : undefined,
    pack:         purchase.pack,
    completed_at: purchase.completed_at ?? undefined,
  });
}

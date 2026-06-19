import { createClient } from "@/app/lib/supabase/server";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:purchases`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const { data: purchases, error } = await supabase
    .from("credit_purchases")
    .select("id, pack, credits, amount_tzs, status, created_at, completed_at")
    .eq("user_id", user.id)
    .not("snippe_ref", "like", "pending-%")   // hide records that never got a real reference
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ purchases: purchases ?? [] });
}

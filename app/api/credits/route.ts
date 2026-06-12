import { createClient } from "@/app/lib/supabase/server";
import { getCreditBalance } from "@/app/lib/usage";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

export async function GET(request: Request) {
  void request;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:credits-get`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const credits = await getCreditBalance(supabase, user.id);
  return Response.json({ credits });
}

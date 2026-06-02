import { createClient } from "@/app/lib/supabase/server";
import { getMonthlyUsage } from "@/app/lib/usage";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

export async function GET(request: Request) {
  void request;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:profile-get`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  // Upsert to ensure profile exists
  await supabase.from("profiles").upsert({ id: user.id, email: user.email }, { onConflict: "id", ignoreDuplicates: true });

  const [
    { data: profile },
    { count: examCount },
    { count: markingCount },
    { count: studyCount },
    { usage, isPremium },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("exams").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("marking_sessions").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("study_sessions").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    getMonthlyUsage(supabase, user.id),
  ]);

  return Response.json({
    profile,
    stats: { exams: examCount ?? 0, markings: markingCount ?? 0, studies: studyCount ?? 0 },
    usage,
    isPremium,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:profile-patch`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const body = await request.json().catch(() => ({}));
  const allowed = ["full_name"] as const;
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (!Object.keys(updates).length) return Response.json({ error: "Nothing to update" }, { status: 400 });
  if (typeof updates.full_name === "string" && updates.full_name.length > 200) {
    return Response.json({ error: "Name too long (max 200 characters)" }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}

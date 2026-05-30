import { createClient } from "@/app/lib/supabase/server";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:mark-get`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);
  void id;

  const { data, error } = await supabase
    .from("marking_sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(data);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:mark-delete`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);
  void id;

  const { data } = await supabase.from("marking_sessions").select("answer_sheet_paths").eq("id", id).eq("user_id", user.id).single();
  if (data?.answer_sheet_paths?.length) {
    await supabase.storage.from("exam-papers").remove(data.answer_sheet_paths);
  }
  await supabase.from("marking_sessions").delete().eq("id", id).eq("user_id", user.id);
  return Response.json({ ok: true });
}

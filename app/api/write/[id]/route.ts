import { createClient } from "@/app/lib/supabase/server";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:write-get`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);
  void id;

  const { data, error } = await supabase
    .from("write_documents")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:write-patch`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);
  void id;

  const updates = await request.json().catch(() => ({}));
  const allowed: Record<string, unknown> = {};
  if (typeof updates.title === "string") {
    if (updates.title.length > 200) return Response.json({ error: "Title too long (max 200 characters)" }, { status: 400 });
    allowed.title = updates.title;
  }
  if (typeof updates.content === "string") allowed.content = updates.content;

  const { error } = await supabase
    .from("write_documents")
    .update(allowed)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:write-delete`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);
  void id;

  const { error } = await supabase
    .from("write_documents")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

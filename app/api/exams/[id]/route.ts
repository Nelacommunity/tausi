import { createClient } from "@/app/lib/supabase/server";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/exams/[id]">
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const rlKey = user ? `${user.id}:exam-get` : `anon:exam-get:${id}`;
  const rl = checkRateLimit(rlKey, LIMITS.standard);
  if (!rl.allowed) return Response.json({ error: "Too many requests" }, { status: 429 });

  // Fetch exam — RLS allows: owner always, anyone if is_public
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("*")
    .eq("id", id)
    .single();

  if (examError || !exam) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // For private exams, require ownership
  if (!exam.is_public && exam.user_id !== user?.id) {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  // Only return the requesting user's own chat messages
  const messagesQuery = supabase
    .from("chat_messages")
    .select("*")
    .eq("exam_id", id)
    .order("created_at", { ascending: true });

  if (user) {
    messagesQuery.eq("user_id", user.id);
  }

  const { data: messages } = await messagesQuery;

  return Response.json({
    exam,
    messages: messages ?? [],
    isOwner: user?.id === exam.user_id,
  });
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/exams/[id]">
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:exam-patch`, LIMITS.standard);
  if (!rl.allowed) return Response.json({ error: "Too many requests" }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const allowed = ["marking_scheme", "title", "is_public"] as const;
  type AllowedKey = (typeof allowed)[number];
  const updates: Partial<Record<AllowedKey, unknown>> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // RLS enforces ownership
  const { error } = await supabase
    .from("exams")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/exams/[id]">
) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:exam-delete`, LIMITS.standard);
  if (!rl.allowed) return Response.json({ error: "Too many requests" }, { status: 429 });

  // Get file paths before deleting the record
  const { data: exam } = await supabase
    .from("exams")
    .select("pdf_storage_paths")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (exam?.pdf_storage_paths?.length) {
    await supabase.storage.from("exam-papers").remove(exam.pdf_storage_paths);
  }

  // Delete exam — chat_messages cascade via FK
  const { error } = await supabase
    .from("exams")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}

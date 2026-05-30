import { createClient } from "@/app/lib/supabase/server";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

export async function GET(request: Request) {
  void request;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:write-list`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const { data, error } = await supabase
    .from("write_documents")
    .select("id, title, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:write-create`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const { title = "Untitled Document", content = "" } = await request.json().catch(() => ({}));
  if (typeof title === "string" && title.length > 200) {
    return Response.json({ error: "Title too long (max 200 characters)" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("write_documents")
    .insert({ user_id: user.id, title, content })
    .select("id")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id: data.id });
}

import { createClient, getAuthUser } from "@/app/lib/supabase/server";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: paper } = await supabase
    .from("exam_papers")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!paper) return Response.json({ error: "Not found" }, { status: 404 });

  const { data: urlData } = await supabase.storage
    .from("exam-papers")
    .createSignedUrls(paper.file_paths as string[], 3600);

  const signedUrls = (urlData ?? []).map((u) => u.signedUrl ?? "").filter(Boolean);
  return Response.json({ paper, signedUrls });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:paper-delete`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);
  void id;

  // Fetch paths first so we can clean up storage
  const { data: paper } = await supabase
    .from("exam_papers")
    .select("file_paths")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (paper?.file_paths?.length) {
    await supabase.storage.from("exam-papers").remove(paper.file_paths);
  }

  const { error } = await supabase
    .from("exam_papers")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

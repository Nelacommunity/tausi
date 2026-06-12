import { createClient } from "@/app/lib/supabase/server";

import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

export async function GET(request: Request) {
  void request;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:study-list`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const { data } = await supabase
    .from("study_sessions")
    .select("id, title, original_filenames, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return Response.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:study-create`, LIMITS.upload);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  // Session creation has no token cost; token limits apply on chat messages in study/[id]/route.ts

  const formData = await request.formData().catch(() => null);
  if (!formData) return Response.json({ error: "Invalid form data" }, { status: 400 });

  const files = formData.getAll("files") as File[];
  const title = (formData.get("title") as string) || "Study Session";

  if (!files.length)     return Response.json({ error: "Upload at least one document" }, { status: 400 });
  if (files.length > 10) return Response.json({ error: "Too many files (max 10)" },      { status: 400 });
  if (title.length > 200) return Response.json({ error: "Title too long (max 200)" },    { status: 400 });

  // Ensure bucket exists
  const { error: bucketErr } = await supabase.storage.getBucket("exam-papers");
  if (bucketErr?.message?.includes("not found") || bucketErr?.message?.includes("does not exist")) {
    await supabase.storage.createBucket("exam-papers", { public: false, fileSizeLimit: 52428800 });
  }

  const docPaths: string[] = [];
  const originalFilenames: string[] = [];

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/study/${Date.now()}-${safeName}`;
    await supabase.storage.from("exam-papers").upload(path, bytes, { contentType: file.type });
    docPaths.push(path);
    originalFilenames.push(file.name);
  }

  const { data, error } = await supabase
    .from("study_sessions")
    .insert({ user_id: user.id, title, document_paths: docPaths, original_filenames: originalFilenames })
    .select("id")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ id: data.id });
}

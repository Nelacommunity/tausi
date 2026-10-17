import { createClient, getAuthUser } from "@/app/lib/supabase/server";

import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";
import { checkUploads, MB, safeFileName } from "@/app/lib/file-check";

export async function GET(request: Request) {
  void request;
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
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
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:study-create`, LIMITS.upload);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  // Session creation has no token cost; token limits apply on chat messages in study/[id]/route.ts

  const formData = await request.formData().catch(() => null);
  if (!formData) return Response.json({ error: "Invalid form data" }, { status: 400 });

  const files = formData.getAll("files") as File[];
  const title = (formData.get("title") as string) || "Study Session";

  if (!files.length)     return Response.json({ error: "Upload at least one document" }, { status: 400 });
  const checked = await checkUploads(files, { maxFiles: 10, maxFileBytes: 20 * MB, maxTotalBytes: 100 * MB });
  if ("error" in checked) return Response.json({ error: checked.error },                 { status: 400 });
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
    const path = `${user.id}/study/${Date.now()}-${safeFileName(file.name)}`;
    const { error: upErr } = await supabase.storage.from("exam-papers").upload(path, bytes, { contentType: checked.mimes.get(file)! });
    if (upErr) continue;
    docPaths.push(path);
    originalFilenames.push(file.name);
  }
  if (!docPaths.length) return Response.json({ error: "The files could not be saved — try again." }, { status: 500 });

  const { data, error } = await supabase
    .from("study_sessions")
    .insert({ user_id: user.id, title, document_paths: docPaths, original_filenames: originalFilenames })
    .select("id")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ id: data.id });
}

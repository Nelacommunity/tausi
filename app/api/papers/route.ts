import { createClient, getAuthUser } from "@/app/lib/supabase/server";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";
import { checkUploads, MB, safeFileName } from "@/app/lib/file-check";


export async function GET(request: Request) {
  void request;
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:papers-list`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const { data, error } = await supabase
    .from("exam_papers")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:papers-upload`, LIMITS.upload);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const formData = await request.formData().catch(() => null);
  if (!formData) return Response.json({ error: "Invalid form data" }, { status: 400 });

  const name      = (formData.get("name") as string)?.trim();
  const examType  = (formData.get("exam_type") as string)?.trim();
  const year      = parseInt((formData.get("year") as string) ?? "0", 10);
  const subject   = (formData.get("subject") as string)?.trim();
  const files     = formData.getAll("files") as File[];

  if (!name)                  return Response.json({ error: "Exam name is required" },    { status: 400 });
  if (name.length > 200)      return Response.json({ error: "Name too long (max 200)" },  { status: 400 });
  if (!examType)              return Response.json({ error: "Exam type is required" },    { status: 400 });
  if (!year || year < 1900 || year > new Date().getFullYear() + 1)
                              return Response.json({ error: "Invalid year" },              { status: 400 });
  if (!subject)               return Response.json({ error: "Subject is required" },      { status: 400 });
  if (subject.length > 200)   return Response.json({ error: "Subject too long (max 200)" }, { status: 400 });
  if (!files.length)          return Response.json({ error: "Upload at least one file" }, { status: 400 });
  const checked = await checkUploads(files, { maxFiles: 10, maxFileBytes: 20 * MB, maxTotalBytes: 100 * MB });
  if ("error" in checked)     return Response.json({ error: checked.error },              { status: 400 });

  // Ensure bucket
  const { error: bucketErr } = await supabase.storage.getBucket("exam-papers");
  if (bucketErr?.message?.includes("not found") || bucketErr?.message?.includes("does not exist")) {
    await supabase.storage.createBucket("exam-papers", { public: false, fileSizeLimit: 52428800 });
  }

  const filePaths: string[] = [];
  const originalFilenames: string[] = [];

  for (const file of files) {
    const path = `${user.id}/papers/${Date.now()}-${safeFileName(file.name)}`;
    const bytes = await file.arrayBuffer();
    const { error: upErr } = await supabase.storage
      .from("exam-papers")
      .upload(path, bytes, { contentType: checked.mimes.get(file)! });
    if (!upErr) { filePaths.push(path); originalFilenames.push(file.name); }
  }

  if (!filePaths.length) return Response.json({ error: "No valid files were uploaded" }, { status: 400 });

  const { data, error } = await supabase
    .from("exam_papers")
    .insert({ user_id: user.id, name, exam_type: examType, year, subject, file_paths: filePaths, original_filenames: originalFilenames })
    .select("id")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id: data.id });
}

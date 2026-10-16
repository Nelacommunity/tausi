import { createClient, getAuthUser } from "@/app/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

/** Ensure the exam-papers bucket exists. Safe to call multiple times. */
async function ensureBucket(supabase: SupabaseClient) {
  const { error } = await supabase.storage.getBucket("exam-papers");
  if (error?.message?.includes("not found") || error?.message?.includes("does not exist")) {
    await supabase.storage.createBucket("exam-papers", {
      public: false,
      fileSizeLimit: 52428800, // 50 MB
      allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg", "image/webp"],
    });
  }
}

/** Upload a File to storage and return its path. */
async function uploadFile(supabase: SupabaseClient, file: File, userId: string): Promise<{ path: string; name: string; error?: string }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${userId}/${Date.now()}-${safeName}`;
  const bytes = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from("exam-papers")
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });

  if (error) return { path: "", name: file.name, error: error.message };
  return { path: storagePath, name: file.name };
}

export async function GET(request: Request) {
  void request;
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:exams-list`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const { data, error } = await supabase
    .from("exams")
    .select("id, title, original_filenames, is_public, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:exams-create`, LIMITS.upload);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const predictedExam = (formData.get("predicted_exam") as string) || "";
  const markingScheme = (formData.get("marking_scheme") as string) || "";
  const title = (formData.get("title") as string) || "Untitled Exam";

  // ── Library mode: paper_ids provided — reuse stored file paths ────────────
  const paperIds = formData.getAll("paper_ids") as string[];
  if (paperIds.length > 0) {
    const { data: papers } = await supabase
      .from("exam_papers")
      .select("file_paths, original_filenames")
      .in("id", paperIds)
      .eq("user_id", user.id);

    if (!papers?.length) return Response.json({ error: "Papers not found" }, { status: 404 });

    const pdfPaths = papers.flatMap(p => p.file_paths as string[]);
    const originalFilenames = papers.flatMap(p => p.original_filenames as string[]);

    const { data, error } = await supabase
      .from("exams")
      .insert({
        user_id: user.id,
        title,
        original_filenames: originalFilenames,
        pdf_storage_paths: pdfPaths,
        predicted_exam: predictedExam,
        marking_scheme: markingScheme,
        is_public: false,
      })
      .select("id")
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ id: data.id });
  }

  // ── Upload mode: files provided directly ──────────────────────────────────
  const files = formData.getAll("files") as File[];
  if (files.length > 10) return Response.json({ error: "Too many files (max 10)" }, { status: 400 });

  await ensureBucket(supabase);

  const pdfPaths: string[] = [];
  const originalFilenames: string[] = [];
  const uploadErrors: string[] = [];

  await Promise.all(
    files.map(async (file) => {
      const result = await uploadFile(supabase, file, user.id);
      if (result.error) {
        uploadErrors.push(`${result.name}: ${result.error}`);
      } else {
        pdfPaths.push(result.path);
        originalFilenames.push(result.name);
      }
    })
  );

  if (uploadErrors.length > 0) {
    return Response.json(
      { error: `Storage upload failed: ${uploadErrors.join(", ")}` },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("exams")
    .insert({
      user_id: user.id,
      title,
      original_filenames: originalFilenames,
      pdf_storage_paths: pdfPaths,
      predicted_exam: predictedExam,
      marking_scheme: markingScheme,
      is_public: false,
    })
    .select("id")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id: data.id });
}

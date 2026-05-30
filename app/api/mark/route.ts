import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/app/lib/supabase/server";
import { AI_MARKER_SYSTEM_PROMPT } from "@/app/lib/prompts";
import { checkTokenLimit, recordTokenUsage, tokenLimitError } from "@/app/lib/usage";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:mark-list`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);
  void request;

  const { data } = await supabase
    .from("marking_sessions")
    .select("id, title, total_marks, max_marks, percentage, created_at, original_filenames")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return Response.json(data ?? []);
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonErr("GEMINI_API_KEY not configured", 500);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonErr("Unauthorized", 401);

  const rl2 = checkRateLimit(`${user.id}:mark-create`, LIMITS.ai);
  if (!rl2.allowed) return rateLimitError(rl2.resetAt);

  const tokenCheck = await checkTokenLimit(supabase, user.id, "ai_marking");
  if (!tokenCheck.allowed) return tokenLimitError("ai_marking", tokenCheck.used, tokenCheck.limit);

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonErr("Invalid form data", 400);

  const answerFiles   = formData.getAll("answer_files")   as File[];
  const questionFiles = formData.getAll("question_files") as File[];
  const title         = (formData.get("title") as string) || "Untitled Marking";

  if (!answerFiles.length)    return jsonErr("Upload at least one answer sheet", 400);
  if (!questionFiles.length)  return jsonErr("Upload the question paper", 400);
  if (answerFiles.length > 5) return jsonErr("Too many answer files (max 5)", 400);
  if (title.length > 200)     return jsonErr("Title too long (max 200 characters)", 400);

  // Ensure storage bucket
  const { error: bucketErr } = await supabase.storage.getBucket("exam-papers");
  if (bucketErr?.message?.includes("not found") || bucketErr?.message?.includes("does not exist")) {
    await supabase.storage.createBucket("exam-papers", { public: false, fileSizeLimit: 52428800 });
  }

  const answerPaths: string[] = [], answerNames: string[] = [];
  const questionPaths: string[] = [], questionNames: string[] = [];

  for (const file of answerFiles) {
    const path = await uploadFile(supabase, file, user.id, "answers");
    if (path) { answerPaths.push(path); answerNames.push(file.name); }
  }
  for (const file of questionFiles) {
    const path = await uploadFile(supabase, file, user.id, "questions");
    if (path) { questionPaths.push(path); questionNames.push(file.name); }
  }

  const { data: session } = await supabase
    .from("marking_sessions")
    .insert({
      user_id: user.id, title,
      answer_sheet_paths: answerPaths, question_paper_paths: questionPaths,
      original_filenames: [...answerNames, ...questionNames], marking_scheme_text: "",
    })
    .select("id").single();

  const sessionId = session?.id;

  type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
  const parts: Part[] = [{ text: "QUESTION PAPER:" }];
  for (const file of questionFiles) {
    parts.push({ inlineData: { mimeType: file.type || "application/pdf", data: Buffer.from(await file.arrayBuffer()).toString("base64") } });
  }
  parts.push({ text: "\n\nSTUDENT'S ANSWER SHEET:" });
  for (const file of answerFiles) {
    parts.push({ inlineData: { mimeType: file.type || "application/pdf", data: Buffer.from(await file.arrayBuffer()).toString("base64") } });
  }
  parts.push({ text: "\n\nUsing the question paper above, derive the marking criteria and maximum marks for each question. Then mark the student's answer sheet thoroughly." });

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: AI_MARKER_SYSTEM_PROMPT });

  let fullFeedback = "";
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      let totalTokens = 0;
      try {
        // ── Pass 1: full marking report ────────────────────────────
        const result = await model.generateContentStream({
          contents: [{ role: "user", parts }],
          generationConfig: { maxOutputTokens: 65536 },
        });
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) { fullFeedback += text; controller.enqueue(enc.encode(text)); }
        }
        totalTokens += (await result.response).usageMetadata?.totalTokenCount ?? 0;

        // ── Pass 2: continuation if report was cut short ───────────
        // The report is only complete when both the Overall Feedback AND
        // Priority Study Areas sections are present. Resume if either is missing.
        const hasOverall  = fullFeedback.includes("Overall Performance Feedback");
        const hasPriority = fullFeedback.includes("Priority Study Areas");
        if (!hasOverall || !hasPriority) {
          const contResult = await model.generateContentStream({
            contents: [
              { role: "user",  parts },
              { role: "model", parts: [{ text: fullFeedback }] },
              { role: "user",  parts: [{ text: "You stopped before finishing the marking report. Please continue from exactly where you left off — complete all remaining questions and then add the ## Overall Performance Feedback and ## Priority Study Areas sections." }] },
            ],
            generationConfig: { maxOutputTokens: 65536 },
          });
          for await (const chunk of contResult.stream) {
            const text = chunk.text();
            if (text) { fullFeedback += text; controller.enqueue(enc.encode(text)); }
          }
          totalTokens += (await contResult.response).usageMetadata?.totalTokenCount ?? 0;
        }

        const totalMatch   = fullFeedback.match(/\*\*Total Score:\*\*\s*(\d+)\s*\/\s*(\d+)/i);
        const percentMatch = fullFeedback.match(/\*\*Percentage:\*\*\s*([\d.]+)%/i);

        await Promise.all([
          recordTokenUsage(supabase, user.id, "ai_marking", totalTokens),
          sessionId ? supabase.from("marking_sessions").update({
            raw_feedback: fullFeedback,
            total_marks:  totalMatch  ? parseInt(totalMatch[1])      : null,
            max_marks:    totalMatch  ? parseInt(totalMatch[2])      : null,
            percentage:   percentMatch ? parseFloat(percentMatch[1]) : null,
          }).eq("id", sessionId) : Promise.resolve(),
        ]);

        controller.enqueue(enc.encode(`\n\n<!--SESSION_ID:${sessionId}-->`));
        controller.close();
      } catch (err) {
        controller.enqueue(enc.encode(`\n\n**Error:** ${err instanceof Error ? err.message : "Marking failed"}`));
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
}

async function uploadFile(supabase: Awaited<ReturnType<typeof import("@/app/lib/supabase/server").createClient>>, file: File, userId: string, folder: string) {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${folder}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from("exam-papers").upload(path, await file.arrayBuffer(), { contentType: file.type });
  return error ? null : path;
}

function jsonErr(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
}

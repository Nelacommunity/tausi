import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL } from "@/app/lib/ai";
import { createClient } from "@/app/lib/supabase/server";
import { EXAM_SYSTEM_PROMPT } from "@/app/lib/prompts";
import { checkAndDeductCredits, insufficientCreditsError, CREDIT_COSTS } from "@/app/lib/usage";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

function mimeFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" }[ext] ?? "application/pdf";
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonErr("GEMINI_API_KEY not configured", 500);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonErr("Unauthorized", 401);

  const rl = checkRateLimit(`${user.id}:paper-generate`, LIMITS.ai);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const credit = await checkAndDeductCredits(supabase, user.id, "paper_prediction");
  if (!credit.allowed) return insufficientCreditsError("paper_prediction", credit.balance, CREDIT_COSTS.paper_prediction);

  const { data: paper } = await supabase.from("exam_papers").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!paper) return jsonErr("Paper not found", 404);

  type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
  const parts: Part[] = [];

  for (const path of (paper.file_paths as string[])) {
    const { data: blob } = await supabase.storage.from("exam-papers").download(path);
    if (blob) {
      parts.push({ inlineData: { mimeType: mimeFromPath(path), data: Buffer.from(await blob.arrayBuffer()).toString("base64") } });
    }
  }

  if (!parts.length) return jsonErr("Could not load paper files", 500);

  const count = parts.length;
  parts.push({ text: `Analyse ${count === 1 ? "this" : `these ${count}`} past exam paper${count === 1 ? "" : "s"} for ${paper.subject} (${paper.exam_type} ${paper.year}) and generate a new predicted exam paper that follows the exact same format and structure.` });

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: EXAM_SYSTEM_PROMPT });

  let fullContent = "";
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        const result = await model.generateContentStream({ contents: [{ role: "user", parts }] });
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) { fullContent += text; controller.enqueue(enc.encode(text)); }
        }

        const { data: exam } = await supabase.from("exams").insert({
          user_id: user.id,
          title: `${paper.name} — Predicted ${new Date().getFullYear()}`,
          original_filenames: paper.original_filenames,
          pdf_storage_paths: paper.file_paths,
          predicted_exam: fullContent,
          marking_scheme: "",
          is_public: false,
        }).select("id").single();

        controller.enqueue(enc.encode(`\n\n<!--EXAM_ID:${exam?.id ?? ""}-->`));
        controller.close();
      } catch (err) {
        controller.enqueue(enc.encode(`\n\n**Error:** ${err instanceof Error ? err.message : "Generation failed"}`));
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
}

function jsonErr(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
}

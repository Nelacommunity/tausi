import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL } from "@/app/lib/ai";
import { EXAM_SYSTEM_PROMPT } from "@/app/lib/prompts";
import { createClient, getAuthUser } from "@/app/lib/supabase/server";
import { checkAiRateLimit, rateLimitError } from "@/app/lib/rate-limit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return jsonErr("You must be signed in to use AI features.", 401);

  const rl = await checkAiRateLimit(`${user.id}:generate-exam`);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonErr("GEMINI_API_KEY is not configured", 500);

  let formData: FormData;
  try { formData = await request.formData(); }
  catch { return jsonErr("Invalid form data", 400); }

  const files = formData.getAll("files") as File[];
  const notes = (formData.get("notes") as string) || "";
  if (!files.length) return jsonErr("No files uploaded", 400);
  if (files.length > 3) return jsonErr("Too many files (max 3 per practice paper)", 400);
  if (notes.length > 2000) return jsonErr("Notes too long (max 2000 characters)", 400);

  // Context limit guard: base64 encoding inflates size by ~33%.
  // Gemini 2.5 Flash has a 1M token context window; each MB of PDF ≈ 25K–250K tokens.
  // Hard-limit total payload at 60 MB to stay well within the context window.
  const MAX_SINGLE_FILE = 20 * 1024 * 1024;  // 20 MB
  const MAX_TOTAL_SIZE  = 60 * 1024 * 1024;  // 60 MB
  for (const file of files) {
    if (file.size > MAX_SINGLE_FILE) {
      return jsonErr(`File "${file.name}" is too large (max 20 MB per file).`, 400);
    }
  }
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    return jsonErr(`Combined file size ${(totalSize / 1024 / 1024).toFixed(1)} MB exceeds the 60 MB limit. Use fewer or smaller files.`, 400);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: EXAM_SYSTEM_PROMPT });

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    parts.push({ inlineData: { mimeType: file.type || "application/octet-stream", data: Buffer.from(bytes).toString("base64") } });
  }

  const prompt = files.length === 1
    ? "Analyse this past exam paper and generate a new practice exam paper that follows the exact same format and structure."
    : `Analyse these ${files.length} past exam papers and generate a new practice exam paper that follows the exact same format and structure, incorporating patterns from all papers.`;
  parts.push({ text: notes ? `${prompt}\n\nAdditional instructions: ${notes}` : prompt });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        const result = await model.generateContentStream({
          contents: [{ role: "user", parts }],
          generationConfig: { maxOutputTokens: 65536 },
        });
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(enc.encode(text));
        }
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

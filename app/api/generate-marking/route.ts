import { GoogleGenerativeAI } from "@google/generative-ai";
import { MARKING_SYSTEM_PROMPT } from "@/app/lib/prompts";
import { createClient } from "@/app/lib/supabase/server";
import { checkTokenLimit, recordTokenUsage, tokenLimitError } from "@/app/lib/usage";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonErr("You must be signed in to use AI features.", 401);

  const rl = checkRateLimit(`${user.id}:generate-marking`, LIMITS.ai);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const tokenCheck = await checkTokenLimit(supabase, user.id, "marking_scheme");
  if (!tokenCheck.allowed) return tokenLimitError("marking_scheme", tokenCheck.used, tokenCheck.limit);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonErr("GEMINI_API_KEY is not configured", 500);

  let body: { examContent?: string; examId?: string };
  try { body = await request.json(); }
  catch { return jsonErr("Invalid JSON body", 400); }

  const { examContent, examId } = body;
  if (!examContent?.trim()) return jsonErr("No exam content provided", 400);
  if (examContent.length > 200_000) return jsonErr("Exam content too large", 400);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: MARKING_SYSTEM_PROMPT });

  const INITIAL_PROMPT = `Generate a complete and detailed marking scheme/memo for the following exam paper. Include ALL answers for ALL questions, then conclude with the Weak Points Analysis section.\n\n${examContent}`;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      let fullContent = "";
      let totalTokens = 0;

      try {
        // ── Pass 1: full marking scheme ────────────────────────────
        const result = await model.generateContentStream({
          contents: [{ role: "user", parts: [{ text: INITIAL_PROMPT }] }],
          generationConfig: { maxOutputTokens: 65536 },
        });
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) { fullContent += text; controller.enqueue(enc.encode(text)); }
        }
        totalTokens += (await result.response).usageMetadata?.totalTokenCount ?? 0;

        // ── Pass 2: continuation if output was cut short ───────────
        // We check for the mandatory Weak Points Analysis section at the end.
        // If it's missing the model was truncated mid-output; we resume it.
        if (!fullContent.includes("Weak Points Analysis")) {
          const contResult = await model.generateContentStream({
            contents: [
              { role: "user",  parts: [{ text: INITIAL_PROMPT }] },
              { role: "model", parts: [{ text: fullContent }] },
              { role: "user",  parts: [{ text: "You stopped before finishing. Please continue from exactly where you left off — complete any remaining questions and then add the full ## Weak Points Analysis section." }] },
            ],
            generationConfig: { maxOutputTokens: 65536 },
          });
          for await (const chunk of contResult.stream) {
            const text = chunk.text();
            if (text) { fullContent += text; controller.enqueue(enc.encode(text)); }
          }
          totalTokens += (await contResult.response).usageMetadata?.totalTokenCount ?? 0;
        }

        await recordTokenUsage(supabase, user.id, "marking_scheme", totalTokens);

        if (examId && fullContent) {
          await supabase.from("exams").update({ marking_scheme: fullContent }).eq("id", examId);
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

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL } from "@/app/lib/ai";
import { MARKING_SYSTEM_PROMPT } from "@/app/lib/prompts";
import { createClient, getAuthUser } from "@/app/lib/supabase/server";
import { checkAiRateLimit, rateLimitError } from "@/app/lib/rate-limit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return jsonErr("You must be signed in to use AI features.", 401);

  const rl = await checkAiRateLimit(`${user.id}:generate-marking`);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonErr("GEMINI_API_KEY is not configured", 500);

  let body: { examContent?: string; examId?: string };
  try { body = await request.json(); }
  catch { return jsonErr("Invalid JSON body", 400); }

  const { examContent, examId } = body;
  if (!examContent?.trim()) return jsonErr("No exam content provided", 400);
  if (examContent.length > 200_000) return jsonErr("Exam content too large", 400);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: MARKING_SYSTEM_PROMPT });

  const INITIAL_PROMPT = `Generate a complete and detailed marking scheme/memo for the following exam paper. Include ALL answers for ALL questions, then conclude with the Weak Points Analysis section.\n\n${examContent}`;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      let fullContent = "";

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

        // ── Pass 2: continuation if output was cut short ───────────
        // The marking scheme is only complete when BOTH:
        //   • The Weak Points Analysis section is present
        //   • The Difficulty Breakdown table (last subsection) is present
        // If either is missing the model was truncated; resume the conversation.
        const hasWeakPoints  = fullContent.includes("Weak Points Analysis");
        const hasDifficulty  = fullContent.includes("Difficulty Breakdown") || fullContent.includes("Difficulty Rating");
        if (!hasWeakPoints || !hasDifficulty) {
          const contResult = await model.generateContentStream({
            contents: [
              { role: "user",  parts: [{ text: INITIAL_PROMPT }] },
              { role: "model", parts: [{ text: fullContent }] },
              { role: "user",  parts: [{ text: "You stopped before finishing. Please continue from exactly where you left off — complete any remaining questions, then add the full ## Weak Points Analysis section including all 6 subsections ending with the Difficulty Breakdown table." }] },
            ],
            generationConfig: { maxOutputTokens: 65536 },
          });
          for await (const chunk of contResult.stream) {
            const text = chunk.text();
            if (text) { fullContent += text; controller.enqueue(enc.encode(text)); }
          }
        }

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

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL } from "@/app/lib/ai";
import { createClient } from "@/app/lib/supabase/server";
import { checkAndDeductCredits, insufficientCreditsError, CREDIT_COSTS } from "@/app/lib/usage";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

const SYSTEM = `You are an expert writing assistant integrated into Tausi, an AI-powered document editor.
Help the user write, edit, continue, improve, or summarize their document content.
Respond with well-structured prose. Use Markdown formatting (headings, bold, lists) only when it
genuinely improves readability. Match the tone and style of any existing document content provided.
Be concise unless asked to elaborate. Do not add meta-commentary about what you are doing.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonErr("Unauthorized", 401);

  const rl = checkRateLimit(`${user.id}:write-ai`, LIMITS.ai);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const credit = await checkAndDeductCredits(supabase, user.id, "ai_writer");
  if (!credit.allowed) return insufficientCreditsError("ai_writer", credit.balance, CREDIT_COSTS.ai_writer);

  const { mode, prompt, document: docContent = "", selection = "" } =
    await request.json().catch(() => ({}));

  if (prompt && prompt.length > 4000) return jsonErr("Prompt too long (max 4000 characters)", 400);

  if (!prompt?.trim() && mode !== "continue" && mode !== "summarize") {
    return jsonErr("Prompt required", 400);
  }

  let userMessage = "";
  switch (mode) {
    case "write":     userMessage = `Write the following for a document: ${prompt}`; break;
    case "continue":  userMessage = prompt ? `Continue writing this document based on the instruction: "${prompt}"\n\nDocument so far:\n${docContent}` : `Continue writing this document naturally:\n\n${docContent}`; break;
    case "improve":   userMessage = selection ? `Improve the following text (make it clearer, more engaging, and better written):\n\n${selection}` : `Improve this document section: ${prompt}`; break;
    case "summarize": userMessage = selection ? `Write a clear, concise summary of the following:\n\n${selection}` : `Summarize this document concisely:\n\n${docContent}`; break;
    case "ask":       userMessage = docContent ? `Based on this document:\n\n${docContent}\n\nAnswer the following: ${prompt}` : prompt; break;
    default:          userMessage = prompt;
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: SYSTEM });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        const result = await model.generateContentStream({ contents: [{ role: "user", parts: [{ text: userMessage }] }], generationConfig: { maxOutputTokens: 8192 } });
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(enc.encode(text));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

function jsonErr(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
}

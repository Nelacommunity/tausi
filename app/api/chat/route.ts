import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL } from "@/app/lib/ai";
import { createClient, getAuthUser } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { CHAT_SYSTEM_PROMPT } from "@/app/lib/prompts";
import { checkAiRateLimit, rateLimitError } from "@/app/lib/rate-limit";

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonErr("GEMINI_API_KEY not configured", 500);

  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) return jsonErr("Unauthorized", 401);

  const rl = await checkAiRateLimit(`${user.id}:chat`);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  let body: { examId?: string; message?: string; context?: string };
  try { body = await request.json(); }
  catch { return jsonErr("Invalid JSON", 400); }

  const { examId, message } = body;
  const context: "predicted" | "source" = body.context === "source" ? "source" : "predicted";
  if (!examId || !message?.trim()) return jsonErr("examId and message are required", 400);
  if (message.length > 4000) return jsonErr("Message too long (max 4000 characters)", 400);

  const { data: exam, error: examError } = await supabase.from("exams").select("*").eq("id", examId).single();
  if (examError || !exam) return jsonErr("Exam not found", 404);
  if (!exam.is_public && exam.user_id !== user.id) return jsonErr("Access denied", 403);

  const { data: history } = await supabase
    .from("chat_messages").select("role, content")
    .eq("exam_id", examId).eq("user_id", user.id).order("created_at", { ascending: true });

  await supabase.from("chat_messages").insert({ exam_id: examId, user_id: user.id, role: "user", content: message });

  let systemText = CHAT_SYSTEM_PROMPT;
  if (context === "source") {
    systemText += "\n\nThe student wants to discuss the ORIGINAL SOURCE PAPER(S) they uploaded. Focus your answers on the source material, not the predicted exam.";
  } else {
    if (exam.predicted_exam) systemText += `\n\n---\nPREDICTED EXAM PAPER:\n${exam.predicted_exam}`;
    if (exam.marking_scheme) systemText += `\n\n---\nMARKING SCHEME:\n${exam.marking_scheme}`;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: systemText });

  const isFirstMessage = !history || history.length === 0;
  const pdfParts: GeminiPart[] = [];

  if (isFirstMessage && exam.pdf_storage_paths.length > 0) {
    for (const storagePath of exam.pdf_storage_paths) {
      try {
        // Access checked above (owner or public exam); files are in the owner's private folder.
        const { data: fileData } = await createAdminClient().storage.from("exam-papers").download(storagePath);
        if (fileData) {
          const bytes = await fileData.arrayBuffer();
          if (bytes.byteLength <= 20 * 1024 * 1024) {
            pdfParts.push({ inlineData: { mimeType: "application/pdf", data: Buffer.from(bytes).toString("base64") } });
          }
        }
      } catch { /* skip */ }
    }
  }

  type Turn = { role: "user" | "model"; parts: GeminiPart[] };
  const contents: Turn[] = isFirstMessage && pdfParts.length > 0
    ? [{ role: "user", parts: [...pdfParts, { text: `I've uploaded my past exam paper(s). Please review them.\n\nMy question: ${message}` }] }]
    : [
        ...(history ?? []).map(m => ({ role: m.role === "user" ? "user" as const : "model" as const, parts: [{ text: m.content }] })),
        { role: "user" as const, parts: [{ text: message }] },
      ];

  let assistantContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await model.generateContentStream({ contents, generationConfig: { maxOutputTokens: 8192 } });
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) { assistantContent += text; controller.enqueue(new TextEncoder().encode(text)); }
        }
        await supabase.from("chat_messages").insert({ exam_id: examId, user_id: user.id, role: "assistant", content: assistantContent });
        controller.close();
      } catch (err) {
        controller.enqueue(new TextEncoder().encode(`\n\n**Error:** ${err instanceof Error ? err.message : "Generation failed"}`));
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
}

function jsonErr(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
}

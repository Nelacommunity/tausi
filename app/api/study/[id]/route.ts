import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/app/lib/supabase/server";
import { STUDY_SYSTEM_PROMPT } from "@/app/lib/prompts";
import { checkAndDeductCredits, insufficientCreditsError, CREDIT_COSTS } from "@/app/lib/usage";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`${user.id}:study-get`, LIMITS.standard);
  if (!rl.allowed) return Response.json({ error: "Too many requests" }, { status: 429 });
  void id;

  const [sessionRes, messagesRes] = await Promise.all([
    supabase.from("study_sessions").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase.from("study_messages").select("*").eq("session_id", id).eq("user_id", user.id).order("created_at", { ascending: true }),
  ]);

  if (sessionRes.error || !sessionRes.data) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ session: sessionRes.data, messages: messagesRes.data ?? [] });
}

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonErr("GEMINI_API_KEY not configured", 500);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonErr("Unauthorized", 401);

  const rl = checkRateLimit(`${user.id}:study-chat`, LIMITS.ai);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const credit = await checkAndDeductCredits(supabase, user.id, "study_chat");
  if (!credit.allowed) return insufficientCreditsError("study_chat", credit.balance, CREDIT_COSTS.study_chat);

  const { message } = await request.json().catch(() => ({ message: "" }));
  if (!message?.trim()) return jsonErr("Message required", 400);
  if (message.length > 4000) return jsonErr("Message too long (max 4000 characters)", 400);

  const [sessionRes, historyRes] = await Promise.all([
    supabase.from("study_sessions").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase.from("study_messages").select("role, content").eq("session_id", id).eq("user_id", user.id).order("created_at", { ascending: true }),
  ]);
  if (!sessionRes.data) return jsonErr("Session not found", 404);

  const session = sessionRes.data;
  const history = historyRes.data ?? [];

  await supabase.from("study_messages").insert({ session_id: id, user_id: user.id, role: "user", content: message });

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: STUDY_SYSTEM_PROMPT });

  const isFirst = history.length === 0;
  const pdfParts: GeminiPart[] = [];

  if (isFirst) {
    for (const path of session.document_paths) {
      try {
        const { data: fileData } = await supabase.storage.from("exam-papers").download(path);
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
  const contents: Turn[] = isFirst && pdfParts.length
    ? [{ role: "user", parts: [...pdfParts, { text: `I've uploaded my study documents. Please review them.\n\nMy question: ${message}` }] }]
    : [
        ...history.map(m => ({ role: m.role === "user" ? "user" as const : "model" as const, parts: [{ text: m.content }] })),
        { role: "user" as const, parts: [{ text: message }] },
      ];

  let reply = "";
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await model.generateContentStream({ contents });
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) { reply += text; controller.enqueue(new TextEncoder().encode(text)); }
        }
        await supabase.from("study_messages").insert({ session_id: id, user_id: user.id, role: "assistant", content: reply });
        controller.close();
      } catch (err) {
        controller.enqueue(new TextEncoder().encode(`\n\n**Error:** ${err instanceof Error ? err.message : "Failed"}`));
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase.from("study_sessions").select("document_paths").eq("id", id).eq("user_id", user.id).single();
  if (data?.document_paths?.length) await supabase.storage.from("exam-papers").remove(data.document_paths);
  await supabase.from("study_sessions").delete().eq("id", id).eq("user_id", user.id);
  return Response.json({ ok: true });
}

function jsonErr(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/app/lib/supabase/server";
import { STUDY_SYSTEM_PROMPT } from "@/app/lib/prompts";
import { checkAndDeductCredits, insufficientCreditsError, CREDIT_COSTS } from "@/app/lib/usage";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };
type Turn = { role: "user" | "model"; parts: GeminiPart[] };

function mimeFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return (
    { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" }[ext] ??
    "application/pdf"
  );
}

function jsonErr(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonErr("Unauthorized", 401);

  const { data: messages } = await supabase
    .from("paper_chat_messages")
    .select("id, role, content, created_at")
    .eq("paper_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return Response.json(messages ?? []);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonErr("GEMINI_API_KEY not configured", 500);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonErr("Unauthorized", 401);

  const rl = checkRateLimit(`${user.id}:paper-chat`, LIMITS.ai);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const credit = await checkAndDeductCredits(supabase, user.id, "paper_chat");
  if (!credit.allowed) return insufficientCreditsError("paper_chat", credit.balance, CREDIT_COSTS.paper_chat);

  const body = await request.json().catch(() => ({}));
  const message: string = body.message ?? "";
  if (!message.trim()) return jsonErr("Message required", 400);
  if (message.length > 4000) return jsonErr("Message too long (max 4000 characters)", 400);

  const [paperRes, historyRes] = await Promise.all([
    supabase.from("exam_papers").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase
      .from("paper_chat_messages")
      .select("role, content")
      .eq("paper_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  if (!paperRes.data) return jsonErr("Paper not found", 404);
  const paper = paperRes.data;
  const history = historyRes.data ?? [];
  const isFirst = history.length === 0;

  await supabase.from("paper_chat_messages").insert({ paper_id: id, user_id: user.id, role: "user", content: message });

  const pdfParts: GeminiPart[] = [];
  if (isFirst) {
    for (const path of paper.file_paths as string[]) {
      try {
        const { data: blob } = await supabase.storage.from("exam-papers").download(path);
        if (blob) {
          const bytes = await blob.arrayBuffer();
          if (bytes.byteLength <= 20 * 1024 * 1024) {
            pdfParts.push({ inlineData: { mimeType: mimeFromPath(path), data: Buffer.from(bytes).toString("base64") } });
          }
        }
      } catch { /* skip unreadable files */ }
    }
  }

  const contents: Turn[] = isFirst && pdfParts.length
    ? [{ role: "user", parts: [...pdfParts, { text: `I've uploaded a past exam paper: ${paper.name} (${paper.subject}, ${paper.exam_type} ${paper.year}). Please review it.\n\nMy question: ${message}` }] }]
    : [
        ...history.map(m => ({
          role: m.role === "user" ? "user" as const : "model" as const,
          parts: [{ text: m.content }],
        })),
        { role: "user" as const, parts: [{ text: message }] },
      ];

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: STUDY_SYSTEM_PROMPT });

  let reply = "";
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await model.generateContentStream({ contents, generationConfig: { maxOutputTokens: 8192 } });
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) { reply += text; controller.enqueue(new TextEncoder().encode(text)); }
        }
        await supabase.from("paper_chat_messages").insert({ paper_id: id, user_id: user.id, role: "assistant", content: reply });
        controller.close();
      } catch (err) {
        controller.enqueue(new TextEncoder().encode(`\n\n**Error:** ${err instanceof Error ? err.message : "Failed"}`));
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
}

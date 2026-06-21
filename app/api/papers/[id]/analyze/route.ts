import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL } from "@/app/lib/ai";
import { createClient } from "@/app/lib/supabase/server";
import { EXAM_STRUCTURE_PROMPT } from "@/app/lib/prompts";

import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

function mimeFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" }[ext] ?? "application/pdf";
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonErr("Unauthorized", 401);

  const rl = checkRateLimit(`${user.id}:paper-analyze`, LIMITS.ai);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonErr("GEMINI_API_KEY not configured", 500);

  const { data: paper } = await supabase
    .from("exam_papers")
    .select("id, file_paths, exam_structure")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!paper) return jsonErr("Paper not found", 404);

  // Already analysed — skip
  if (paper.exam_structure) {
    return Response.json({ ok: true, cached: true });
  }

  type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
  const parts: Part[] = [];

  for (const path of (paper.file_paths as string[])) {
    const { data: blob } = await supabase.storage.from("exam-papers").download(path);
    if (blob) {
      parts.push({
        inlineData: {
          mimeType: mimeFromPath(path),
          data: Buffer.from(await blob.arrayBuffer()).toString("base64"),
        },
      });
    }
  }

  if (!parts.length) return jsonErr("Could not load paper files", 500);

  parts.push({ text: EXAM_STRUCTURE_PROMPT });

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
    generationConfig: { maxOutputTokens: 8192 },
  });

  const structure = result.response.text();
  if (!structure) return jsonErr("Structure extraction produced no output", 500);

  // Analysis is free — no credit deduction needed
  await supabase.from("exam_papers").update({ exam_structure: structure }).eq("id", id);

  return Response.json({ ok: true });
}

function jsonErr(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
}

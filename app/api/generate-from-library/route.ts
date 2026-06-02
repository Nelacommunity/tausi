import { GoogleGenerativeAI } from "@google/generative-ai";
import { EXAM_SYSTEM_PROMPT } from "@/app/lib/prompts";
import { createClient } from "@/app/lib/supabase/server";
import { checkTokenLimit, recordTokenUsage, tokenLimitError } from "@/app/lib/usage";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

function mimeFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" }[ext] ?? "application/pdf";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonErr("You must be signed in.", 401);

  const rl = checkRateLimit(`${user.id}:generate-exam`, LIMITS.ai);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const tokenCheck = await checkTokenLimit(supabase, user.id, "exam_prediction");
  if (!tokenCheck.allowed) return tokenLimitError("exam_prediction", tokenCheck.used, tokenCheck.limit);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonErr("GEMINI_API_KEY is not configured", 500);

  let body: { paperIds?: string[]; notes?: string };
  try { body = await request.json(); }
  catch { return jsonErr("Invalid JSON body", 400); }

  const { paperIds, notes = "" } = body;
  if (!paperIds?.length)  return jsonErr("No papers selected", 400);
  if (paperIds.length > 3) return jsonErr("Max 3 papers allowed", 400);

  const { data: papers, error: papersError } = await supabase
    .from("exam_papers")
    .select("id, name, subject, exam_type, year, file_paths, exam_structure")
    .in("id", paperIds)
    .eq("user_id", user.id);

  if (papersError) return jsonErr(`Database error: ${papersError.message}`, 500);
  if (!papers?.length) return jsonErr("Papers not found — make sure the selected papers belong to your account.", 404);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: EXAM_SYSTEM_PROMPT });

  type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
  let parts: Part[];
  let usingStructure = false;

  // ── Fast path: all papers have a pre-extracted structure ─────────────────
  const allHaveStructure = papers.every(p => p.exam_structure);

  if (allHaveStructure) {
    usingStructure = true;
    const descriptions = papers
      .map((p, i) =>
        `## Paper ${i + 1}: ${p.name} — ${p.subject} (${p.exam_type} ${p.year})\n\n${p.exam_structure}`
      )
      .join("\n\n---\n\n");

    const prompt = papers.length === 1
      ? `Generate a new predicted exam paper based on the following structure extracted from the original past paper:\n\n${descriptions}`
      : `Generate a new predicted exam paper that combines patterns from the following ${papers.length} past papers. Incorporate question styles, topic distribution, and format from all papers:\n\n${descriptions}`;

    parts = [{ text: notes ? `${prompt}\n\nAdditional instructions: ${notes}` : prompt }];
  } else {
    // ── Slow path: download the actual PDFs ───────────────────────────────
    parts = [];
    for (const paper of papers) {
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
    }

    if (!parts.length) return jsonErr("Could not load paper files", 500);

    const prompt = papers.length === 1
      ? `Analyse this past exam paper and generate a new predicted exam paper that follows the exact same format and structure.`
      : `Analyse these ${papers.length} past exam papers and generate a new predicted exam paper that follows the exact same format and structure, incorporating patterns from all papers.`;
    parts.push({ text: notes ? `${prompt}\n\nAdditional instructions: ${notes}` : prompt });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        // If using structure, signal it to the client so a badge can be shown
        if (usingStructure) controller.enqueue(enc.encode("<!--FROM_STRUCTURE-->\n"));

        const result = await model.generateContentStream({
          contents: [{ role: "user", parts }],
          generationConfig: { maxOutputTokens: 65536 },
        });

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(enc.encode(text));
        }

        const tokens = (await result.response).usageMetadata?.totalTokenCount ?? 0;
        await recordTokenUsage(supabase, user.id, "exam_prediction", tokens);

        // If some papers lacked structure, trigger background analysis for next time
        const papersWithoutStructure = papers.filter(p => !p.exam_structure);
        for (const p of papersWithoutStructure) {
          fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/papers/${p.id}/analyze`, { method: "POST" }).catch(() => {});
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

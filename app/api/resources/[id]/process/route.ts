import { getViewer, jsonError } from "@/app/lib/learning/server";
import { processResource, type ResourceRow } from "@/app/lib/learning/resources";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

// Extraction + AI topic analysis of a long document can take a while.
export const maxDuration = 300;

/** Process an uploaded resource: extract text, find topics, create its level. Owner only. */
export async function POST(_request: Request, ctx: RouteContext<"/api/resources/[id]/process">) {
  const { id } = await ctx.params;
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:resource-process`, LIMITS.ai);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const { data } = await db.from("resources").select("*").eq("id", id).maybeSingle();
  const r = data as ResourceRow | null;
  if (!r || r.owner_id !== user.id) return jsonError("Not found", 404);
  if (r.status === "processing") return jsonError("This file is already being processed.", 409);

  try {
    await processResource(db, r);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Processing failed", 422);
  }
  return Response.json({ ok: true, id });
}

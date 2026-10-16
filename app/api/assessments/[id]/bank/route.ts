import { z } from "zod";
import { getViewer, jsonError } from "@/app/lib/learning/server";
import { assessmentDetail, assessmentQuestions, ownedAssessment } from "@/app/lib/learning/queries";
import { appendItems } from "@/app/lib/learning/builder";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

const schema = z.object({
  kpIds: z.array(z.string().uuid()).min(1).max(20),
  count: z.number().int().min(1).max(30),
});

/** Add already-approved questions from the shared bank, spread across the chosen KPs. */
export async function POST(request: Request, ctx: RouteContext<"/api/assessments/[id]/bank">) {
  const { id } = await ctx.params;
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:bank`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const a = await ownedAssessment(db, id, user.id);
  if (!a) return jsonError("Not found", 404);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Choose at least one knowledge point.", 400);

  const { data } = await db
    .from("question_kps")
    .select("kp_id, questions!inner(id, status, level_id)")
    .in("kp_id", parsed.data.kpIds)
    .eq("questions.status", "approved")
    .eq("questions.level_id", a.level_id);

  const already = new Set((await assessmentQuestions(db, id)).map((q) => q.id));
  // Round-robin across KPs so one big KP doesn't crowd out the rest.
  const byKp = new Map<string, string[]>();
  for (const r of (data ?? []) as unknown as { kp_id: string; questions: { id: string } }[]) {
    if (already.has(r.questions.id)) continue;
    const list = byKp.get(r.kp_id) ?? [];
    list.push(r.questions.id);
    byKp.set(r.kp_id, list);
  }
  for (const list of byKp.values()) list.sort(() => Math.random() - 0.5);
  const picked: string[] = [];
  const queues = [...byKp.values()];
  while (picked.length < parsed.data.count && queues.some((q) => q.length)) {
    for (const q of queues) {
      const next = q.shift();
      if (next && !picked.includes(next)) picked.push(next);
      if (picked.length >= parsed.data.count) break;
    }
  }
  if (!picked.length) return jsonError("No more bank questions for those knowledge points — try AI drafting.", 404);

  await appendItems(db, id, picked);
  return Response.json(await assessmentDetail(db, id, user.id));
}

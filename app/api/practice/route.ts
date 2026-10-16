import { z } from "zod";
import { getViewer, jsonError } from "@/app/lib/learning/server";
import { levelKpStates, recomputeMastery } from "@/app/lib/learning/mastery-store";
import { pickPracticeTargets } from "@/app/lib/mastery";
import { isCorrect, type QuestionType } from "@/app/lib/learning/grading";
import { practiceReview } from "@/app/lib/learning/review";
import { toStudentQuestion } from "@/app/lib/learning/queries";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

const SET_SIZE = 10;

/**
 * "Practice my weak areas": an adaptive set aimed at the student's
 * lowest-mastery KPs in a level. Questions answered correctly in the last
 * week are skipped so practice moves on to new material.
 */
export async function GET(request: Request) {
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:practice`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const levelId = new URL(request.url).searchParams.get("levelId");
  if (!levelId || !z.string().uuid().safeParse(levelId).success) return jsonError("Choose a level.", 400);
  const { data: level } = await db.from("curriculum_levels").select("id, name, curricula(name)").eq("id", levelId).maybeSingle();
  if (!level) return jsonError("Level not found", 404);

  const states = await levelKpStates(db, user.id, levelId);
  const targets = pickPracticeTargets(states, 3);

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: recent } = await db.from("answers").select("question_id").eq("user_id", user.id).eq("is_correct", true).gte("created_at", weekAgo);
  const skip = new Set((recent ?? []).map((r) => r.question_id as string));

  const { data: pool } = await db.from("question_kps")
    .select("kp_id, questions!inner(id, type, prompt, options, status, level_id)")
    .in("kp_id", targets.map((t) => t.kpId))
    .eq("questions.status", "approved")
    .eq("questions.level_id", levelId);
  type Row = { kp_id: string; questions: { id: string; type: QuestionType; prompt: string; options: string[] } };
  const byKp = new Map<string, Row["questions"][]>();
  for (const r of (pool ?? []) as unknown as Row[]) {
    const list = byKp.get(r.kp_id) ?? [];
    list.push(r.questions);
    byKp.set(r.kp_id, list);
  }
  // Weakest KP gets the most questions (5 / 3 / 2), fresh questions first.
  const quota = [5, 3, 2];
  const chosen = new Map<string, Row["questions"]>();
  targets.forEach((t, i) => {
    const fresh = (byKp.get(t.kpId) ?? [])
      .filter((q) => !chosen.has(q.id))
      .sort(() => Math.random() - 0.5)
      .sort((a, b) => Number(skip.has(a.id)) - Number(skip.has(b.id)));
    for (const q of fresh.slice(0, quota[i])) chosen.set(q.id, q);
  });
  // Top up from any target KP if one ran short.
  for (const list of byKp.values()) for (const q of list) {
    if (chosen.size >= SET_SIZE) break;
    if (!chosen.has(q.id)) chosen.set(q.id, q);
  }

  return Response.json({
    levelName: level.name,
    curriculumName: (level.curricula as unknown as { name: string })?.name ?? "",
    targets: targets.map((t) => ({ kpId: t.kpId, name: t.name, mastery: t.mastery, attempts: t.attempts })),
    questions: [...chosen.values()].slice(0, SET_SIZE).sort(() => Math.random() - 0.5).map(toStudentQuestion),
  });
}

const submitSchema = z.object({
  levelId: z.string().uuid(),
  responses: z.array(z.object({ questionId: z.string().uuid(), response: z.string().max(200) })).min(1).max(30),
});

/** Grade a practice set, record it, update mastery, and return the review plus mastery changes. */
export async function POST(request: Request) {
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:practice-submit`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const parsed = submitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid submission", 400);
  const { levelId, responses } = parsed.data;

  const ids = responses.map((r) => r.questionId);
  const { data: qs } = await db.from("questions").select("id, type, answer, level_id, status").in("id", ids);
  const valid = new Map((qs ?? []).filter((q) => q.level_id === levelId && q.status === "approved").map((q) => [q.id as string, q]));
  const rows = responses.filter((r) => valid.has(r.questionId)).map((r) => {
    const q = valid.get(r.questionId)!;
    return { user_id: user.id, question_id: r.questionId, response: r.response, is_correct: isCorrect(q.type as QuestionType, r.response, q.answer as string), source: "practice" };
  });
  if (!rows.length) return jsonError("No valid answers", 400);

  const before = new Map((await levelKpStates(db, user.id, levelId)).map((k) => [k.kpId, k.mastery]));
  const { error } = await db.from("answers").insert(rows);
  if (error) return jsonError(error.message, 500);
  await recomputeMastery(db, user.id);
  const after = await levelKpStates(db, user.id, levelId);

  const items = await practiceReview(db, user.id, rows.map((r) => r.question_id));
  const touched = new Set(items.flatMap((i) => i.kps.map((k) => k.id)));
  return Response.json({
    correct: rows.filter((r) => r.is_correct).length,
    total: rows.length,
    items,
    changes: after.filter((k) => touched.has(k.kpId)).map((k) => ({
      kpId: k.kpId, name: k.name, before: before.get(k.kpId) ?? 0.5, after: k.mastery,
    })),
  });
}

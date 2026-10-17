import { z } from "zod";
import { getViewer, jsonError } from "@/app/lib/learning/server";
import { displayNameOf } from "@/app/lib/learning/reports";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

const schema = z.object({
  kind: z.enum(["lesson", "speaking"]),
  title: z.string().trim().min(1).max(200),
  score: z.number().min(0).max(100),
  details: z.record(z.string(), z.unknown()).default({}),
  /** True when Shuō sent it automatically (the student's setting), false for a tap. */
  auto: z.boolean().default(false),
  /** Which classes to send to; all the student's classes if omitted. */
  classIds: z.array(z.string().uuid()).max(20).optional(),
});

/**
 * A student shares a Shuō result (lesson score or speaking report) with the
 * teachers of their classes. Only classes they belong to are accepted; each
 * teacher gets a notification linking to the class page.
 */
export async function POST(request: Request) {
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:shuo-results`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid result", 400);
  const r = parsed.data;
  if (JSON.stringify(r.details).length > 20_000) return jsonError("Result details too large", 413);

  const { data: memberships } = await db.from("class_members")
    .select("class_id, classes(id, name, teacher_id)").eq("student_id", user.id);
  type M = { class_id: string; classes: { id: string; name: string; teacher_id: string } };
  let targets = ((memberships ?? []) as unknown as M[]).map((m) => m.classes).filter(Boolean);
  if (r.classIds) targets = targets.filter((c) => r.classIds!.includes(c.id));
  if (!targets.length) return jsonError("Join a class in Tausi first, then you can share results with your teacher.", 400);

  const score = Math.round(r.score);
  const { error } = await db.from("shuo_results").insert(targets.map((c) => ({
    student_id: user.id, class_id: c.id, kind: r.kind, title: r.title, score, details: r.details, auto: r.auto,
  })));
  if (error) return jsonError(error.message, 500);

  const { data: profile } = await db.from("profiles").select("display_name, full_name, email").eq("id", user.id).maybeSingle();
  const name = displayNameOf(profile ?? { email: user.email });
  await db.from("notifications").insert(targets.map((c) => ({
    user_id: c.teacher_id,
    kind: "class",
    title: `${name} · Shuō ${r.kind === "lesson" ? "lesson" : "speaking practice"}`,
    body: `${r.title} · ${score}% · ${c.name}`,
    link: `/teach/classes/${c.id}`,
    class_id: c.id,
  })));

  return Response.json({ sent: targets.map((c) => ({ id: c.id, name: c.name })) });
}

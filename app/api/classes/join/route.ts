import { z } from "zod";
import { getViewer, jsonError } from "@/app/lib/learning/server";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

const schema = z.object({ code: z.string().trim().min(4).max(12) });

/** A student joins a class with the teacher's class code. */
export async function POST(request: Request) {
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:class-join`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter the class code.", 400);
  const { data: cls } = await db.from("classes").select("id, name, teacher_id").eq("join_code", parsed.data.code.toUpperCase()).maybeSingle();
  if (!cls) return jsonError("No class with that code.", 404);
  if (cls.teacher_id === user.id) return jsonError("You teach this class.", 400);

  const { error } = await db.from("class_members").upsert({ class_id: cls.id, student_id: user.id }, { onConflict: "class_id,student_id", ignoreDuplicates: true });
  if (error) return jsonError(error.message, 500);
  return Response.json({ id: cls.id, name: cls.name });
}

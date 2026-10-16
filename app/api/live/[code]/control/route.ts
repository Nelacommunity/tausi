import { after } from "next/server";
import { z } from "zod";
import { getViewer, jsonError } from "@/app/lib/learning/server";
import { loadSession, sessionQuestions, type LiveStatus } from "@/app/lib/learning/live";
import { recomputeMastery } from "@/app/lib/learning/mastery-store";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

const schema = z.object({ action: z.enum(["start", "reveal", "next", "end"]) });

/** Host controls: start, reveal (game), next question (game), end. */
export async function POST(request: Request, ctx: RouteContext<"/api/live/[code]/control">) {
  const { code } = await ctx.params;
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:live-control`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid action", 400);
  const session = await loadSession(db, code);
  if (!session || session.host_id !== user.id) return jsonError("Not found", 404);

  const { action } = parsed.data;
  const now = new Date().toISOString();
  const questions = await sessionQuestions(db, session);
  let update: Record<string, unknown> | null = null;

  if (action === "start" && session.status === "lobby") {
    update = session.mode === "exam"
      ? { status: "active" satisfies LiveStatus, started_at: now }
      : { status: "question" satisfies LiveStatus, started_at: now, current_index: 0, question_started_at: now };
  } else if (action === "reveal" && session.mode === "game" && session.status === "question") {
    update = { status: "reveal" satisfies LiveStatus };
    // Anyone who didn't answer loses their streak.
    const { data: answered } = await db.from("answers").select("participant_id")
      .eq("session_id", session.id).eq("question_id", questions[session.current_index]?.id ?? "");
    const ids = (answered ?? []).map((a) => a.participant_id as string);
    let reset = db.from("session_participants").update({ streak: 0 }).eq("session_id", session.id);
    if (ids.length) reset = reset.not("id", "in", `(${ids.join(",")})`);
    await reset;
  } else if (action === "next" && session.mode === "game" && (session.status === "question" || session.status === "reveal")) {
    const next = session.current_index + 1;
    update = next < questions.length
      ? { status: "question" satisfies LiveStatus, current_index: next, question_started_at: now }
      : { status: "finished" satisfies LiveStatus, ended_at: now };
  } else if (action === "end" && session.status !== "finished") {
    update = { status: "finished" satisfies LiveStatus, ended_at: now };
  }

  if (!update) return jsonError("That action isn't available right now.", 409);
  const { error } = await db.from("live_sessions").update(update).eq("id", session.id);
  if (error) return jsonError(error.message, 500);

  // Session over: make sure every signed-in player's mastery reflects it.
  if (update.status === "finished") {
    after(async () => {
      const { data: players } = await db.from("session_participants").select("user_id").eq("session_id", session.id).not("user_id", "is", null);
      for (const p of players ?? []) await recomputeMastery(db, p.user_id as string).catch(() => {});
    });
  }
  return Response.json({ ok: true, status: update.status });
}

import { z } from "zod";
import { getViewer, jsonError } from "@/app/lib/learning/server";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

/** My latest notifications and how many are unread. */
export async function GET() {
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:notifications`, { windowMs: 60_000, max: 120 });
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const [{ data }, { count }] = await Promise.all([
    db.from("notifications")
      .select("id, kind, title, body, link, read_at, created_at, live_sessions(status)")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    db.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
  ]);
  type Row = { id: string; kind: string; title: string; body: string; link: string | null; read_at: string | null; created_at: string; live_sessions: { status: string } | null };
  return Response.json({
    unread: count ?? 0,
    items: ((data ?? []) as unknown as Row[]).map((n) => ({
      id: n.id, kind: n.kind, title: n.title, body: n.body, link: n.link, read: !!n.read_at, createdAt: n.created_at,
      sessionStatus: n.live_sessions?.status ?? null,
    })),
  });
}

const schema = z.object({ ids: z.array(z.string().uuid()).max(100).optional() });

/** Mark notifications read: the given ids, or all of mine. */
export async function POST(request: Request) {
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:notifications-read`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid request", 400);

  let q = db.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  if (parsed.data.ids?.length) q = q.in("id", parsed.data.ids);
  await q;
  return Response.json({ ok: true });
}

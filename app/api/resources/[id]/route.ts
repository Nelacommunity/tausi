import { z } from "zod";
import { getViewer, jsonError } from "@/app/lib/learning/server";
import { RESOURCE_BUCKET, viewableResource } from "@/app/lib/learning/resources";
import { levelKpStates } from "@/app/lib/learning/mastery-store";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

/** Characters of extracted text sent for the in-app reading view. */
const PREVIEW_CHARS = 60_000;

/** A resource: download link, readable text, topics and the viewer's mastery of each. */
export async function GET(_request: Request, ctx: RouteContext<"/api/resources/[id]">) {
  const { id } = await ctx.params;
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:resource-get`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const r = await viewableResource(db, id, user.id);
  if (!r) return jsonError("Not found", 404);
  const isOwner = r.owner_id === user.id;
  if (r.status !== "ready" && !isOwner) return jsonError("Not found", 404);

  const [{ data: signed }, topics, { data: cls }] = await Promise.all([
    db.storage.from(RESOURCE_BUCKET).createSignedUrl(r.file_path, 60 * 60, { download: r.file_name }),
    r.level_id ? levelKpStates(db, user.id, r.level_id) : Promise.resolve([]),
    r.class_id ? db.from("classes").select("name").eq("id", r.class_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const text = r.content_text ?? "";
  return Response.json({
    id: r.id, title: r.title, fileName: r.file_name, kind: r.kind, sizeBytes: r.size_bytes,
    status: r.status, error: r.error, summary: r.summary, levelId: r.level_id,
    classId: r.class_id, className: (cls as { name: string } | null)?.name ?? null,
    isOwner, createdAt: r.created_at, downloadUrl: signed?.signedUrl ?? null,
    text: text.slice(0, PREVIEW_CHARS), textTruncated: text.length > PREVIEW_CHARS,
    topics,
  });
}

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  classId: z.string().uuid().nullable().optional(),
});

/** Rename a resource or share it with a different class (owner only). */
export async function PATCH(request: Request, ctx: RouteContext<"/api/resources/[id]">) {
  const { id } = await ctx.params;
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request", 400);
  const { data: r } = await db.from("resources").select("owner_id, level_id").eq("id", id).maybeSingle();
  if (!r || r.owner_id !== user.id) return jsonError("Not found", 404);

  const updates: Record<string, unknown> = {};
  if (parsed.data.title) updates.title = parsed.data.title;
  if (parsed.data.classId !== undefined) {
    if (parsed.data.classId) {
      const { data: cls } = await db.from("classes").select("teacher_id").eq("id", parsed.data.classId).maybeSingle();
      if (cls?.teacher_id !== user.id) return jsonError("Class not found", 404);
    }
    updates.class_id = parsed.data.classId;
  }
  if (Object.keys(updates).length) await db.from("resources").update(updates).eq("id", id);
  if (parsed.data.title && r.level_id) await db.from("curriculum_levels").update({ name: parsed.data.title }).eq("id", r.level_id);
  return Response.json({ ok: true });
}

/** Delete a resource, its file, and the level/topics/questions generated from it (owner only). */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/resources/[id]">) {
  const { id } = await ctx.params;
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const { data: r } = await db.from("resources").select("owner_id, file_path, level_id").eq("id", id).maybeSingle();
  if (!r || r.owner_id !== user.id) return jsonError("Not found", 404);

  await db.storage.from(RESOURCE_BUCKET).remove([r.file_path as string]);
  await db.from("resources").delete().eq("id", id);
  if (r.level_id) await db.from("curriculum_levels").delete().eq("id", r.level_id);
  return Response.json({ ok: true });
}

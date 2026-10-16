import { z } from "zod";
import { getViewer, jsonError } from "@/app/lib/learning/server";
import { MAX_RESOURCE_BYTES, RESOURCE_BUCKET, userClassIds } from "@/app/lib/learning/resources";
import { MIME_FOR_KIND, resourceKind } from "@/app/lib/learning/extract";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";
import type { ResourceSummary } from "@/app/lib/learning/types";

/** Resources I uploaded, plus ready resources shared with any class I'm in. */
export async function GET() {
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:resources`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const classIds = await userClassIds(db, user.id);
  const cols = "id, owner_id, title, file_name, kind, size_bytes, status, error, summary, class_id, level_id, created_at, classes(name)";
  const [{ data: mine }, { data: shared }] = await Promise.all([
    db.from("resources").select(cols).eq("owner_id", user.id).order("created_at", { ascending: false }),
    classIds.length
      ? db.from("resources").select(cols).in("class_id", classIds).eq("status", "ready").neq("owner_id", user.id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  type Row = { id: string; owner_id: string; title: string; file_name: string; kind: string; size_bytes: number; status: string; error: string | null; summary: string | null; class_id: string | null; level_id: string | null; created_at: string; classes: { name: string } | null };
  const list: ResourceSummary[] = ([...(mine ?? []), ...(shared ?? [])] as unknown as Row[]).map((r) => ({
    id: r.id, title: r.title, fileName: r.file_name, kind: r.kind, sizeBytes: r.size_bytes, status: r.status,
    error: r.error, summary: r.summary, classId: r.class_id, className: r.classes?.name ?? null,
    levelId: r.level_id, isOwner: r.owner_id === user.id, createdAt: r.created_at,
  }));
  return Response.json(list);
}

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().max(200),
  size: z.number().int().min(1),
  classId: z.string().uuid().nullable().optional(),
});

/**
 * Start an upload: create the resource record and return a signed upload URL.
 * The browser sends the file straight to Storage (so hosting request-size
 * limits don't apply), then calls /process.
 */
export async function POST(request: Request) {
  const { user, role, db } = await getViewer({ withRole: true });
  if (!user) return jsonError("Unauthorized", 401);
  if (role !== "teacher") return jsonError("Teachers only", 403);
  const rl = checkRateLimit(`${user.id}:resources-create`, LIMITS.upload);
  if (!rl.allowed) return rateLimitError(rl.resetAt);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid upload", 400);
  const { title, fileName, mimeType, size, classId } = parsed.data;

  const kind = resourceKind(mimeType, fileName);
  if (!kind) return jsonError("Upload a PDF, Word (.docx), PowerPoint (.pptx) or text/Markdown file.", 400);
  if (size > MAX_RESOURCE_BYTES) return jsonError("Files can be up to 25 MB.", 400);
  if (classId) {
    const { data: cls } = await db.from("classes").select("teacher_id").eq("id", classId).maybeSingle();
    if (cls?.teacher_id !== user.id) return jsonError("Class not found", 404);
  }

  const id = crypto.randomUUID();
  const safeName = fileName.replace(/[^\w.\-]+/g, "_").slice(-120);
  const path = `${user.id}/${id}/${safeName}`;
  const { error } = await db.from("resources").insert({
    id, owner_id: user.id, class_id: classId ?? null, title, file_name: fileName, file_path: path,
    mime_type: MIME_FOR_KIND[kind], size_bytes: size, kind, status: "uploading",
  });
  if (error) return jsonError(error.message, 500);

  const { data: signed, error: signError } = await db.storage.from(RESOURCE_BUCKET).createSignedUploadUrl(path);
  if (signError || !signed) {
    await db.from("resources").delete().eq("id", id);
    return jsonError(signError?.message ?? "Could not start the upload", 500);
  }
  return Response.json({ id, path, token: signed.token, contentType: MIME_FOR_KIND[kind] });
}

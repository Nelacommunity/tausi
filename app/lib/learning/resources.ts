// Teaching resources (notes, slides, documents) uploaded by teachers.
//
// Lifecycle: the browser uploads the file straight to Supabase Storage with a
// signed URL (no request-size limits), then asks the API to process it:
//   download → extract text (OCR fallback for scanned PDFs) → AI summary and
//   3–8 topics → a level in the owner's private "Class materials" curriculum,
//   with the topics as knowledge points.
// From then on, questions drafted from the resource are tagged with those
// topics and feed the same mastery / readiness model as any curriculum.

import type { SupabaseClient } from "@supabase/supabase-js";
import { analyseResource, transcribePdf } from "./ai";
import { extractResourceText, meaningfulLength, MAX_STORED_CHARS, type ResourceKind } from "./extract";

export const RESOURCE_BUCKET = "resources";
export const MAX_RESOURCE_BYTES = 25 * 1024 * 1024;

export interface ResourceRow {
  id: string;
  owner_id: string;
  class_id: string | null;
  level_id: string | null;
  title: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  kind: ResourceKind;
  status: "uploading" | "processing" | "ready" | "failed";
  error: string | null;
  summary: string | null;
  content_text: string | null;
  created_at: string;
}

/** The owner's private curriculum that holds one level per resource. */
async function materialsCurriculum(db: SupabaseClient, ownerId: string): Promise<string> {
  const slug = `materials-${ownerId}`;
  const { data: existing } = await db.from("curricula").select("id").eq("slug", slug).maybeSingle();
  if (existing) return existing.id as string;
  const { data, error } = await db.from("curricula").insert({
    slug, owner_id: ownerId, name: "Class materials", subject: "Teacher resources",
    description: "Levels generated from uploaded notes, slides and documents.",
  }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

/** Extract, analyse and turn a freshly uploaded resource into a level with topic KPs. */
export async function processResource(db: SupabaseClient, r: ResourceRow): Promise<void> {
  await db.from("resources").update({ status: "processing", error: null }).eq("id", r.id);
  try {
    const { data: blob, error: dlError } = await db.storage.from(RESOURCE_BUCKET).download(r.file_path);
    if (dlError || !blob) throw new Error("The uploaded file could not be read.");
    const buf = Buffer.from(await blob.arrayBuffer());

    let text = await extractResourceText(r.kind, buf);
    if (r.kind === "pdf" && meaningfulLength(text) < 50) {
      // Scanned PDF with no text layer — let the model read the pages.
      text = (await transcribePdf(buf)).slice(0, MAX_STORED_CHARS);
    }
    if (meaningfulLength(text) < 30) throw new Error("No readable text was found in this file.");

    const analysis = await analyseResource(r.title, text);

    const curriculumId = await materialsCurriculum(db, r.owner_id);
    let levelId = r.level_id;
    if (levelId) {
      await db.from("knowledge_points").delete().eq("level_id", levelId);
      await db.from("curriculum_levels").update({ name: r.title }).eq("id", levelId);
    } else {
      const { count } = await db.from("curriculum_levels").select("id", { count: "exact", head: true }).eq("curriculum_id", curriculumId);
      const { data: level, error } = await db.from("curriculum_levels").insert({
        curriculum_id: curriculumId, code: `R-${r.id.slice(0, 8)}`, name: r.title, ordinal: count ?? 0,
      }).select("id").single();
      if (error) throw new Error(error.message);
      levelId = level.id as string;
    }
    const { error: kpError } = await db.from("knowledge_points").insert(analysis.topics.map((t, i) => ({
      level_id: levelId, code: `T${i + 1}`, name: t.name, description: t.description,
      category: "topic", is_core: true, ordinal: i,
    })));
    if (kpError) throw new Error(kpError.message);

    await db.from("resources").update({
      status: "ready", level_id: levelId, summary: analysis.summary, content_text: text, error: null,
    }).eq("id", r.id);
  } catch (err) {
    await db.from("resources").update({
      status: "failed", error: err instanceof Error ? err.message.slice(0, 300) : "Processing failed",
    }).eq("id", r.id);
    throw err;
  }
}

/** The resource if `userId` may see it: the owner, or a member of its class. */
export async function viewableResource(db: SupabaseClient, id: string, userId: string): Promise<ResourceRow | null> {
  const { data } = await db.from("resources").select("*").eq("id", id).maybeSingle();
  const r = data as ResourceRow | null;
  if (!r) return null;
  if (r.owner_id === userId) return r;
  if (!r.class_id) return null;
  const { data: member } = await db.from("class_members").select("student_id").eq("class_id", r.class_id).eq("student_id", userId).maybeSingle();
  return member ? r : null;
}

/** Ids of every class the user teaches or belongs to. */
export async function userClassIds(db: SupabaseClient, userId: string): Promise<string[]> {
  const [{ data: taught }, { data: joined }] = await Promise.all([
    db.from("classes").select("id").eq("teacher_id", userId),
    db.from("class_members").select("class_id").eq("student_id", userId),
  ]);
  return [...(taught ?? []).map((c) => c.id as string), ...(joined ?? []).map((m) => m.class_id as string)];
}

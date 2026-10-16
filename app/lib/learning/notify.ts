import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Tell every member of a class that a live exam is open. The notification
 * links straight to /play/<CODE>, where signed-in members join in one tap.
 * Delivered live to open browsers via Supabase Realtime on `notifications`.
 */
export async function notifyClass(
  db: SupabaseClient,
  classId: string,
  className: string,
  title: string,
  mode: "exam" | "game",
  session: { id: string; join_code: string },
): Promise<void> {
  const { data: members } = await db.from("class_members").select("student_id").eq("class_id", classId);
  if (!members?.length) return;
  await db.from("notifications").insert(members.map((m) => ({
    user_id: m.student_id,
    kind: "session",
    title,
    body: `${className} · ${mode === "exam" ? "exam" : "game"} · ${session.join_code}`,
    link: `/play/${session.join_code}`,
    session_id: session.id,
    class_id: classId,
  })));
}

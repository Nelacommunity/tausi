import { getViewer, jsonError } from "@/app/lib/learning/server";
import { assessmentDetail, ownedAssessment } from "@/app/lib/learning/queries";

/** Remove a question from the exam. The teacher's own unapproved drafts are deleted outright. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/assessments/[id]/items">) {
  const { id } = await ctx.params;
  const questionId = new URL(request.url).searchParams.get("questionId");
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const a = await ownedAssessment(db, id, user.id);
  if (!a || !questionId) return jsonError("Not found", 404);

  await db.from("assessment_items").delete().eq("assessment_id", id).eq("question_id", questionId);
  await db.from("questions").delete().eq("id", questionId).eq("created_by", user.id).neq("status", "approved");
  return Response.json(await assessmentDetail(db, id, user.id));
}

import { getViewer, jsonError } from "@/app/lib/learning/server";
import { curriculumTree } from "@/app/lib/learning/queries";
import { checkRateLimit, LIMITS, rateLimitError } from "@/app/lib/rate-limit";

export async function GET() {
  const { user, db } = await getViewer();
  if (!user) return jsonError("Unauthorized", 401);
  const rl = checkRateLimit(`${user.id}:curricula`, LIMITS.standard);
  if (!rl.allowed) return rateLimitError(rl.resetAt);
  return Response.json(await curriculumTree(db));
}

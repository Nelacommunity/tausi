/**
 * Seed curricula and (optionally) the demo dataset.
 *
 *   npm run seed                           # curricula only (idempotent)
 *   npm run seed -- --demo     # + demo teacher, class, students, history
 *   npm run seed -- --reset-questions   # replace seed questions
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * Demo accounts use DEMO_PASSWORD (default below).
 */
import { createClient } from "@supabase/supabase-js";
import { CURRICULA } from "../curricula/index.ts";
import { rng, shuffle } from "../curricula/util.ts";
import { recomputeMastery } from "../app/lib/learning/mastery-store.ts";
import { gamePoints } from "../app/lib/learning/grading.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const args = new Set(process.argv.slice(2));
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "TausiDemo2026!";

function check<T>(res: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as NonNullable<T>;
}

async function chunked<T>(rows: T[], size: number, fn: (chunk: T[]) => Promise<void>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

// ── Curricula ────────────────────────────────────────────────────────────
async function seedCurricula() {
  for (const c of CURRICULA) {
    const cur = check(await db.from("curricula")
      .upsert({ slug: c.slug, name: c.name, subject: c.subject, description: c.description }, { onConflict: "slug" })
      .select().single(), `curriculum ${c.slug}`);

    for (const [li, level] of c.levels.entries()) {
      const lvl = check(await db.from("curriculum_levels")
        .upsert({ curriculum_id: cur.id, code: level.code, name: level.name, ordinal: li }, { onConflict: "curriculum_id,code" })
        .select().single(), `level ${level.code}`);

      const kpRows = check(await db.from("knowledge_points")
        .upsert(level.knowledgePoints.map((k, ki) => ({
          level_id: lvl.id, code: k.code, name: k.name, category: k.category,
          description: k.description, is_core: k.isCore, ordinal: ki,
        })), { onConflict: "level_id,code" })
        .select("id, code"), `kps ${level.code}`);
      const kpId = new Map(kpRows.map((k) => [k.code as string, k.id as string]));

      const { count } = await db.from("questions").select("id", { count: "exact", head: true })
        .eq("level_id", lvl.id).eq("provenance", "seed");
      if ((count ?? 0) > 0 && !args.has("--reset-questions")) {
        console.log(`  ${level.code}: ${count} seed questions already present — skipping`);
        continue;
      }
      if (args.has("--reset-questions")) {
        check(await db.from("questions").delete().eq("level_id", lvl.id).eq("provenance", "seed"), "reset");
      }

      const qRows = level.questions.map((q) => ({
        id: crypto.randomUUID(),
        curriculum_id: cur.id, level_id: lvl.id, type: q.type, prompt: q.prompt,
        options: q.options, answer: q.answer, difficulty: q.difficulty,
        provenance: "seed", status: "approved",
      }));
      const links = level.questions.flatMap((q, i) => q.kps.map((code) => ({ question_id: qRows[i].id, kp_id: kpId.get(code)! })));
      await chunked(qRows, 200, async (c) => { check(await db.from("questions").insert(c), "questions"); });
      await chunked(links, 500, async (c) => { check(await db.from("question_kps").insert(c), "question_kps"); });
      console.log(`  ${level.code}: ${qRows.length} questions, ${level.knowledgePoints.length} KPs`);
    }
    console.log(`✓ ${c.name}`);
  }
}

// ── Demo dataset ─────────────────────────────────────────────────────────
// Anonymous by design: no personal names anywhere — students are animal nicknames.
const STUDENTS = ["Simba", "Twiga", "Panda", "Tembo", "Kifaru", "Chui", "Nyati", "Duma", "Kiboko", "Pundamilia"];
const TEACHER_EMAIL = "teacher@demo.tausi.app";
const studentEmail = (i: number) => `student${String(i + 1).padStart(2, "0")}@demo.tausi.app`;

async function ensureUser(email: string, role: "teacher" | "student", displayName: string): Promise<string> {
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  let user = list?.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await db.auth.admin.createUser({
      email, password: DEMO_PASSWORD, email_confirm: true,
      user_metadata: { role, full_name: displayName },
    });
    if (error) throw new Error(`create ${email}: ${error.message}`);
    user = data.user;
  }
  check(await db.from("profiles").upsert({ id: user.id, email, full_name: displayName, display_name: displayName, role }), "profile");
  return user.id;
}

interface Q { id: string; difficulty: number; kp_codes: string[]; options: string[]; answer: string; type: string }

async function levelQuestions(levelCode: string): Promise<Q[]> {
  const lvl = check(await db.from("curriculum_levels").select("id").eq("code", levelCode).single(), "level");
  const rows = check(await db.from("questions")
    .select("id, difficulty, options, answer, type, question_kps(knowledge_points(code))")
    .eq("level_id", lvl.id).eq("status", "approved"), "questions");
  return (rows as unknown as { id: string; difficulty: number; options: string[]; answer: string; type: string; question_kps: { knowledge_points: { code: string } }[] }[])
    .map((r) => ({ ...r, kp_codes: r.question_kps.map((x) => x.knowledge_points.code) }));
}

async function seedDemo() {
  const rand = rng(2026);
  const teacherId = await ensureUser(TEACHER_EMAIL, "teacher", "Demo Teacher");
  const studentIds: string[] = [];
  for (const [i, name] of STUDENTS.entries()) studentIds.push(await ensureUser(studentEmail(i), "student", name));

  // Wipe previous demo activity so the seed is repeatable.
  check(await db.from("live_sessions").delete().eq("host_id", teacherId), "wipe sessions");
  check(await db.from("assessments").delete().eq("owner_id", teacherId), "wipe assessments");
  check(await db.from("classes").delete().eq("teacher_id", teacherId), "wipe classes");
  check(await db.from("answers").delete().in("user_id", studentIds), "wipe answers");
  check(await db.from("kp_mastery").delete().in("user_id", studentIds), "wipe mastery");

  const hsk = check(await db.from("curricula").select("id").eq("slug", "hsk").single(), "hsk");
  const cls = check(await db.from("classes")
    .insert({ teacher_id: teacherId, name: "HSK Evening Class", join_code: "HSKCLS", curriculum_id: hsk.id })
    .select().single(), "class");
  check(await db.from("class_members").insert(studentIds.map((s) => ({ class_id: cls.id, student_id: s }))), "members");

  // Each student has a base ability plus per-category strengths/weaknesses,
  // and some improve over the five weeks — so dashboards show real variety.
  const profiles = STUDENTS.map((_, i) => ({
    base: [0.9, 0.75, 0.6, 0.85, 0.45, 0.7, 0.55, 0.8, 0.5, 0.65][i],
    growth: [0.05, 0.15, 0.2, 0, 0.25, 0.1, 0.15, 0.05, 0.1, 0.2][i],
    weak: [["MW"], ["TONE"], ["GR-LE", "GR-NEG"], ["CULT"], ["TONE", "MW"], ["GR-QW"], ["GR-ORDER", "GR-ZAI"], ["GR-BI"], ["MW", "GR-DE"], ["GR-GUO", "GR-DE3"]][i],
  }));
  const pCorrect = (s: number, q: Q, progress: number) => {
    const p = profiles[s];
    let ability = p.base + p.growth * progress - (q.difficulty - 2) * 0.12;
    if (q.kp_codes.some((c) => p.weak.some((w) => c.includes(w)))) ability -= 0.35;
    return Math.min(0.97, Math.max(0.05, ability));
  };

  const hsk1 = await levelQuestions("HSK1");
  const hsk2 = await levelQuestions("HSK2");
  const lvl1 = check(await db.from("curriculum_levels").select("id").eq("code", "HSK1").single(), "l1");
  const lvl2 = check(await db.from("curriculum_levels").select("id").eq("code", "HSK2").single(), "l2");

  const DAY = 86_400_000;
  const now = Date.now();
  const plan = [
    { title: "HSK 1 — Greetings, people & 是/吗", level: lvl1.id, pool: hsk1, mode: "game", daysAgo: 34, n: 15 },
    { title: "HSK 1 — Measure words & question words", level: lvl1.id, pool: hsk1, mode: "exam", daysAgo: 26, n: 20 },
    { title: "HSK 1 — Tones & everyday verbs", level: lvl1.id, pool: hsk1, mode: "game", daysAgo: 18, n: 15 },
    { title: "HSK 2 — Comparison, 过 and 得", level: lvl2.id, pool: hsk2, mode: "exam", daysAgo: 9, n: 20 },
    { title: "HSK 2 — Travel & shopping", level: lvl2.id, pool: hsk2, mode: "game", daysAgo: 3, n: 15 },
  ] as const;

  for (const [pi, s] of plan.entries()) {
    const qs = shuffle(s.pool, rand).slice(0, s.n);
    const asmt = check(await db.from("assessments").insert({
      owner_id: teacherId, title: s.title, curriculum_id: hsk.id, level_id: s.level, status: "published",
    }).select().single(), "assessment");
    check(await db.from("assessment_items").insert(qs.map((q, i) => ({ assessment_id: asmt.id, question_id: q.id, position: i }))), "items");

    const startedAt = now - s.daysAgo * DAY;
    const session = check(await db.from("live_sessions").insert({
      assessment_id: asmt.id, host_id: teacherId, class_id: cls.id, mode: s.mode,
      require_login: s.mode === "exam", join_code: `DM${pi}${"ABCDE"[pi]}${"PQRST"[pi]}${pi + 2}`,
      status: "finished", current_index: qs.length - 1, question_seconds: 20, time_limit_seconds: 1200,
      started_at: new Date(startedAt).toISOString(), ended_at: new Date(startedAt + 25 * 60_000).toISOString(),
    }).select().single(), "session");

    const progress = 1 - s.daysAgo / 34;
    for (const [si, studentId] of studentIds.entries()) {
      if (rand() < 0.08) continue; // the odd absence
      const part = check(await db.from("session_participants").insert({
        session_id: session.id, user_id: studentId, display_name: STUDENTS[si],
        joined_at: new Date(startedAt).toISOString(), submitted_at: new Date(startedAt + 20 * 60_000).toISOString(),
      }).select().single(), "participant");

      let score = 0, streak = 0;
      const rows = qs.map((q, qi) => {
        const correct = rand() < pCorrect(si, q, progress);
        const timeMs = Math.round(3000 + rand() * 14000);
        const points = s.mode === "game" ? gamePoints(correct, timeMs, 20, streak) : 0;
        streak = correct ? streak + 1 : 0;
        score += points;
        const wrong = q.options.filter((o) => o !== q.answer);
        return {
          user_id: studentId, session_id: session.id, participant_id: part.id, question_id: q.id,
          response: correct ? q.answer : (wrong[Math.floor(rand() * wrong.length)] ?? "?"),
          is_correct: correct, time_ms: timeMs, points, source: "live",
          created_at: new Date(startedAt + (qi + 1) * 60_000).toISOString(),
        };
      });
      check(await db.from("answers").insert(rows), "answers");
      check(await db.from("session_participants").update({ score }).eq("id", part.id), "score");
    }
    console.log(`  session: ${s.title}`);
  }

  // A little self-practice for half the class.
  for (const [si, studentId] of studentIds.entries()) {
    if (si % 2) continue;
    const qs = shuffle(hsk1, rand).slice(0, 10);
    const at = now - (2 + si) * DAY;
    check(await db.from("answers").insert(qs.map((q, qi) => {
      const correct = rand() < pCorrect(si, q, 0.9);
      return {
        user_id: studentId, question_id: q.id, source: "practice", is_correct: correct,
        response: correct ? q.answer : (q.options.find((o) => o !== q.answer) ?? "?"),
        created_at: new Date(at + qi * 30_000).toISOString(),
      };
    })), "practice");
  }

  for (const id of studentIds) await recomputeMastery(db, id);
  console.log(`✓ Demo: teacher ${TEACHER_EMAIL}, students ${studentEmail(0)}…${studentEmail(9)} (password: ${DEMO_PASSWORD}), class code HSKCLS`);
}

async function main() {
  await seedCurricula();
  if (args.has("--demo")) await seedDemo();
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

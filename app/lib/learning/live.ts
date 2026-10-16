// Live sessions (exam mode & game mode): shared server-side logic.
//
// State machine
//   exam:  lobby → active → finished      (students see every question, one timer)
//   game:  lobby → question ⇄ reveal → finished   (teacher paces one question at a time)
//
// Clients learn about changes three ways, in order of preference:
//   1. Supabase Realtime postgres_changes on live_sessions (and, for the host,
//      session_participants / answers)
//   2. Supabase Realtime Broadcast on channel "live:<CODE>" (sent by host and
//      players after every action) — backup when postgres_changes lags
//   3. A slow poll of GET /api/live/<CODE> — last-resort safety net
// Every signal just triggers a refetch, so the server stays the source of truth.

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { QUESTION_COLUMNS, toStudentQuestion, type QuestionRow } from "./queries";
import type { StudentQuestion } from "./types";

export type LiveMode = "exam" | "game";
export type LiveStatus = "lobby" | "active" | "question" | "reveal" | "finished";

export interface SessionRow {
  id: string;
  assessment_id: string;
  host_id: string;
  class_id: string | null;
  mode: LiveMode;
  require_login: boolean;
  join_code: string;
  status: LiveStatus;
  current_index: number;
  question_started_at: string | null;
  question_seconds: number;
  time_limit_seconds: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  assessments: { title: string; level_id: string };
  classes: { name: string; is_public: boolean; teacher_id: string } | null;
}

export interface ParticipantRow {
  id: string;
  session_id: string;
  user_id: string | null;
  guest_token: string | null;
  display_name: string;
  score: number;
  streak: number;
  joined_at: string;
  submitted_at: string | null;
}

/** Seconds of grace after a timer ends, to absorb network latency. */
export const GRACE_SECONDS = 3;
/** Exam answers may still be submitted this long after the host ends the session. */
export const LATE_SUBMIT_SECONDS = 120;

export const PARTICIPANT_HEADER = "x-tausi-participant";

export function normaliseCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function loadSession(db: SupabaseClient, code: string): Promise<SessionRow | null> {
  const { data } = await db
    .from("live_sessions")
    .select("*, assessments(title, level_id), classes(name, is_public, teacher_id)")
    .eq("join_code", normaliseCode(code))
    .maybeSingle();
  return (data as SessionRow | null) ?? null;
}

export async function sessionQuestions(db: SupabaseClient, session: Pick<SessionRow, "assessment_id">): Promise<QuestionRow[]> {
  const { data } = await db
    .from("assessment_items")
    .select(`position, questions(${QUESTION_COLUMNS})`)
    .eq("assessment_id", session.assessment_id)
    .order("position");
  return ((data ?? []) as unknown as { questions: QuestionRow }[]).map((r) => r.questions).filter((q) => q && q.status === "approved");
}

/** The caller's participant record: by account when signed in, otherwise by guest token. */
export async function findParticipant(
  db: SupabaseClient, sessionId: string, user: User | null, token: string | null,
): Promise<ParticipantRow | null> {
  if (user) {
    const { data } = await db.from("session_participants").select("*").eq("session_id", sessionId).eq("user_id", user.id).maybeSingle();
    if (data) return data as ParticipantRow;
  }
  if (token) {
    const { data } = await db.from("session_participants").select("*").eq("session_id", sessionId).eq("guest_token", token).maybeSingle();
    if (data) return data as ParticipantRow;
  }
  return null;
}

export interface LeaderEntry { participantId: string; name: string; score: number }

export async function leaderboard(db: SupabaseClient, sessionId: string): Promise<LeaderEntry[]> {
  const { data } = await db.from("session_participants").select("id, display_name, score").eq("session_id", sessionId)
    .order("score", { ascending: false }).order("joined_at");
  return (data ?? []).map((p) => ({ participantId: p.id, name: p.display_name, score: p.score }));
}

export interface SessionInfo {
  id: string;
  code: string;
  mode: LiveMode;
  status: LiveStatus;
  title: string;
  requireLogin: boolean;
  questionCount: number;
  currentIndex: number;
  questionStartedAt: string | null;
  questionSeconds: number;
  timeLimitSeconds: number;
  startedAt: string | null;
  endedAt: string | null;
  serverNow: string;
  /** The class this session belongs to, if any. */
  className: string | null;
  /** Private-class sessions admit only class members. */
  classOnly: boolean;
}

export function sessionInfo(s: SessionRow, questionCount: number): SessionInfo {
  return {
    id: s.id, code: s.join_code, mode: s.mode, status: s.status, title: s.assessments.title,
    requireLogin: s.require_login, questionCount, currentIndex: s.current_index,
    questionStartedAt: s.question_started_at, questionSeconds: s.question_seconds,
    timeLimitSeconds: s.time_limit_seconds, startedAt: s.started_at, endedAt: s.ended_at,
    serverNow: new Date().toISOString(),
    className: s.classes?.name ?? null,
    classOnly: !!s.classes && !s.classes.is_public,
  };
}

export interface PlayerState {
  session: SessionInfo;
  me: { participantId: string; displayName: string; score: number; streak: number; submitted: boolean; rank: number | null } | null;
  signedIn: boolean;
  /** Whether this viewer may join; when not, why. */
  access: SessionAccess;
  /** Game: the current question. */
  question?: StudentQuestion;
  /** Game: what I answered for the current question. Correctness only once revealed. */
  myAnswer?: { response: string; isCorrect?: boolean; points?: number };
  /** Game reveal: the correct answer to the current question. */
  correctAnswer?: string;
  /** Exam (active, not yet submitted): every question. */
  questions?: StudentQuestion[];
  /** Game reveal / finished: top of the class. */
  leaderboard?: LeaderEntry[];
}

export async function playerState(
  db: SupabaseClient, s: SessionRow, user: User | null, token: string | null,
): Promise<PlayerState> {
  const questions = await sessionQuestions(db, s);
  const me = await findParticipant(db, s.id, user, token);
  const state: PlayerState = {
    session: sessionInfo(s, questions.length), me: null, signedIn: !!user,
    access: await sessionAccess(db, s, user),
  };
  if (!me) return state;

  const showBoard = s.mode === "game" && (s.status === "reveal" || s.status === "finished");
  const board = showBoard ? await leaderboard(db, s.id) : [];
  const rankIdx = board.findIndex((b) => b.participantId === me.id);
  state.me = {
    participantId: me.id, displayName: me.display_name, score: me.score, streak: me.streak,
    submitted: !!me.submitted_at, rank: rankIdx >= 0 ? rankIdx + 1 : null,
  };
  if (showBoard) state.leaderboard = board.slice(0, 5);

  if (s.mode === "game" && (s.status === "question" || s.status === "reveal")) {
    const q = questions[s.current_index];
    if (q) {
      state.question = toStudentQuestion(q);
      const { data: ans } = await db.from("answers").select("response, is_correct, points")
        .eq("participant_id", me.id).eq("question_id", q.id).maybeSingle();
      if (ans) {
        state.myAnswer = s.status === "reveal"
          ? { response: ans.response, isCorrect: ans.is_correct, points: ans.points }
          : { response: ans.response };
      }
      if (s.status === "reveal") state.correctAnswer = q.answer;
    }
  }

  if (s.mode === "exam" && s.status === "active" && !me.submitted_at) {
    state.questions = questions.map(toStudentQuestion);
  }
  return state;
}

export function participantToken(request: Request): string | null {
  return request.headers.get(PARTICIPANT_HEADER) || new URL(request.url).searchParams.get("token");
}

// ── Access ───────────────────────────────────────────────────────────────

export type SessionAccess =
  | { allowed: true }
  | { allowed: false; reason: "LOGIN_REQUIRED" | "CLASS_ONLY" };

/**
 * Who may join a live session — enforced the same way whether the student
 * arrives by QR code, link, typed code or notification:
 *  - the host, always;
 *  - a private class's session: signed-in members of that class only;
 *  - a public class's session, or one with no class: anyone, signed in if
 *    the teacher required sign-in.
 */
export async function sessionAccess(db: SupabaseClient, s: SessionRow, user: User | null): Promise<SessionAccess> {
  if (user && user.id === s.host_id) return { allowed: true };
  if (s.class_id && s.classes && !s.classes.is_public) {
    if (!user) return { allowed: false, reason: "LOGIN_REQUIRED" };
    if (user.id === s.classes.teacher_id) return { allowed: true };
    const { data } = await db.from("class_members").select("student_id").eq("class_id", s.class_id).eq("student_id", user.id).maybeSingle();
    return data ? { allowed: true } : { allowed: false, reason: "CLASS_ONLY" };
  }
  if (s.require_login && !user) return { allowed: false, reason: "LOGIN_REQUIRED" };
  return { allowed: true };
}

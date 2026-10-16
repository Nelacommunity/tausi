import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export type Role = "student" | "teacher";

export interface Viewer {
  user: User | null;
  role: Role | null;
  /** Service-role client: routes do their own authorisation before using it. */
  db: SupabaseClient;
}

/** Current user (if any), their role, and a service-role client. */
export async function getViewer(): Promise<Viewer> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const db = createAdminClient();
  if (!user) return { user: null, role: null, db };
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { user, role: (profile?.role as Role) ?? "student", db };
}

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** Client IP for rate-limiting anonymous (guest) requests. */
export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

// Unambiguous characters only (no 0/O, 1/I/L) — codes are read off a projector.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function randomToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Insert a row with a unique random join code, retrying on collision. */
export async function insertWithCode<T>(
  db: SupabaseClient,
  table: string,
  row: Record<string, unknown>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await db.from(table).insert({ ...row, join_code: randomCode() }).select().single();
    if (!error) return data as T;
    if (error.code !== "23505") throw new Error(error.message);
  }
  throw new Error("Could not allocate a unique code");
}

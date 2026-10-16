import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export type Role = "student" | "teacher";

/** The signed-in user as established from their verified access token. */
export interface AuthUser { id: string; email: string | null }

export interface Viewer {
  user: AuthUser | null;
  /** Only looked up when requested (`withRole`) — most routes don't need it. */
  role: Role | null;
  /** Service-role client: routes do their own authorisation before using it. */
  db: SupabaseClient;
}

/**
 * Current user (if any) and a service-role client. The access token is
 * verified locally with getClaims() (signature + expiry against the project's
 * published ES256 keys) — milliseconds, versus a round trip to the Auth
 * server with getUser().
 */
export async function getViewer(opts: { withRole?: boolean } = {}): Promise<Viewer> {
  const supabase = await createClient();
  const db = createAdminClient();
  let user: AuthUser | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    const c = data?.claims;
    if (c?.sub) user = { id: c.sub, email: typeof c.email === "string" ? c.email : null };
  } catch {
    user = null; // fail closed
  }
  if (!user) return { user: null, role: null, db };
  if (!opts.withRole) return { user, role: null, db };
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

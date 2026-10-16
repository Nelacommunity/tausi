import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — cookies are read-only; proxy.ts handles refresh
          }
        },
      },
    }
  );
}

/**
 * The signed-in user from the request's access token, verified locally with
 * getClaims() (signature + expiry against the project's ES256 keys) instead
 * of a network round trip to the Auth server. Null when signed out or the
 * token can't be verified (fails closed).
 */
export async function getAuthUser(supabase: SupabaseClient): Promise<{ id: string; email: string | null } | null> {
  try {
    const { data } = await supabase.auth.getClaims();
    const c = data?.claims;
    return c?.sub ? { id: c.sub, email: typeof c.email === "string" ? c.email : null } : null;
  } catch {
    return null;
  }
}

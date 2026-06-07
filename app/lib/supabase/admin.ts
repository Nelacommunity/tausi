import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. Only for server-to-server calls (webhooks, etc.)
// Requires SUPABASE_SERVICE_ROLE_KEY in env — never expose to the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/app/lib/safe-redirect";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  // Only ever redirect within this site (an absolute ?next= would be an open redirect).
  const next = safeNextPath(searchParams.get("next"));

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  } else if (token_hash && type) {
    await supabase.auth.verifyOtp({ type: type as "email" | "signup" | "recovery", token_hash });
  }

  // Email confirmation flows land on the verified page; everything else (OAuth, recovery) uses next
  const isEmailConfirmation = type === "signup" || type === "email";
  const destination = isEmailConfirmation ? "/auth/verified" : next;

  return NextResponse.redirect(new URL(destination, request.url));
}

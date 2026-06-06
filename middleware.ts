import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Supabase OAuth sometimes redirects to the site root instead of /auth/callback
  // when the redirectTo URL isn't in the Supabase allowed-redirect list.
  // Forward the code/token_hash to the callback route so auth still completes.
  if (pathname === "/") {
    const code = searchParams.get("code");
    const token_hash = searchParams.get("token_hash");
    if (code || token_hash) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/callback";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/",
};

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// API routes accessible without authentication (GET only)
const PUBLIC_API_PATTERNS = [
  /^\/api\/exams\/[0-9a-f-]+$/,
];

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function applySecurityHeaders(res: NextResponse | Response) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

function isPublicApiPath(pathname: string, method: string) {
  if (method !== "GET") return false;
  return PUBLIC_API_PATTERNS.some((re) => re.test(pathname));
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase isn't configured, skip all auth routing
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("your_supabase")) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() fully verifies the JWT with the Supabase Auth server.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // If Supabase is unreachable, allow all requests through
    applySecurityHeaders(supabaseResponse);
    return supabaseResponse;
  }

  const { pathname } = request.nextUrl;
  const method = request.method;

  // ── Reject non-UUID path segments on resource endpoints ──────────────────
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const idSegment = pathname.match(/\/api\/[^/]+\/([^/]+)/)?.[1];
  if (idSegment && idSegment !== "generate" && idSegment !== "ai" && !UUID_RE.test(idSegment)) {
    const deny = new Response(
      JSON.stringify({ error: "Invalid resource ID" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
    applySecurityHeaders(deny);
    return deny;
  }

  // ── API route authentication ──────────────────────────────────────────────
  if (pathname.startsWith("/api/") && !user && !isPublicApiPath(pathname, method)) {
    const deny = new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
    applySecurityHeaders(deny);
    return deny;
  }

  // ── Page-level auth routing ───────────────────────────────────────────────
  const isProtectedPage =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/profile" ||
    pathname === "/mark" ||
    pathname.startsWith("/mark/") ||
    pathname === "/study" ||
    pathname.startsWith("/study/") ||
    pathname === "/exams" ||
    pathname.startsWith("/exams/") ||
    pathname === "/papers" ||
    pathname.startsWith("/papers/") ||
    pathname === "/write" ||
    pathname.startsWith("/write/");

  // Logged-in users skip the auth pages
  if (user && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Unauthenticated users get redirected to login for protected pages
  if (!user && isProtectedPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  applySecurityHeaders(supabaseResponse);
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     *  - Next.js internals (_next/static, _next/image)
     *  - Static assets served from /public (logo, sw.js, favicon, images)
     */
    "/((?!_next/static|_next/image|logo|sw\\.js|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

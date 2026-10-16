import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// API routes accessible without authentication
const PUBLIC_API_PATTERNS = [
  /^\/api\/exams\/[0-9a-f-]+$/,        // public exam data (GET)
  /^\/api\/webhook\/polar$/,            // Polar webhook (POST, validated by secret)
  // Live sessions: guests join by code; each route checks host/participant itself
  /^\/api\/live\/[A-Za-z0-9]{4,12}(\/(join|answer|submit|review))?$/,
  /^\/api\/explanations$/,             // checks the caller answered the questions
];

// Mirrors the baseline in next.config.ts (which also sets CSP/HSTS), so the
// responses this proxy returns itself (401/400) carry them too.
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "0",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
};

function applySecurityHeaders(res: NextResponse | Response) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

// Polar webhook is POST; exam reads are GET-only
const GET_ONLY_PATTERNS = [/^\/api\/exams\/[0-9a-f-]+$/];

function isPublicApiPath(pathname: string, method: string) {
  if (GET_ONLY_PATTERNS.some((re) => re.test(pathname))) return method === "GET";
  return PUBLIC_API_PATTERNS.some((re) => re.test(pathname));
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Supabase OAuth sometimes redirects to the site root with ?code= instead of
  // /auth/callback when the redirectTo URL isn't in the Supabase allowed list.
  // Catch it here and forward to the callback route before any auth checks.
  if (pathname === "/") {
    const code = searchParams.get("code");
    const token_hash = searchParams.get("token_hash");
    if (code || token_hash) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/callback";
      return NextResponse.redirect(url);
    }
  }

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

  // getClaims() refreshes an expired session (writing new cookies via setAll)
  // and verifies the access token's signature locally against the project's
  // published keys (ES256) — ~4 ms instead of a ~350 ms round trip to the
  // Auth server on every request. Fails closed: if verification is impossible
  // the visitor is treated as signed out.
  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    user = data?.claims?.sub ? { id: data.claims.sub } : null;
  } catch {
    user = null;
  }

  const method = request.method;

  // ── Reject non-UUID path segments on /api/exams/:id only ─────────────────
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const uuidResourceMatch = pathname.match(/^\/api\/exams\/([^/]+)$/);
  const idSegment = uuidResourceMatch?.[1];
  if (idSegment && !UUID_RE.test(idSegment)) {
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
    pathname === "/papers" ||
    pathname.startsWith("/papers/") ||
    pathname === "/teach" ||
    pathname.startsWith("/teach/") ||
    pathname === "/learn" ||
    pathname.startsWith("/learn/") ||
    pathname.startsWith("/resources/") ||
    pathname.startsWith("/classes/");

  // Logged-in users skip auth pages and the marketing home — send them to the app
  if (user && (pathname === "/" || pathname === "/login" || pathname === "/signup")) {
    const next = searchParams.get("next");
    const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    return NextResponse.redirect(new URL(safe, request.url));
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

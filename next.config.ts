import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// The browser talks to Supabase directly (auth, realtime websocket, storage
// signed URLs for PDFs shown in iframes), so its origin must be allowed.
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
const supabaseWs = supabase.replace(/^https:/, "wss:");

// Content-Security-Policy without nonces (Next.js guide), so pages can stay
// statically rendered. 'unsafe-inline' scripts are needed by Next's inline
// bootstrap; 'unsafe-eval' only in development (React dev tooling).
// cdn.jsdelivr.net serves the KaTeX stylesheet/fonts used by PDF export.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ""}`,
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  `img-src 'self' blob: data: ${supabase}`,
  "font-src 'self' data: https://cdn.jsdelivr.net",
  `connect-src 'self' ${supabase} ${supabaseWs}${isDev ? " ws: http://localhost:*" : ""}`,
  `frame-src 'self' blob: ${supabase}`,
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

// Shuō (the Chinese practice app at /shuo) is a static bundle with different
// needs: the microphone (voice tutor, tone lab), the Gemini Live websocket
// (single-use token, no key), its audio-capture worklet (loaded from a blob:
// URL), Google Fonts, and Hanzi Writer's stroke data on jsDelivr.
const shuoCsp = [
  "default-src 'self'",
  "script-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' blob: data:",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' ${supabase} ${supabaseWs} wss://generativelanguage.googleapis.com https://cdn.jsdelivr.net`,
  "worker-src 'self' blob:",
  "media-src 'self' blob: data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // The legacy XSS auditor can itself be abused; modern guidance is to disable it and rely on CSP.
  { key: "X-XSS-Protection", value: "0" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera stays off: students scan QR codes with their phone's own camera app.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Block Flash/PDF cross-domain policy files from granting other sites access.
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // HTTPS only, for two years, once deployed (never on local http dev).
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  // Lets a verification build (NEXT_DIST_DIR=.next-verify next build) run
  // without overwriting a running dev server's .next folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Don't advertise the framework in response headers.
  poweredByHeader: false,
  // Keep the dev-tools badge away from the sidebar's sign-out controls (bottom-left).
  devIndicators: { position: "bottom-right" },
  allowedDevOrigins: [
    "192.168.1.185",
    "192.168.0.*",
    "192.168.1.*",
    "10.0.0.*",
    "172.16.*.*",
  ],
  // /shuo serves Shuō's single-page app (its pages use #/ hash routes).
  async rewrites() {
    return [
      { source: "/shuo", destination: "/shuo/index.html" },
      { source: "/shuo/", destination: "/shuo/index.html" },
    ];
  },
  async headers() {
    return [
      {
        // Security headers for every route except Shuō (which gets its own set below,
        // since two CSP headers on one response would both be enforced).
        source: "/:path((?!shuo(?:/|$)).*)",
        headers: securityHeaders,
      },
      {
        source: "/shuo/:path*",
        headers: [
          ...securityHeaders.filter((h) => h.key !== "Content-Security-Policy" && h.key !== "Permissions-Policy"),
          { key: "Content-Security-Policy", value: shuoCsp },
          // Microphone for the voice tutor and tone lab — this origin only.
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()" },
        ],
      },
      {
        source: "/shuo",
        headers: [
          ...securityHeaders.filter((h) => h.key !== "Content-Security-Policy" && h.key !== "Permissions-Policy"),
          { key: "Content-Security-Policy", value: shuoCsp },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()" },
        ],
      },
      {
        // Logos and icons rarely change: cache for a day, revalidate in the background for a week.
        source: "/logo/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        // Service worker — must never be cached so browsers always get the latest version
        source: "/sw.js",
        headers: [
          { key: "Content-Type",           value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control",          value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;

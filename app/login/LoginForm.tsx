"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { useT } from "@/app/lib/language-context";

/** Where to go after signing in: the ?next= path if it's a safe local path. */
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

const POINT_ICONS = [
  // mastery bars
  "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
  // QR code
  "M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z",
  // languages
  "M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802",
];

export function LoginForm() {
  const router = useRouter();
  const { T } = useT();
  const A = T.auth;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(nextPath());
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-ink flex">

      {/* Left panel — branding (desktop only) */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 border-r border-line bg-ink-2/60 p-10">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/android-chrome-192x192.png" alt="Tausi" className="w-10 h-10 rounded-xl" />
          <span className="font-display text-xl font-bold text-snow tracking-tight">Tausi</span>
        </Link>

        <div>
          <p className="font-display text-2xl font-bold text-snow leading-snug mb-3">{A.brandHeadline}</p>
          <p className="text-sm text-dim leading-relaxed">{A.brandSub}</p>
        </div>

        <div className="space-y-3">
          {A.brandPoints.map((text, i) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-deep border border-teal/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={POINT_ICONS[i % POINT_ICONS.length]} />
                </svg>
              </div>
              <p className="text-sm text-body">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/android-chrome-192x192.png" alt="Tausi" className="w-9 h-9 rounded-lg" />
          <span className="font-display text-lg font-bold text-snow">Tausi</span>
        </Link>

        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-bold text-snow mb-1">{A.welcomeBack}</h1>
          <p className="text-sm text-dim mb-7">{A.signInSubtitle}</p>


          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-dim block" htmlFor="email">
                {A.emailLabel}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={A.emailPlaceholder}
                className="w-full rounded-xl bg-ink-2 border border-line hover:border-line-2 text-snow placeholder-dim/50 text-sm px-4 py-2.5 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-dim block" htmlFor="password">
                {A.passwordLabel}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-ink-2 border border-line hover:border-line-2 text-snow placeholder-dim/50 text-sm px-4 py-2.5 outline-none transition-all"
              />
            </div>
            {error && (
              <div className="rounded-xl border border-bad/40 bg-bad/10 px-4 py-2.5 text-sm text-bad">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-teal hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-ink font-bold py-2.5 text-sm transition-all mt-2 cursor-pointer"
            >
              {loading ? A.signingIn : T.nav.signIn}
            </button>
          </form>

          <p className="text-center text-sm text-dim mt-6">
            {A.noAccount}{" "}
            <Link href="/signup" className="text-teal hover:text-snow font-medium transition-colors">
              {T.nav.signUp}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

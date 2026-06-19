"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useT } from "@/app/lib/language-context";

// ── Icon helper ───────────────────────────────────────────────
function Icon({ d, sw = 1.5 }: { d: string; sw?: number }) {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} d={d} />
    </svg>
  );
}

// ── Nav items ─────────────────────────────────────────────────
const PRIMARY_NAV = [
  {
    href: "/dashboard",
    key: "myExams" as const,
    d: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
  },
  {
    href: "/mark",
    key: "aiMarker" as const,
    d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  },
  {
    href: "/study",
    key: "studyRoom" as const,
    d: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337 5.972 5.972 0 01-5.035 2.057 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z",
  },
  {
    href: "/write",
    key: "aiWriter" as const,
    d: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125",
  },
  {
    href: "/papers",
    key: "examLibrary" as const,
    d: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  },
  {
    href: "/discover",
    key: "discover" as const,
    d: "M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c-.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z",
  },
] as const;

type NavKey = typeof PRIMARY_NAV[number]["key"];

function LangToggle() {
  const { lang, setLang } = useT();
  return (
    <div className="flex items-center rounded-lg border border-line overflow-hidden">
      {(["en", "sw"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2.5 py-1 text-xs font-bold uppercase transition-colors cursor-pointer ${
            lang === l ? "bg-teal text-ink" : "text-dim hover:text-snow"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { T } = useT();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setCredits(null); return; }
    fetch("/api/credits")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d && typeof d.credits === "number") setCredits(d.credits); })
      .catch(() => {});
  }, [user]);

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileMenuOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "?";
  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href + "/"));

  return (
    <>
      {/* ══════════════════════════════════════════════════
          DESKTOP: Fixed left sidebar (hidden on mobile)
          ══════════════════════════════════════════════════ */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-56 flex-col bg-ink-2 border-r border-line">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-line shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/android-chrome-192x192.png" alt="Tausi" className="w-8 h-8 rounded-lg" />
            <span className="font-display text-base font-bold text-snow tracking-tight">Tausi</span>
          </Link>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {PRIMARY_NAV.map(({ href, key, d }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                  active
                    ? "bg-teal-deep/70 text-teal"
                    : "text-dim hover:text-snow hover:bg-ink-3"
                }`}
              >
                <Icon d={d} sw={active ? 2 : 1.5} />
                <span>{T.nav[key as NavKey]}</span>
              </Link>
            );
          })}
        </nav>

        {/* Credits + Buy */}
        {user && (
          <div className="px-3 py-3 border-t border-line shrink-0">
            <Link
              href="/pricing"
              className="flex items-center justify-between w-full rounded-xl border border-teal/30 bg-teal-deep/20 hover:bg-teal-deep/30 px-3 py-2.5 transition-all group"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-teal shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                <span className="text-sm font-bold text-teal">
                  {credits !== null ? credits : "—"}
                </span>
                <span className="text-xs text-dim">credits</span>
              </div>
              <span className="text-xs font-semibold text-teal/70 group-hover:text-teal transition-colors">+ Buy</span>
            </Link>
          </div>
        )}

        {/* User section */}
        <div className="px-3 py-3 border-t border-line shrink-0">
          {user ? (
            <div className="space-y-1">
              <Link
                href="/profile"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-ink-3 transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-teal-deep border border-teal/30 flex items-center justify-center text-xs font-bold text-teal select-none shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-snow font-medium truncate">{user.email}</p>
                </div>
              </Link>
              <div className="flex items-center gap-1">
                <Link href="/purchases" className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-dim hover:text-snow hover:bg-ink-3 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                  History
                </Link>
                <LangToggle />
                <button
                  onClick={signOut}
                  title={T.nav.signOut}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-dim hover:text-bad hover:bg-bad/10 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Link href="/login"
                className="flex items-center justify-center w-full py-2 rounded-xl border border-line text-xs font-medium text-body hover:text-snow hover:border-line-2 transition-colors">
                {T.nav.signIn}
              </Link>
              <Link href="/signup"
                className="flex items-center justify-center w-full py-2 rounded-xl bg-teal text-ink text-xs font-bold hover:opacity-90 transition-opacity">
                {T.nav.signUp}
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════
          MOBILE: Compact top bar (hidden on desktop)
          ══════════════════════════════════════════════════ */}
      <header className="md:hidden sticky top-0 z-30 h-12 flex items-center justify-between px-4 bg-ink/95 backdrop-blur-md border-b border-line">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/android-chrome-192x192.png" alt="Tausi" className="w-7 h-7 rounded-md" />
          <span className="font-display text-sm font-bold text-snow">Tausi</span>
        </Link>

        <div className="flex items-center gap-2">
          <LangToggle />
          {user ? (
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="flex items-center gap-1.5 rounded-lg border border-line bg-ink-2 px-2 py-1.5 cursor-pointer"
            >
              {credits !== null && (
                <span className="text-xs font-bold text-teal">{credits}</span>
              )}
              <div className="w-5 h-5 rounded-md bg-teal-deep border border-teal/30 flex items-center justify-center text-[10px] font-bold text-teal select-none">
                {initials}
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link href="/login" className="text-xs text-dim hover:text-snow px-2.5 py-1.5 rounded-lg hover:bg-ink-3 transition-colors">{T.nav.signIn}</Link>
              <Link href="/signup" className="text-xs font-bold text-ink bg-teal hover:opacity-90 px-2.5 py-1.5 rounded-lg transition-opacity">{T.nav.signUp}</Link>
            </div>
          )}
        </div>
      </header>

      {/* ══════════════════════════════════════════════════
          MOBILE: Bottom tab bar
          ══════════════════════════════════════════════════ */}
      {user && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-ink-2/98 backdrop-blur-md border-t border-line"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="grid grid-cols-5 h-16">
            {PRIMARY_NAV.map(({ href, key, d }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                    active ? "text-teal" : "text-dim"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d={d} />
                  </svg>
                  <span className="text-[10px] font-medium leading-none">
                    {T.nav[key as NavKey]?.split(" ")[0]}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* ══════════════════════════════════════════════════
          MOBILE: Slide-up account sheet
          ══════════════════════════════════════════════════ */}
      <div
        aria-hidden={!mobileMenuOpen}
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-200 ${
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />

        <div className={`absolute bottom-0 left-0 right-0 bg-ink-2 rounded-t-2xl border-t border-line transition-transform duration-300 ${
          mobileMenuOpen ? "translate-y-0" : "translate-y-full"
        }`}>
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-line" />
          </div>

          {/* User info */}
          <div className="px-5 py-3 border-b border-line">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-deep border border-teal/30 flex items-center justify-center text-sm font-bold text-teal select-none">
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-snow">{user?.email}</p>
                {credits !== null && (
                  <p className="text-xs text-teal">{credits} credits remaining</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="px-4 py-4 space-y-1">
            <Link href="/pricing" onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-deep/30 border border-teal/30 text-teal font-semibold text-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              Buy credits
            </Link>
            <Link href="/profile" onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-dim hover:text-snow hover:bg-ink-3 transition-colors text-sm">
              <Icon d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              {T.nav.profile}
            </Link>
            <Link href="/purchases" onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-dim hover:text-snow hover:bg-ink-3 transition-colors text-sm">
              <Icon d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              Purchase history
            </Link>
            <button onClick={signOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-bad hover:bg-bad/10 transition-colors text-sm cursor-pointer">
              <Icon d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              {T.nav.signOut}
            </button>
          </div>
          <div style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }} />
        </div>
      </div>
    </>
  );
}

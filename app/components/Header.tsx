"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useT } from "@/app/lib/language-context";

function Icon({ d, size = 5 }: { d: string; size?: number }) {
  return (
    <svg className={`w-${size} h-${size} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
    </svg>
  );
}

// Nav items shown in desktop header + mobile bottom bar
const PRIMARY_NAV = [
  {
    href: "/dashboard",
    key: "myExams",
    d: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
  },
  {
    href: "/mark",
    key: "aiMarker",
    d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  },
  {
    href: "/study",
    key: "studyRoom",
    d: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337 5.972 5.972 0 01-5.035 2.057 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z",
  },
  {
    href: "/write",
    key: "aiWriter",
    d: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125",
  },
  {
    href: "/papers",
    key: "examLibrary",
    d: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  },
] as const;

// Secondary items only in the slide-out panel
const SECONDARY_NAV = [
  {
    href: "/discover",
    key: "discover",
    d: "M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c-.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z",
  },
] as const;

function LangToggle() {
  const { lang, setLang } = useT();
  return (
    <div className="flex items-center rounded-lg border border-line overflow-hidden shrink-0">
      {(["en", "sw"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2.5 py-1 text-xs font-bold uppercase transition-colors cursor-pointer ${
            lang === l ? "bg-teal text-ink" : "text-dim hover:text-snow"
          }`}
        >
          {l === "en" ? "EN" : "SW"}
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
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

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const signOut = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    router.push("/");
  };

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "?";
  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href + "/"));

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur-md">
        <div className="px-4 sm:px-6 h-14 flex items-center gap-3">

          {/* Logo — always visible */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 mr-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/android-chrome-192x192.png" alt="Tausi" className="w-7 h-7 rounded-md" />
            <span className="font-display text-sm font-bold text-snow tracking-tight hidden sm:block">Tausi</span>
          </Link>

          {/* Desktop primary nav — hidden on mobile (use bottom bar) */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1">
            {PRIMARY_NAV.map(({ href, key, d }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    active
                      ? "bg-teal-deep/70 text-teal"
                      : "text-dim hover:text-snow hover:bg-ink-3"
                  }`}
                >
                  <Icon d={d} size={4} />
                  <span>{T.nav[key]}</span>
                </Link>
              );
            })}
            {SECONDARY_NAV.map(({ href, key, d }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    active
                      ? "bg-teal-deep/70 text-teal"
                      : "text-dim hover:text-snow hover:bg-ink-3"
                  }`}
                >
                  <Icon d={d} size={4} />
                  <span>{T.nav[key]}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex-1 md:hidden" />

          {/* Right side: lang toggle + credits + avatar / auth buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <LangToggle />

            {user ? (
              <>
                {/* Credits chip */}
                {credits !== null && (
                  <Link
                    href="/pricing"
                    className="hidden sm:flex items-center gap-1.5 rounded-lg border border-line bg-ink-2 hover:border-teal/60 hover:bg-teal-deep/20 px-2.5 py-1.5 transition-all"
                  >
                    <svg className="w-3.5 h-3.5 text-teal shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                    <span className="text-xs font-bold text-teal">{credits}</span>
                    <span className="text-xs text-dim">cr</span>
                  </Link>
                )}

                {/* Avatar / profile — taps to open panel */}
                <button
                  onClick={() => setOpen(true)}
                  aria-label="Open menu"
                  className="flex items-center gap-2 rounded-xl border border-line hover:border-line-2 bg-ink-2 hover:bg-ink-3 px-2.5 py-1.5 transition-all cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-md bg-teal-deep border border-teal/30 flex items-center justify-center text-xs font-bold text-teal select-none">
                    {initials}
                  </div>
                  <span className="text-xs text-body hidden sm:block max-w-[120px] truncate">{user.email}</span>
                  <svg className="w-3.5 h-3.5 text-dim hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-xs text-body hover:text-snow px-3 py-1.5 rounded-lg hover:bg-ink-3 transition-colors">
                  Sign in
                </Link>
                <Link href="/signup" className="text-xs font-semibold text-on-gold bg-gold hover:bg-gold-hover px-3 py-1.5 rounded-lg transition-colors">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Slide-out panel (avatar dropdown) ───────────────── */}
      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-50 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

        <aside className={`absolute right-0 top-0 bottom-0 w-72 bg-ink border-l border-line flex flex-col shadow-2xl shadow-black/70 transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}>
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-deep border border-teal/30 flex items-center justify-center text-sm font-bold text-teal select-none">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-dim">{T.nav.signedInAs}</p>
                <p className="text-sm text-snow font-medium truncate max-w-[160px]">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-dim hover:text-snow hover:bg-ink-3 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Credits summary */}
          {credits !== null && (
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="mx-4 mt-4 flex items-center justify-between rounded-xl border border-teal/30 bg-teal-deep/20 hover:bg-teal-deep/30 px-4 py-3 transition-all"
            >
              <div>
                <p className="text-xs text-dim mb-0.5">Credit balance</p>
                <p className="text-lg font-bold text-teal">{credits} <span className="text-sm font-normal text-dim">credits</span></p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-teal border border-teal/40 rounded-lg px-2.5 py-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Buy
              </div>
            </Link>
          )}

          {/* Navigation (all nav items, visible on mobile) */}
          <nav className="flex-1 overflow-y-auto py-3 px-2">
            <p className="px-3 text-xs font-semibold text-dim/70 uppercase tracking-wider mb-2">Navigate</p>
            {[...PRIMARY_NAV, ...SECONDARY_NAV].map(({ href, key, d }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-teal-deep/60 text-teal"
                      : "text-dim hover:text-snow hover:bg-ink-3"
                  }`}
                >
                  <Icon d={d} />
                  {T.nav[key]}
                </Link>
              );
            })}

            <div className="mt-4 pt-3 border-t border-line">
              <p className="px-3 text-xs font-semibold text-dim/70 uppercase tracking-wider mb-2">Account</p>
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-dim hover:text-snow hover:bg-ink-3 transition-colors"
              >
                <Icon d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                {T.nav.profile}
              </Link>
              <Link
                href="/purchases"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-dim hover:text-snow hover:bg-ink-3 transition-colors"
              >
                <Icon d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                Purchase history
              </Link>
            </div>
          </nav>

          {/* Bottom: lang + sign out */}
          <div className="border-t border-line p-4 shrink-0 space-y-3">
            <div>
              <p className="text-xs text-dim mb-2">Language / Lugha</p>
              <BottomLangToggle onClose={() => setOpen(false)} />
            </div>
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-bad hover:text-red-300 hover:bg-bad/10 transition-colors cursor-pointer"
            >
              <Icon d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              {T.nav.signOut}
            </button>
          </div>
        </aside>
      </div>

      {/* ── Mobile bottom tab bar ────────────────────────────── */}
      {user && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-ink/95 backdrop-blur-md border-t border-line"
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
                    active ? "text-teal" : "text-dim hover:text-snow"
                  }`}
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d={d} />
                  </svg>
                  <span className="text-[10px] font-medium leading-none">{T.nav[key]?.split(" ")[0]}</span>
                  {active && (
                    <span className="absolute bottom-0 w-8 h-0.5 bg-teal rounded-full" style={{ position: "relative" }} />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}

function BottomLangToggle({ onClose }: { onClose: () => void }) {
  const { lang, setLang } = useT();
  return (
    <div className="flex gap-2">
      {(["en", "sw"] as const).map((l) => (
        <button
          key={l}
          onClick={() => { setLang(l); onClose(); }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
            lang === l
              ? "bg-teal border-teal text-ink"
              : "border-line text-dim hover:text-snow hover:border-line-2"
          }`}
        >
          {l === "en" ? "English" : "Kiswahili"}
        </button>
      ))}
    </div>
  );
}

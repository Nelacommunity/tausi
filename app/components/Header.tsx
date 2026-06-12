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

function SidebarLangToggle({ onClose }: { onClose: () => void }) {
  const { lang, setLang } = useT();
  return (
    <div className="px-5 py-3 border-t border-line shrink-0">
      <p className="text-xs text-dim mb-2">Language / Lugha</p>
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
    </div>
  );
}

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

const NAV_LINK_KEYS = [
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
  {
    href: "/discover",
    key: "discover",
    d: "M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c-.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z",
  },
] as const;

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { T } = useT();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

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
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur-sm">
        <div className="px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="flex items-center justify-center w-9 h-9 rounded-lg text-dim hover:text-snow hover:bg-ink-3 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/android-chrome-192x192.png" alt="Tausi" className="w-8 h-8 rounded-lg" />
            <span className="font-display text-base font-bold text-snow tracking-tight hidden sm:block">Tausi</span>
          </Link>

          <div className="flex-1" />

          <LangToggle />

          {user ? (
            <Link href="/profile"
              className="flex items-center gap-2 rounded-xl border border-line hover:border-line-2 bg-ink-2 hover:bg-ink-3 px-3 py-1.5 transition-colors">
              <div className="w-6 h-6 rounded-md bg-teal-deep flex items-center justify-center text-xs font-bold text-teal select-none">
                {initials}
              </div>
              <span className="text-sm text-body hidden sm:block max-w-[130px] truncate">{user.email}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-sm text-body hover:text-snow px-3 py-1.5 rounded-lg hover:bg-ink-3 transition-colors">
                Sign in
              </Link>
              <Link href="/signup" className="text-sm font-semibold text-on-gold bg-gold hover:bg-gold-hover px-3 py-1.5 rounded-lg transition-colors">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* ── Sidebar overlay ─────────────────────────────────── */}
      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-50 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

        <aside className={`absolute left-0 top-0 bottom-0 w-72 bg-ink border-r border-line flex flex-col shadow-2xl shadow-black/60 transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}>
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
            <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo/android-chrome-192x192.png" alt="Tausi" className="w-8 h-8 rounded-lg" />
              <span className="font-display text-base font-bold text-snow">Tausi</span>
            </Link>
            <button onClick={() => setOpen(false)} aria-label="Close menu"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-dim hover:text-snow hover:bg-ink-3 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto py-3">
            {NAV_LINK_KEYS.map(({ href, key, d }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 mx-2 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
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
          </nav>

          <SidebarLangToggle onClose={() => setOpen(false)} />

          {/* Bottom user section */}
          <div className="border-t border-line p-3 shrink-0 space-y-1">
            {user ? (
              <>
                <div className="px-3 py-2">
                  <p className="text-xs text-dim">{T.nav.signedInAs}</p>
                  <p className="text-sm text-body font-medium truncate">{user.email}</p>
                </div>

                <Link href="/profile" onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-dim hover:text-snow hover:bg-ink-3 transition-colors">
                  <Icon d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  {T.nav.profile}
                </Link>

                <Link href="/pricing" onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gold hover:bg-gold/10 transition-colors">
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {T.nav.upgradePremium}
                </Link>

                <button onClick={signOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-bad hover:text-red-300 hover:bg-bad/10 transition-colors">
                  <Icon d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  {T.nav.signOut}
                </button>
              </>
            ) : (
              <div className="space-y-2 px-1">
                <Link href="/login" onClick={() => setOpen(false)}
                  className="flex items-center justify-center px-4 py-2.5 rounded-xl text-sm text-body border border-line hover:border-line-2 hover:text-snow transition-colors">
                  {T.nav.signIn}
                </Link>
                <Link href="/signup" onClick={() => setOpen(false)}
                  className="flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-on-gold bg-gold hover:bg-gold-hover transition-colors">
                  {T.nav.signUp}
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { useT } from "@/app/lib/language-context";
import { useTheme } from "@/app/lib/theme-context";
import { useSession } from "@/app/lib/session-context";

function NavIcon({ d, sw = 1.5 }: { d: string; sw?: number }) {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} d={d} />
    </svg>
  );
}

const NAV = [
  {
    href: "/dashboard", key: "myExams" as const, label: "My Exams", accent: "teal",
    d: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
  },
  {
    href: "/learn", key: "learn" as const, label: "My learning", accent: "gold",
    d: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6",
  },
  {
    href: "/teach", key: "teach" as const, label: "Teach", accent: "teal", teacherOnly: true,
    d: "M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342",
  },
  {
    href: "/mark", key: "aiMarker" as const, label: "AI Marker", accent: "teal",
    d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  },
  {
    href: "/study", key: "studyRoom" as const, label: "Study Room", accent: "gold",
    d: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337 5.972 5.972 0 01-5.035 2.057 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z",
  },
  {
    href: "/write", key: "aiWriter" as const, label: "AI Writer", accent: "magenta",
    d: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125",
  },
  {
    href: "/papers", key: "examLibrary" as const, label: "Papers", accent: "coral",
    d: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  },
  {
    href: "/discover", key: "discover" as const, label: "Discover", accent: "coral",
    d: "M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c-.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z",
  },
] as const;

// Accent class maps for active nav items (premium gradient pills)
const ACTIVE_PILL: Record<string, string> = {
  teal: "bg-gradient-to-r from-teal/20 to-teal/5 text-teal",
  gold: "bg-gradient-to-r from-gold/20 to-gold/5 text-gold",
  magenta: "bg-gradient-to-r from-brand-magenta/20 to-brand-magenta/5 text-brand-magenta",
  coral: "bg-gradient-to-r from-coral/20 to-coral/5 text-coral",
};
const ACTIVE_DOT: Record<string, string> = {
  teal: "bg-teal", gold: "bg-gold", magenta: "bg-brand-magenta", coral: "bg-coral",
};
const ACTIVE_BAR: Record<string, string> = {
  teal: "bg-teal", gold: "bg-gold", magenta: "bg-brand-magenta", coral: "bg-coral",
};
// Tinted icon box per accent — filled when active, neutral otherwise.
const ICON_BOX_ACTIVE: Record<string, string> = {
  teal: "bg-teal/20 text-teal border-teal/30",
  gold: "bg-gold/20 text-gold border-gold/30",
  magenta: "bg-brand-magenta/20 text-brand-magenta border-brand-magenta/30",
  coral: "bg-coral/20 text-coral border-coral/30",
};
const ICON_BOX_HOVER: Record<string, string> = {
  teal: "group-hover:text-teal", gold: "group-hover:text-gold",
  magenta: "group-hover:text-brand-magenta", coral: "group-hover:text-coral",
};

type NavKey = typeof NAV[number]["key"];

function LangPill() {
  const { lang, setLang } = useT();
  return (
    <div className="flex items-center rounded-lg border border-line overflow-hidden shrink-0">
      {([["en", "EN"], ["sw", "SW"], ["zh", "中"]] as const).map(([l, label]) => (
        <button key={l} onClick={() => setLang(l)} lang={l}
          className={`px-2 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
            lang === l ? "bg-teal text-ink" : "text-dim hover:text-snow"
          }`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const { T } = useT();
  const isDark = theme === "dark";
  const switchTitle = isDark ? T.nav.switchLight : T.nav.switchDark;
  const sun = "M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z";
  const moon = "M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z";
  if (compact) {
    return (
      <button onClick={toggleTheme} title={switchTitle}
        className="w-9 h-9 rounded-xl bg-ink-3 border border-line flex items-center justify-center text-dim hover:text-snow hover:border-line-2 transition-colors cursor-pointer">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={isDark ? sun : moon} />
        </svg>
      </button>
    );
  }
  return (
    <button onClick={toggleTheme}
      className="flex items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-dim hover:text-snow hover:border-line-2 transition-colors cursor-pointer shrink-0"
      title={switchTitle}>
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={isDark ? sun : moon} />
      </svg>
      <span className="text-[11px] font-bold uppercase">{isDark ? T.nav.lightMode : T.nav.darkMode}</span>
    </button>
  );
}

export function Header() {
  const { user, role } = useSession();
  const navItems = NAV.filter((i) => !("teacherOnly" in i) || role === "teacher");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSheet, setMobileSheet] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { T } = useT();

  // Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("tausi-sidebar");
    if (saved === "collapsed") {
      setCollapsed(true);
      document.documentElement.classList.add("sidebar-collapsed");
    }
  }, []);

  useEffect(() => { setMobileSheet(false); }, [pathname]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileSheet(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileSheet ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileSheet]);

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (next) {
      document.documentElement.classList.add("sidebar-collapsed");
      localStorage.setItem("tausi-sidebar", "collapsed");
    } else {
      document.documentElement.classList.remove("sidebar-collapsed");
      localStorage.setItem("tausi-sidebar", "expanded");
    }
  };

  const signOut = async () => {
    await createClient().auth.signOut();
    router.push("/");
  };

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "?";
  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href + "/"));

  return (
    <>
      {/* ══════════════════════════════════════════════════════
          DESKTOP SIDEBAR
          ══════════════════════════════════════════════════════ */}
      <aside className={`grad-sidebar hidden md:flex fixed top-3 bottom-3 left-3 z-40 flex-col rounded-2xl border border-line shadow-xl shadow-black/20 transition-[width] duration-200 ease-out-expo overflow-hidden ${
        collapsed ? "w-14" : "w-56"
      }`}>

        {/* ── Logo ─────────────────────────────────────────── */}
        <div className={`flex items-center border-b border-line shrink-0 h-14 ${collapsed ? "justify-center px-0" : "px-4 gap-3"}`}>
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/android-chrome-192x192.png" alt="Tausi" className="w-8 h-8 rounded-xl shrink-0 ring-1 ring-teal/20" />
            {!collapsed && (
              <span className="font-display text-sm font-bold text-snow tracking-tight truncate">Tausi</span>
            )}
          </Link>
          {!collapsed && (
            <button onClick={toggleSidebar} title="Collapse sidebar"
              className="ml-auto p-1.5 rounded-lg text-dim hover:text-snow hover:bg-ink-3 transition-colors cursor-pointer shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7M21 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Nav links ─────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {/* Prominent Predict CTA — the key feature */}
          <Link href="/predict" title={collapsed ? T.nav.predictExam : undefined}
            className={`group relative flex items-center gap-2.5 rounded-xl bg-teal text-ink font-bold shadow-sm hover:opacity-90 transition-all cursor-pointer mb-2 ${
              collapsed ? "justify-center p-2" : "px-2.5 py-2.5"
            } ${isActive("/predict") ? "ring-2 ring-teal/40 ring-offset-2 ring-offset-ink" : ""}`}>
            <span className="w-7 h-7 rounded-lg bg-ink/15 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </span>
            {!collapsed && <span className="text-sm">{T.nav.predictExam}</span>}
          </Link>

          {!collapsed && (
            <p className="px-2.5 pb-1.5 text-[10px] font-bold text-dim/70 uppercase tracking-[0.15em]">{T.nav.workspace}</p>
          )}
          {navItems.map(({ href, key, d, accent }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} title={collapsed ? T.nav[key as NavKey] : undefined}
                className={`group relative flex items-center gap-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                  collapsed ? "justify-center p-1.5" : "px-2 py-1.5"
                } ${
                  active
                    ? ACTIVE_PILL[accent]
                    : "text-dim hover:text-snow hover:bg-white/5"
                }`}
              >
                {/* Active accent bar */}
                {active && (
                  <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full ${ACTIVE_BAR[accent]} ${collapsed ? "" : "-ml-2"}`} />
                )}
                {/* Tinted icon box */}
                <span className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                  active ? ICON_BOX_ACTIVE[accent] : `bg-ink-3 border-line text-dim ${ICON_BOX_HOVER[accent]}`
                }`}>
                  <NavIcon d={d} sw={active ? 2 : 1.5} />
                </span>
                {!collapsed && (
                  <span className="truncate">{T.nav[key as NavKey]}</span>
                )}
                {active && !collapsed && (
                  <span className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${ACTIVE_DOT[accent]}`} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── User section ──────────────────────────────────── */}
        <div className={`border-t border-line shrink-0 ${collapsed ? "py-3 flex flex-col items-center gap-2 px-2" : "p-3 space-y-1"}`}>
          {user ? (
            collapsed ? (
              <>
                <Link href="/profile" title="Profile"
                  className="w-9 h-9 rounded-xl bg-teal/15 border border-teal/25 flex items-center justify-center text-xs font-bold text-teal hover:bg-teal/20 transition-colors select-none">
                  {initials}
                </Link>
                <button onClick={toggleSidebar} title="Expand sidebar"
                  className="w-9 h-9 rounded-xl bg-ink-3 border border-line flex items-center justify-center text-dim hover:text-snow hover:border-line-2 transition-colors cursor-pointer">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5l7 7-7 7M3 5l7 7-7 7" />
                  </svg>
                </button>
                <ThemeToggle compact />
                <button onClick={signOut} title={T.nav.signOut}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-dim hover:text-bad hover:bg-bad/10 transition-colors cursor-pointer">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <Link href="/profile"
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/5 transition-colors group">
                  <div className="w-7 h-7 rounded-lg bg-teal/15 border border-teal/25 flex items-center justify-center text-xs font-bold text-teal select-none shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-snow font-medium truncate">{user.email}</p>
                    <p className="text-[10px] text-dim">{T.nav.viewProfile}</p>
                  </div>
                </Link>
                <div className="flex items-center gap-1.5 px-1">
                  <LangPill />
                  <ThemeToggle />
                  <button onClick={signOut} title={T.nav.signOut}
                    className="ml-auto p-1.5 rounded-lg text-dim hover:text-bad hover:bg-bad/10 transition-colors cursor-pointer">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                  </button>
                </div>
              </>
            )
          ) : (
            collapsed ? (
              <Link href="/login" title="Sign in"
                className="w-9 h-9 rounded-xl border border-line flex items-center justify-center text-dim hover:text-snow hover:border-line-2 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m-6-6l3 3m0 0l-3 3m3-3H3.75" />
                </svg>
              </Link>
            ) : (
              <div className="space-y-1.5 px-1">
                <Link href="/login"
                  className="flex items-center justify-center w-full py-2 rounded-xl border border-line text-xs font-medium text-dim hover:text-snow hover:border-line-2 transition-colors">
                  {T.nav.signIn}
                </Link>
                <Link href="/signup"
                  className="flex items-center justify-center w-full py-2 rounded-xl bg-teal text-ink text-xs font-bold hover:opacity-90 transition-opacity">
                  {T.nav.signUp}
                </Link>
              </div>
            )
          )}
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════
          MOBILE TOP BAR
          ══════════════════════════════════════════════════════ */}
      <header className="md:hidden sticky top-0 z-30 h-13 flex items-center justify-between px-4 bg-ink/95 backdrop-blur-md border-b border-line"
        style={{ height: "52px" }}>
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/android-chrome-192x192.png" alt="Tausi" className="w-7 h-7 rounded-lg" />
          <span className="font-display text-sm font-bold text-snow">Tausi</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <LangPill />
          {user ? (
            <button onClick={() => setMobileSheet(true)}
              className="flex items-center gap-2 rounded-xl border border-line bg-ink-2/80 px-2.5 py-1.5 cursor-pointer hover:border-line-2 transition-colors">
              <div className="w-6 h-6 rounded-lg bg-teal/15 border border-teal/25 flex items-center justify-center text-[11px] font-bold text-teal select-none">
                {initials}
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link href="/login" className="text-xs text-dim hover:text-snow px-2.5 py-1.5 rounded-lg transition-colors">{T.nav.signIn}</Link>
              <Link href="/signup" className="text-xs font-bold text-ink bg-teal hover:opacity-90 px-2.5 py-1.5 rounded-lg">{T.nav.signUp}</Link>
            </div>
          )}
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════
          MOBILE BOTTOM TAB BAR
          ══════════════════════════════════════════════════════ */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-ink/95 backdrop-blur-md border-t border-line"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="grid grid-cols-5 h-16 px-1">
            {navItems.slice(0, 5).map(({ href, key, d, accent }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href}
                  className={`relative flex flex-col items-center justify-center gap-1.5 transition-colors ${
                    active ? ACTIVE_DOT[accent].replace("bg-", "text-") : "text-dim"
                  }`}>
                  {active && (
                    <span className={`absolute top-1.5 w-9 h-1 rounded-full ${ACTIVE_BAR[accent]}`} />
                  )}
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.5} d={d} />
                  </svg>
                  <span className="text-[9px] font-semibold leading-none uppercase tracking-wide truncate max-w-full px-0.5">
                    {T.nav[key as NavKey]}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* ══════════════════════════════════════════════════════
          MOBILE ACCOUNT SHEET
          ══════════════════════════════════════════════════════ */}
      <div aria-hidden={!mobileSheet}
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-200 ${
          mobileSheet ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileSheet(false)} />
        <div className={`absolute bottom-0 left-0 right-0 rounded-t-2xl bg-ink border-t border-line overflow-hidden transition-transform duration-300 ${
          mobileSheet ? "translate-y-0" : "translate-y-full"
        }`}>
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-9 h-1 rounded-full bg-line-2" />
          </div>

          {/* User row */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-line">
            <div className="w-11 h-11 rounded-2xl bg-teal/15 border border-teal/25 flex items-center justify-center text-sm font-bold text-teal select-none">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-snow truncate">{user?.email}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="p-3 space-y-1">
            <Link href="/discover" onClick={() => setMobileSheet(false)}
              className="flex items-center gap-3.5 px-4 py-3 rounded-xl text-dim hover:text-snow hover:bg-white/5 transition-colors text-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
              {T.nav.discover}
            </Link>
            <Link href="/profile" onClick={() => setMobileSheet(false)}
              className="flex items-center gap-3.5 px-4 py-3 rounded-xl text-dim hover:text-snow hover:bg-white/5 transition-colors text-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              {T.nav.profile}
            </Link>
            <button onClick={signOut}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-bad hover:bg-bad/10 transition-colors text-sm cursor-pointer">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              {T.nav.signOut}
            </button>
          </div>
          <div style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)" }} />
        </div>
      </div>
    </>
  );
}

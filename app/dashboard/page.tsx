"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/app/components/Header";
import { useT } from "@/app/lib/language-context";
import { useSession } from "@/app/lib/session-context";

interface RecentExam {
  id: string;
  title: string;
  original_filenames: string[];
  is_public: boolean;
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function Dashboard() {
  const { T } = useT();
  const D = T.dashboard;
  const { user, credits } = useSession();

  const [recentExams, setRecentExams] = useState<RecentExam[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [papersCount, setPapersCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/exams")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setRecentExams(d); })
      .catch(() => {})
      .finally(() => setLoadingRecent(false));
    fetch("/api/papers")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPapersCount(d.length); })
      .catch(() => {});
  }, []);

  const displayName = user?.email?.split("@")[0] ?? "";
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "?";
  // Credits ring: treat 100 as max (clamp between 0–100)
  const ringMax = 100;
  const ringVal = Math.max(0, Math.min(credits ?? 0, ringMax));
  const circumference = 2 * Math.PI * 38;

  return (
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-7 pb-bottom-nav md:pb-10 space-y-5">

        {/* ════════════════════════════════════════════════════════════
            ROW 1 — Stats overview + Recent Exams hero
            ════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 page-in">

          {/* ── Stats card ─────────────────────────────────────────── */}
          <div className="rounded-2xl border border-line bg-ink-2 p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-dim uppercase tracking-widest">{D.overview}</p>
              <Link href="/pricing"
                className="text-[11px] font-semibold text-teal border border-teal/30 bg-teal/5 hover:bg-teal/10 px-2 py-1 rounded-lg transition-colors cursor-pointer">
                {D.buyCredits}
              </Link>
            </div>

            {/* Avatar with credits ring */}
            <div className="flex flex-col items-center gap-3 py-1">
              <div className="relative w-22 h-22">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 88 88">
                  <circle cx="44" cy="44" r="38" fill="none" stroke="var(--tausi-line)" strokeWidth="4" />
                  <circle cx="44" cy="44" r="38" fill="none"
                    stroke="var(--tausi-teal)" strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={`${circumference * (ringVal / ringMax)} ${circumference}`} />
                </svg>
                <div className="absolute inset-1.75 rounded-full bg-teal/10 border border-teal/20 flex items-center justify-center text-base font-bold text-teal select-none">
                  {initials}
                </div>
              </div>

              {credits !== null && (
                <span className="text-[11px] font-semibold bg-teal/10 text-teal border border-teal/20 rounded-full px-3 py-1">
                  {D.creditsLeftN(credits)}
                </span>
              )}

              <div className="text-center">
                <p className="font-display text-xl font-bold text-snow leading-snug">
                  {displayName ? D.welcomeName(displayName) : D.welcomeBack}
                </p>
                <p className="text-xs text-dim mt-0.5">{D.readyAce}</p>
              </div>
            </div>

            {/* Credits progress bar */}
            {credits !== null && (
              <div className="space-y-1.5 px-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-dim">{D.monthlyActivity}</span>
                  <span className="font-semibold text-body">{ringVal}%</span>
                </div>
                <div className="h-2 rounded-full bg-ink-3 overflow-hidden">
                  <div className="h-full rounded-full bg-teal transition-all duration-700"
                    style={{ width: `${ringVal}%` }} />
                </div>
              </div>
            )}

            {/* 3 stat tiles */}
            <div className="grid grid-cols-3 gap-2 mt-auto">
              {([
                {
                  value: loadingRecent ? "—" : String(recentExams.length),
                  label: D.statExams,
                  path: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
                  accent: "text-coral bg-coral/10 border-coral/20",
                },
                {
                  value: papersCount !== null ? String(papersCount) : "—",
                  label: D.statPapers,
                  path: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
                  accent: "text-brand-magenta bg-brand-magenta/10 border-brand-magenta/20",
                },
                {
                  value: credits !== null ? String(credits) : "—",
                  label: D.statCredits,
                  path: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
                  accent: "text-gold bg-gold/10 border-gold/20",
                },
              ] as const).map(({ value, label, path, accent }) => (
                <div key={label} className={`rounded-xl border p-3 flex flex-col items-center gap-1.5 ${accent}`}>
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
                  </svg>
                  <span className="font-display text-xl font-bold leading-none">{value}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Exams hero (coral) ────────────────────────────────── */}
          <div className="grad-coral-panel lg:col-span-2 rounded-2xl p-6 flex flex-col gap-5 overflow-hidden relative">

            {/* Decorative blobs */}
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-15"
              style={{ background: "oklch(0.85 0.10 55)" }} />
            <div className="absolute bottom-4 right-16 w-24 h-24 rounded-full opacity-10"
              style={{ background: "oklch(0.90 0.07 35)" }} />

            <div className="relative flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold text-white">{D.yourExams}</h2>
              <div className="flex items-center gap-2">
                {recentExams.length > 3 && (
                  <span className="text-xs font-semibold text-white/70">
                    {D.totalN(recentExams.length)}
                  </span>
                )}
                <Link href="/predict"
                  className="text-xs font-semibold text-white border border-white/25 bg-white/15 hover:bg-white/25 rounded-lg px-3 py-1.5 transition-all cursor-pointer">
                  {D.newBtn}
                </Link>
              </div>
            </div>

            {loadingRecent ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 flex-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-xl h-40 animate-pulse" style={{ background: "oklch(0.70 0.12 30 / 0.3)" }} />
                ))}
              </div>
            ) : recentExams.length === 0 ? (
              <Link href="/predict" className="group flex-1 flex flex-col items-center justify-center gap-3 py-6 text-white/70 hover:text-white transition-colors">
                <svg className="w-12 h-12 opacity-50 group-hover:opacity-80 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">{D.noExamsYet}</p>
                  <p className="text-xs text-white/60 mt-0.5">{D.tapPredict}</p>
                </div>
              </Link>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 flex-1">
                {recentExams.slice(0, 3).map((exam, i) => {
                  const pct = [72, 46, 56][i % 3];
                  return (
                    <Link key={exam.id} href={`/exams/${exam.id}`}
                      className="group relative block rounded-xl bg-white p-4 hover:-translate-y-1 hover:shadow-xl transition-all duration-200 cursor-pointer">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                        style={{ background: "oklch(0.94 0.04 30)" }}>
                        <svg className="w-4 h-4" style={{ color: "oklch(0.56 0.15 32)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>

                      <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug mb-2 group-hover:text-[oklch(0.56_0.15_32)] transition-colors">
                        {exam.title}
                      </h3>

                      <div className="flex flex-wrap gap-1 mb-3">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          exam.is_public ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {exam.is_public ? T.common.public : T.common.private}
                        </span>
                        <span className="text-[10px] font-medium bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full">
                          {D.aiBadge}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-gray-400">{D.reviewed}</span>
                          <span className="text-xs font-bold" style={{ color: "oklch(0.56 0.15 32)" }}>
                            {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "oklch(0.56 0.15 32)" }} />
                        </div>
                      </div>

                      <p className="text-[10px] text-gray-400 mt-2 truncate" suppressHydrationWarning>
                        {formatDate(exam.created_at)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            ROW 2 — Big "Start Predicting" CTA (the key feature)
            ════════════════════════════════════════════════════════════ */}
        <Link href="/predict"
          className="grad-hero-teal group relative block overflow-hidden rounded-2xl border border-teal/30 p-6 sm:p-8 card-enter card-enter-1 cursor-pointer transition-all hover:border-teal/50">
          {/* Decorative blobs */}
          <div className="absolute -top-10 -right-6 w-48 h-48 rounded-full opacity-[0.12] pointer-events-none" style={{ background: "oklch(0.72 0.20 192)" }} />
          <div className="absolute -bottom-12 right-40 w-32 h-32 rounded-full opacity-[0.08] pointer-events-none" style={{ background: "oklch(0.72 0.20 192)" }} />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal/15 border border-teal/30 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal uppercase tracking-widest mb-1.5">
                  {D.ctaEyebrow}
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-snow leading-tight">
                  {D.ctaTitle}
                </h2>
                <p className="text-sm text-dim mt-1 max-w-md">
                  {D.ctaSub}
                </p>
              </div>
            </div>

            <span className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-teal text-ink font-bold px-6 py-4 text-base shadow-lg group-hover:opacity-90 transition-opacity w-full sm:w-auto justify-center">
              {D.startPredicting}
              <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </div>
        </Link>

        {/* ════════════════════════════════════════════════════════════
            ROW 3 — AI Tools (full width, on its own)
            ════════════════════════════════════════════════════════════ */}
        <div className="grad-ai-panel rounded-2xl border border-line overflow-hidden relative card-enter card-enter-2">
          <div className="relative p-5 sm:p-6 flex flex-col gap-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-dim uppercase tracking-widest mb-1">{D.aiToolsLabel}</p>
                <h3 className="font-display text-xl font-bold text-snow leading-snug">
                  {D.aiToolsTitle}
                </h3>
              </div>
              {/* Ask-something input → links to Study Room (desktop) */}
              <Link href="/study"
                className="hidden sm:flex items-center gap-2 rounded-xl border border-line bg-ink/40 hover:bg-ink/60 px-3 py-2.5 transition-colors cursor-pointer w-64">
                <svg className="w-4 h-4 text-dim shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337 5.972 5.972 0 01-5.035 2.057 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                <span className="flex-1 text-xs text-dim">{D.askSomething}</span>
                <span className="w-7 h-7 rounded-lg bg-teal flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {([
                {
                  href: "/mark", label: T.nav.aiMarker, desc: D.toolMarkerDesc,
                  icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
                  accent: "text-teal bg-teal/10 border-teal/20 group-hover:bg-teal/20",
                },
                {
                  href: "/study", label: T.nav.studyRoom, desc: D.toolStudyDesc,
                  icon: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337 5.972 5.972 0 01-5.035 2.057 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z",
                  accent: "text-gold bg-gold/10 border-gold/20 group-hover:bg-gold/20",
                },
                {
                  href: "/write", label: T.nav.aiWriter, desc: D.toolWriterDesc,
                  icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z",
                  accent: "text-brand-magenta bg-brand-magenta/10 border-brand-magenta/20 group-hover:bg-brand-magenta/20",
                },
                {
                  href: "/discover", label: T.nav.discover, desc: D.toolDiscoverDesc,
                  icon: "M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c-.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z",
                  accent: "text-coral bg-coral/10 border-coral/20 group-hover:bg-coral/20",
                },
              ] as const).map(({ href, label, desc, icon, accent }) => (
                <Link key={href} href={href}
                  className="group flex items-center gap-3 p-2.5 rounded-xl bg-ink/30 hover:bg-ink/50 border border-line/60 hover:border-line transition-all cursor-pointer">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${accent}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-body group-hover:text-snow transition-colors leading-none">{label}</p>
                    <p className="text-[10px] text-dim mt-0.5 truncate">{desc}</p>
                  </div>
                  <svg className="w-3.5 h-3.5 text-dim group-hover:text-snow shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ))}
            </div>

            {/* Ask-something input → links to Study Room (mobile only) */}
            <Link href="/study"
              className="sm:hidden rounded-xl border border-line bg-ink/40 flex items-center gap-2 px-3 py-2.5">
              <svg className="w-4 h-4 text-dim shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337 5.972 5.972 0 01-5.035 2.057 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              <span className="flex-1 text-xs text-dim">{D.askSomething}</span>
              <span className="w-7 h-7 rounded-lg bg-teal flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </span>
            </Link>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            ALL EXAMS — full grid (shows when there are more than 3)
            ════════════════════════════════════════════════════════════ */}
        {!loadingRecent && recentExams.length > 3 && (
          <section className="space-y-4 card-enter card-enter-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-dim uppercase tracking-widest">{T.dashboard.myExamsHeading}</h2>
              <span className="text-xs font-semibold text-dim bg-ink-3 border border-line rounded-full px-2 py-0.5">{T.dashboard.saved(recentExams.length)}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentExams.slice(3).map((exam, i) => (
                <Link key={exam.id} href={`/exams/${exam.id}`}
                  className={`group block rounded-2xl border border-line bg-ink-2/50 hover:bg-ink-2 hover:border-teal/40 p-5 transition-all cursor-pointer card-enter card-enter-${Math.min(i + 1, 5)}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-sm font-bold text-body group-hover:text-snow line-clamp-2 leading-snug flex-1 transition-colors">
                      {exam.title}
                    </h3>
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-0.5 ${
                      exam.is_public ? "text-good border-good/30 bg-good/10" : "text-dim border-line"
                    }`}>
                      {exam.is_public ? T.common.public : T.common.private}
                    </span>
                  </div>
                  <p className="text-xs text-dim mb-2 truncate">
                    {exam.original_filenames.slice(0, 2).join(", ")}
                    {exam.original_filenames.length > 2 && ` +${exam.original_filenames.length - 2}`}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-dim/60" suppressHydrationWarning>{formatDate(exam.created_at)}</p>
                    <svg className="w-4 h-4 text-dim group-hover:text-teal transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}

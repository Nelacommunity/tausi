"use client";

import Link from "next/link";
import { useT } from "./lib/language-context";
import { PREMIUM_PRICE_MONTHLY_TZS } from "./lib/types";

function GradientOrb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`} />;
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-600/40 flex items-center justify-center text-sm font-bold text-indigo-400 shrink-0">
      {n}
    </div>
  );
}

const FEATURE_ICONS = [
  "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
  "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z",
  "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25",
  "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3",
  "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3",
];
const FEATURE_COLORS = ["indigo","emerald","purple","amber","pink","cyan","blue","orange"];

const SUBJECTS = [
  "Mathematics","Physics","Chemistry","Biology","Computer Science",
  "Economics","Accounting","History","Geography","Law",
  "Statistics","Engineering","Medicine","Business Studies","Psychology",
];

export function LandingClient() {
  const { T, lang, setLang } = useT();
  const L = T.landing;
  const monthly = PREMIUM_PRICE_MONTHLY_TZS.toLocaleString();

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-20 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/android-chrome-192x192.png" alt="Tausi" className="w-8 h-8 rounded-lg" />
            <span className="text-base font-bold tracking-tight">Tausi</span>
          </Link>

          <div className="hidden sm:flex items-center gap-6 text-sm text-gray-400">
            <Link href="/discover" className="hover:text-white transition-colors">{T.nav.discover}</Link>
            <Link href="#features" className="hover:text-white transition-colors">{L.featuresTitle}</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">{L.pricingTitle}</Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Inline language toggle for landing page */}
            <div className="flex items-center rounded-lg border border-gray-700 overflow-hidden">
              {(["en","sw"] as const).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-2.5 py-1 text-xs font-bold uppercase transition-colors ${lang===l?"bg-indigo-600 text-white":"text-gray-400 hover:text-white"}`}>
                  {l==="en"?"EN":"SW"}
                </button>
              ))}
            </div>
            <Link href="/login" className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors hidden sm:block">
              {T.nav.signIn}
            </Link>
            <Link href="/signup" className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg transition-colors">
              {L.ctaSecondary.includes("Browse") ? T.nav.signUp : T.nav.signUp}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-28 px-4 text-center overflow-hidden">
        <GradientOrb className="w-[600px] h-[600px] bg-indigo-600 -top-40 -left-40" />
        <GradientOrb className="w-[500px] h-[500px] bg-purple-600 -top-20 -right-20" />
        <GradientOrb className="w-[400px] h-[400px] bg-indigo-800 bottom-0 left-1/2 -translate-x-1/2" />

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 border border-indigo-800 bg-indigo-950/60 rounded-full px-4 py-1.5 text-xs text-indigo-300 font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            {L.badge}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            {L.headline1}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              {L.headline2}
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            {L.subheadline}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 text-sm shadow-lg shadow-indigo-600/30 hover:-translate-y-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {L.ctaPrimary}
            </Link>
            <Link href="/discover"
              className="flex items-center gap-2 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-medium px-7 py-3.5 rounded-xl transition-all duration-200 text-sm hover:-translate-y-0.5">
              {L.ctaSecondary}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <p className="text-xs text-gray-600 mt-6">{L.proofLine}</p>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-indigo-400 tracking-widest uppercase mb-3">{L.featuresTitle}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{L.featuresHeading}</h2>
            <p className="text-gray-500 max-w-xl mx-auto">{L.featuresSub}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {L.features.map((f, i) => (
              <div key={i} className="group rounded-2xl border border-gray-800 bg-gray-900/40 hover:bg-gray-900/80 hover:border-gray-600 p-6 transition-all duration-300">
                <div className={`w-11 h-11 rounded-xl bg-${FEATURE_COLORS[i]}-950 border border-${FEATURE_COLORS[i]}-900 flex items-center justify-center mb-4 group-hover:bg-${FEATURE_COLORS[i]}-900 transition-colors`}>
                  <svg className={`w-5 h-5 text-${FEATURE_COLORS[i]}-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={FEATURE_ICONS[i]} />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="py-24 px-4 border-t border-gray-800/60">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-indigo-400 tracking-widest uppercase mb-3">{L.howTitle}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{L.howHeading}</h2>
          </div>
          <div className="space-y-6">
            {L.steps.map((s, i) => (
              <div key={i} className={`flex gap-5 rounded-2xl border p-6 transition-colors ${
                ["border-indigo-900/60 bg-indigo-950/20","border-purple-900/60 bg-purple-950/20","border-emerald-900/60 bg-emerald-950/20","border-amber-900/60 bg-amber-950/20"][i]
              }`}>
                <StepBadge n={i+1} />
                <div>
                  <h3 className="text-base font-semibold text-white mb-1.5">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-4 border-t border-gray-800/60">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-indigo-400 tracking-widest uppercase mb-3">{L.pricingTitle}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{L.pricingHeading}</h2>
            <p className="text-gray-500 max-w-lg mx-auto text-sm">{L.pricingSub}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Free */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-7 flex flex-col">
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">{L.freeTitle}</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-extrabold">{L.freePrice}</span>
                </div>
                <p className="text-xs text-gray-600">{L.freeSub}</p>
              </div>
              <ul className="space-y-2.5 text-sm text-gray-400 flex-1 mb-7">
                {L.freeFeatures.map(f => (
                  <li key={f} className="flex items-center gap-2.5"><CheckIcon />{f}</li>
                ))}
              </ul>
              <Link href="/signup"
                className="block text-center rounded-xl border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-semibold py-3 transition-colors text-sm">
                {T.nav.signUp}
              </Link>
            </div>

            {/* Premium */}
            <div className="relative rounded-2xl border-2 border-indigo-600 bg-gray-900/80 p-7 flex flex-col">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full">{L.premiumBadge}</span>
              </div>
              <div className="mb-6">
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">{L.premiumTitle}</p>
                <div className="flex items-baseline gap-1 mb-0.5">
                  <span className="text-4xl font-extrabold">TZS {monthly}</span>
                  <span className="text-gray-500 text-sm">{L.premiumMonth}</span>
                </div>
                <p className="text-xs text-emerald-400">{L.premiumAnnual}</p>
              </div>
              <ul className="space-y-2.5 text-sm text-gray-200 flex-1 mb-7">
                {L.premiumFeatures.map(f => (
                  <li key={f} className="flex items-center gap-2.5"><CheckIcon />{f}</li>
                ))}
              </ul>
              <a href="https://wa.me/255000000000?text=Hi%2C%20I%20want%20to%20upgrade%20to%20Tausi%20Premium"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 transition-all text-sm shadow-lg shadow-indigo-600/25 mb-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.561 4.14 1.541 5.875L0 24l6.335-1.524A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.886 0-3.65-.498-5.178-1.368l-.371-.22-3.762.904.936-3.661-.24-.378A9.94 9.94 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>
                {L.upgradeBtn}
              </a>
              <p className="text-center text-xs text-gray-600">{L.payMethods}</p>
            </div>
          </div>

          <div className="text-center">
            <Link href="/pricing" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              {L.viewFullPricing}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Subjects ─────────────────────────────────────────── */}
      <section className="py-20 px-4 border-t border-gray-800/60">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold text-gray-600 tracking-widest uppercase mb-6">{L.subjectsHeading}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUBJECTS.map(s => (
              <span key={s} className="px-3 py-1.5 rounded-full border border-gray-800 bg-gray-900/40 text-xs text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors cursor-default">{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-24 px-4 border-t border-gray-800/60">
        <div className="relative max-w-3xl mx-auto text-center overflow-hidden">
          <GradientOrb className="w-[500px] h-[300px] bg-indigo-700 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">{L.ctaBannerHeading}</h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">{L.ctaBannerSub}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup"
                className="flex items-center gap-2 bg-white text-gray-950 hover:bg-gray-100 font-bold px-8 py-3.5 rounded-xl transition-all duration-200 text-sm shadow-xl hover:-translate-y-0.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {L.ctaBannerBtn}
              </Link>
              <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">{L.alreadyAccount}</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-gray-800/60 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/android-chrome-192x192.png" alt="Tausi" className="w-6 h-6 rounded-md" />
            <span className="text-sm font-semibold text-gray-400">Tausi</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-600">
            <Link href="/discover" className="hover:text-gray-400 transition-colors">{T.nav.discover}</Link>
            <Link href="/pricing" className="hover:text-gray-400 transition-colors">{L.pricingTitle}</Link>
            <Link href="/login" className="hover:text-gray-400 transition-colors">{T.nav.signIn}</Link>
            <Link href="/signup" className="hover:text-gray-400 transition-colors">{T.nav.signUp}</Link>
          </div>
          <p className="text-xs text-gray-700">{L.poweredBy}</p>
        </div>
      </footer>
    </div>
  );
}

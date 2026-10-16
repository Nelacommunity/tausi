"use client";

import Link from "next/link";
import { useT } from "@/app/lib/language-context";

const SECTION_ICON = [
  // What Tausi does — building
  "M3.75 21h16.5M4.5 3h15l-.75 18h-13.5L4.5 3zM9 9h1.5M9 12h1.5M9 15h1.5m4.5-6H15m1.5 3H15m1.5 3H15",
  // How diagnosis works — users
  "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  // Mission — sparkle
  "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
];

const SECTION_ACCENT = [
  { box: "bg-gold/15 border-gold/25 text-gold", blob: "oklch(0.82 0.17 72)" },
  { box: "bg-teal/15 border-teal/25 text-teal", blob: "oklch(0.72 0.20 192)" },
  { box: "bg-brand-magenta/15 border-brand-magenta/25 text-brand-magenta", blob: "oklch(0.62 0.21 340)" },
];

export function AboutClient() {
  const { T } = useT();
  const A = T.about;

  return (
    <div className="min-h-screen bg-ink text-body relative overflow-hidden">
      {/* Ambient glow, matches the landing page's iridescent backdrop */}
      <div className="iridescent opacity-40 pointer-events-none" aria-hidden="true" />

      <div className="relative max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-dim hover:text-snow transition-colors mb-10">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          {A.backToTausi}
        </Link>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-line grad-hero-gold px-8 py-14 text-center mb-10 hero-rise">
          <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full opacity-[0.14] pointer-events-none"
            style={{ background: "oklch(0.82 0.17 72)" }} />
          <div className="absolute bottom-0 left-10 w-32 h-32 rounded-full opacity-[0.10] pointer-events-none"
            style={{ background: "oklch(0.72 0.20 192)" }} />
          <div className="relative flex flex-col items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/android-chrome-192x192.png" alt="Tausi" className="w-16 h-16 rounded-2xl shadow-lg shadow-black/20" />
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-snow">{A.title}</h1>
            <p className="text-base text-dim max-w-xl leading-relaxed">{A.intro}</p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {A.sections.map((s, i) => {
            const accent = SECTION_ACCENT[i % SECTION_ACCENT.length];

            return (
              <section
                key={i}
                className={`card-enter card-enter-${i + 1} relative overflow-hidden rounded-2xl border border-line bg-ink-2/60 p-6`}
              >
                <div className="absolute -top-10 -right-8 w-32 h-32 rounded-full opacity-[0.08] pointer-events-none"
                  style={{ background: accent.blob }} />

                <div className="relative flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${accent.box}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={SECTION_ICON[i % SECTION_ICON.length]} />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold text-snow">{s.h}</h2>
                </div>

                <div className="relative text-sm leading-7">
                  {s.p.map((para, j) => (
                    <p key={j} className="text-dim mb-3 last:mb-0">{para}</p>
                  ))}

                  {s.list.length > 0 ? (
                    <ul className="space-y-2 list-disc list-inside text-dim mt-1">
                      {s.list.map((li, j) => <li key={j}>{li}</li>)}
                    </ul>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t border-line flex flex-wrap items-center justify-center gap-2 text-xs">
          {[
            ["/about", T.legal.footerAbout],
            ["/privacy", T.legal.footerPrivacy],
            ["/service", T.legal.footerTerms],
            ["/cookies", T.legal.footerCookies],
            ["/", T.legal.footerHome],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-full border border-line px-3.5 py-1.5 text-dim hover:text-snow hover:border-line-2 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

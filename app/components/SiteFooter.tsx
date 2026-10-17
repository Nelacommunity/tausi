"use client";

import Link from "next/link";
import { useT } from "@/app/lib/language-context";

const CONTACT_EMAIL = "hello@tausi.app";
const SECURITY_EMAIL = "security@tausi.app";

/** The public site footer: product links, company, legal, language and trust notes. */
export function SiteFooter() {
  const { T, lang, setLang } = useT();
  const F = T.footer;
  const L = T.legal;

  const columns: { title: string; links: { href: string; label: string; plain?: boolean }[] }[] = [
    {
      title: F.learn,
      links: [
        { href: "/learn", label: F.forStudents },
        { href: "/teach", label: F.forTeachers },
        { href: "/shuo", label: F.shuo, plain: true },
        { href: "/join", label: F.joinGame },
        { href: "/discover", label: F.discover },
      ],
    },
    {
      title: F.company,
      links: [
        { href: "/about", label: F.about },
        { href: `mailto:${CONTACT_EMAIL}`, label: F.contact, plain: true },
        { href: `mailto:${SECURITY_EMAIL}`, label: F.reportIssue, plain: true },
      ],
    },
    {
      title: F.legal,
      links: [
        { href: "/privacy", label: L.footerPrivacy },
        { href: "/service", label: L.footerTerms },
        { href: "/cookies", label: L.footerCookies },
        { href: "/security", label: L.footerSecurity },
      ],
    },
  ];

  const linkClass = "text-sm text-dim hover:text-snow transition-colors";

  return (
    <footer className="relative border-t border-line/40 bg-ink/60 backdrop-blur-sm px-4 pt-14 pb-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1 max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo/android-chrome-192x192.png" alt="" className="w-8 h-8 rounded-lg" />
              <span className="font-display text-lg font-bold text-snow">Tausi</span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-dim">{F.tagline}</p>

            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-dim/80 mb-2">{F.language}</p>
              <div className="inline-flex items-center rounded-full border border-line overflow-hidden" role="group" aria-label={F.language}>
                {([["en", "English"], ["sw", "Kiswahili"], ["zh", "中文"]] as const).map(([l, label]) => (
                  <button key={l} onClick={() => setLang(l)} lang={l} aria-pressed={lang === l}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${lang === l ? "bg-teal text-ink" : "text-dim hover:text-snow"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-snow mb-4">{col.title}</h2>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    {l.plain
                      ? <a href={l.href} className={linkClass}>{l.label}</a>
                      : <Link href={l.href} className={linkClass}>{l.label}</Link>}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Trust notes */}
        <ul className="mt-12 flex flex-wrap gap-x-6 gap-y-2 text-xs text-dim">
          {F.trust.map((t, i) => (
            <li key={t} className="inline-flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-teal shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d={i === 0
                  ? "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  : "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"} />
              </svg>
              {t}
            </li>
          ))}
        </ul>

        {/* Bottom bar */}
        <div className="mt-6 pt-6 border-t border-line/30 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 text-xs text-dim">
          <p>© {new Date().getFullYear()} Tausi · {F.rights}</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex items-center gap-1.5 hover:text-snow transition-colors cursor-pointer"
          >
            {F.backToTop}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
}

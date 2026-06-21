"use client";

import Link from "next/link";
import { useT } from "@/app/lib/language-context";

export function AboutClient() {
  const { T } = useT();
  const A = T.about;

  return (
    <div className="min-h-screen bg-ink text-body">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-dim hover:text-snow transition-colors mb-10">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          {A.backToTausi}
        </Link>

        <h1 className="font-display text-3xl font-bold text-snow mb-4">{A.title}</h1>
        <p className="text-sm text-dim mb-10 leading-relaxed">{A.intro}</p>

        <div className="space-y-8 text-sm leading-7">
          {A.sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-base font-semibold text-snow mb-3">{s.h}</h2>
              {s.p.map((para, j) => (
                <p key={j} className="text-dim mb-3 last:mb-0">{para}</p>
              ))}
              {s.list.length > 0 && (
                <ul className="space-y-2 list-disc list-inside text-dim mt-1">
                  {s.list.map((li, j) => <li key={j}>{li}</li>)}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-line flex flex-wrap gap-4 text-xs text-dim">
          <Link href="/privacy" className="hover:text-snow transition-colors">{T.legal.footerPrivacy}</Link>
          <Link href="/service" className="hover:text-snow transition-colors">{T.legal.footerTerms}</Link>
          <Link href="/cookies" className="hover:text-snow transition-colors">{T.legal.footerCookies}</Link>
          <Link href="/" className="hover:text-snow transition-colors">{T.legal.footerHome}</Link>
        </div>
      </div>
    </div>
  );
}

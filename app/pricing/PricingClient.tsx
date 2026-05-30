"use client";

import Link from "next/link";
import { Header } from "@/app/components/Header";
import { useT } from "@/app/lib/language-context";

// Metadata cannot be exported from "use client" pages in Next.js App Router.
// The parent layout provides the site-wide defaults; pricing-specific
// metadata is handled via the <title> tag populated by the layout template.
import {
  FREE_TOKEN_LIMITS,
  PREMIUM_TOKEN_LIMITS,
  FEATURE_LABELS,
  type Feature,
} from "@/app/lib/usage";
import { PREMIUM_PRICE_MONTHLY_TZS, PREMIUM_PRICE_ANNUAL_TZS } from "@/app/lib/types";

// Human-readable approximations shown on each feature row
const FEATURE_ESTIMATES: Record<Feature, { free: string; premium: string; icon: string }> = {
  exam_prediction:  { free: "≈ 4–6 predictions",   premium: "≈ 90–165 predictions",  icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" },
  marking_scheme:   { free: "≈ 4–7 schemes",        premium: "≈ 85–170 schemes",       icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  ai_marking:       { free: "≈ 4–7 markings",       premium: "≈ 100–200 markings",     icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  exam_chat:        { free: "≈ 6–15 messages",      premium: "≈ 120–300 messages",     icon: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" },
  study_chat:       { free: "≈ 6–15 messages",      premium: "≈ 120–300 messages",     icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  ai_writer:        { free: "≈ 5–15 AI requests",   premium: "≈ 100–300 AI requests",  icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" },
  paper_prediction: { free: "≈ 4–6 predictions",   premium: "≈ 90–165 predictions",  icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
};

const FEATURE_ORDER: Feature[] = [
  "exam_prediction", "marking_scheme", "ai_marking",
  "exam_chat", "study_chat", "ai_writer", "paper_prediction",
];

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`;
  return n.toString();
}

function Icon({ d, className = "w-4 h-4 shrink-0" }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

export function PricingClient() {
  const { T } = useT();
  const PR = T.pricing;
  const monthly = PREMIUM_PRICE_MONTHLY_TZS.toLocaleString();
  const annual  = PREMIUM_PRICE_ANNUAL_TZS.toLocaleString();
  const annualPerMonth = Math.round(PREMIUM_PRICE_ANNUAL_TZS / 12).toLocaleString();
  const annualSaving = (PREMIUM_PRICE_MONTHLY_TZS * 12 - PREMIUM_PRICE_ANNUAL_TZS).toLocaleString();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-14">

        {/* Hero */}
        <div className="text-center">
          <p className="text-xs font-semibold text-indigo-400 tracking-widest uppercase mb-3">Pricing</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">{PR.heading}</h1>
          <p className="text-gray-500 max-w-xl mx-auto text-sm">{PR.subtitle}</p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Free */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-7 flex flex-col">
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">{PR.freeTitle}</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-extrabold">TZS 0</span>
              </div>
              <p className="text-xs text-gray-600">{PR.freeSub}</p>
            </div>
            <ul className="space-y-2.5 text-sm text-gray-400 flex-1 mb-7">
              {[
                "AI-powered exam predictions",
                "Auto-generated marking schemes",
                "Upload answer sheets for AI marking",
                "Chat with your exam papers",
                "Study Room AI tutor",
                "AI Writer assistant",
                "Exam Library (upload + organise)",
              ].map(f => (
                <li key={f} className="flex items-center gap-2.5"><CheckIcon />{f}</li>
              ))}
            </ul>
            <Link href="/signup"
              className="block text-center rounded-xl border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-semibold py-3 transition-colors text-sm">
              {PR.getStarted}
            </Link>
          </div>

          {/* Premium */}
          <div className="relative rounded-2xl border-2 border-indigo-600 bg-gray-900/80 p-7 flex flex-col">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full">{PR.premiumBadge}</span>
            </div>
            <div className="mb-6">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">Premium</p>
              <div className="flex items-baseline gap-1 mb-0.5">
                <span className="text-4xl font-extrabold">TZS {monthly}</span>
                <span className="text-gray-500 text-sm">{PR.monthSuffix}</span>
              </div>
              <p className="text-xs text-emerald-400">or TZS {annual}/year — saves TZS {annualSaving}</p>
              <p className="text-xs text-gray-600">(TZS {annualPerMonth}/mo billed annually)</p>
            </div>
            <ul className="space-y-2.5 text-sm text-gray-200 flex-1 mb-7">
              {[
                "Everything in Free",
                "25× higher monthly token limits",
                "Priority AI processing",
                "Priority support via WhatsApp",
                "Early access to new features",
              ].map(f => (
                <li key={f} className="flex items-center gap-2.5"><CheckIcon />{f}</li>
              ))}
            </ul>
            <div className="space-y-3">
              <a href="https://wa.me/255000000000?text=Hi%2C%20I%20want%20to%20upgrade%20to%20Tausi%20Premium"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 transition-all text-sm shadow-lg shadow-indigo-600/25">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.561 4.14 1.541 5.875L0 24l6.335-1.524A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.886 0-3.65-.498-5.178-1.368l-.371-.22-3.762.904.936-3.661-.24-.378A9.94 9.94 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>
                Upgrade via WhatsApp
              </a>
              <p className="text-center text-xs text-gray-600">M-Pesa · Airtel Money · Tigo Cash · Bank Transfer</p>
            </div>
          </div>
        </div>

        {/* Detailed token breakdown */}
        <section>
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white mb-1">{PR.breakdownHeading}</h2>
            <p className="text-sm text-gray-500">{PR.breakdownSub}</p>
          </div>

          <div className="rounded-2xl border border-gray-800 overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_1fr_1fr] bg-gray-900 border-b border-gray-800 px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <span>{PR.tableFeature}</span>
              <span>{PR.tableFree}</span>
              <span>{PR.tablePremium}</span>
            </div>

            {FEATURE_ORDER.map((feature, i) => {
              const est = FEATURE_ESTIMATES[feature];
              const free    = FREE_TOKEN_LIMITS[feature];
              const premium = PREMIUM_TOKEN_LIMITS[feature];
              const isLast  = i === FEATURE_ORDER.length - 1;
              return (
                <div
                  key={feature}
                  className={`grid grid-cols-[1fr_1fr_1fr] px-5 py-4 items-center gap-2 ${
                    !isLast ? "border-b border-gray-800/60" : ""
                  } hover:bg-gray-900/40 transition-colors`}
                >
                  {/* Feature name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-950/60 border border-indigo-900/40 flex items-center justify-center shrink-0">
                      <Icon d={est.icon} className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-200 truncate">{FEATURE_LABELS[feature]}</span>
                  </div>

                  {/* Free column */}
                  <div>
                    <p className="text-sm font-semibold text-gray-300">{fmt(free)} tokens</p>
                    <p className="text-xs text-gray-600">{est.free}</p>
                  </div>

                  {/* Premium column */}
                  <div>
                    <p className="text-sm font-semibold text-indigo-400">{fmt(premium)} tokens</p>
                    <p className="text-xs text-gray-600">{est.premium}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-gray-700 text-center">{PR.resetNote}</p>
        </section>

        {/* Payment methods */}
        <section className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">{PR.paymentHeading}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {["M-Pesa", "Airtel Money", "Tigo Cash", "Bank Transfer"].map(m => (
              <div key={m} className="flex items-center justify-center rounded-xl border border-gray-700 bg-gray-900 py-3 text-sm font-medium text-gray-400">
                {m}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600">{PR.paymentNote}</p>
        </section>

        {/* FAQ */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-300">{PR.faqHeading}</h2>
          {[
            { q: "What exactly is a token?", a: "A token is roughly ¾ of a word in English, or about 4 characters. A 10-page PDF exam paper is typically 5,000–15,000 input tokens. Each AI response adds output tokens on top." },
            { q: "When do token limits reset?", a: "Your token counters reset to zero on the 1st of every month, midnight UTC." },
            { q: "What happens when I hit the limit?", a: "You'll see a friendly error message explaining which feature is capped and how many tokens you've used. Existing saved exams and documents are never deleted." },
            { q: "What does Premium give me?", a: "Roughly 25× more tokens per feature per month. A free user can do ~5 exam predictions; a premium user can do ~130+. You also get priority support and early feature access." },
            { q: "How do I pay?", a: "Send payment via M-Pesa, Airtel Money, Tigo Cash, or bank transfer and message us on WhatsApp with the receipt. Upgrades are processed within 30 minutes." },
          ].map(({ q, a }) => (
            <details key={q} className="rounded-xl border border-gray-800 bg-gray-900/30">
              <summary className="px-5 py-3.5 text-sm font-medium text-gray-300 cursor-pointer hover:text-white select-none">{q}</summary>
              <p className="px-5 pb-4 text-sm text-gray-500 leading-relaxed">{a}</p>
            </details>
          ))}
        </section>
      </main>
    </div>
  );
}

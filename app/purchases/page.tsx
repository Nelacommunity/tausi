"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/app/components/Header";

interface Purchase {
  id: string;
  pack: string;
  credits: number;
  amount_tzs: number;
  status: "pending" | "completed" | "failed";
  created_at: string;
  completed_at: string | null;
}

const PACK_LABELS: Record<string, string> = {
  starter:  "Starter",
  scholar:  "Scholar",
  champion: "Champion",
};

const STATUS_STYLES: Record<string, { label: string; class: string }> = {
  completed: { label: "Paid",    class: "bg-good/10 text-good border-good/30" },
  pending:   { label: "Pending", class: "bg-gold/10 text-gold border-gold/30" },
  failed:    { label: "Failed",  class: "bg-bad/10 text-bad border-bad/30" },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/purchases")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setPurchases(d.purchases as Purchase[]);
      })
      .catch(() => setError("Failed to load purchase history."));
  }, []);

  const totalPaid = purchases
    ?.filter((p) => p.status === "completed")
    .reduce((s, p) => s + p.amount_tzs, 0) ?? 0;

  const totalCredits = purchases
    ?.filter((p) => p.status === "completed")
    .reduce((s, p) => s + p.credits, 0) ?? 0;

  return (
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-bottom-nav md:pb-10 space-y-6">

        {/* ── Page header ────────────────────────────────── */}
        <div className="flex items-start justify-between page-in">
          <div>
            <h1 className="font-display text-2xl font-bold text-snow">Purchase History</h1>
            <p className="text-sm text-dim mt-1">All your credit top-ups</p>
          </div>
          <Link href="/pricing"
            className="flex items-center gap-2 rounded-xl border border-teal/40 hover:border-teal bg-teal/10 hover:bg-teal/15 text-teal font-bold px-4 py-2.5 text-sm transition-all shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            Buy credits
          </Link>
        </div>

        {/* ── Summary ────────────────────────────────────── */}
        {purchases && purchases.filter((p) => p.status === "completed").length > 0 && (
          <div className="grid grid-cols-2 gap-3 card-enter card-enter-1">
            <div className="rounded-2xl border border-line bg-ink-2/50 p-5">
              <p className="text-xs font-bold text-dim uppercase tracking-widest mb-2">Total spent</p>
              <p className="font-display text-2xl font-bold text-snow">TZS {totalPaid.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-teal/30 bg-teal/5 p-5">
              <p className="text-xs font-bold text-dim uppercase tracking-widest mb-2">Credits purchased</p>
              <p className="font-display text-2xl font-bold text-teal">{totalCredits}</p>
            </div>
          </div>
        )}

        {/* ── Loading ────────────────────────────────────── */}
        {purchases === null && !error && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl skeleton" />)}
          </div>
        )}

        {/* ── Error ──────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-bad/30 bg-bad/8 px-4 py-4 text-sm text-bad">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        {/* ── Empty state ────────────────────────────────── */}
        {purchases?.length === 0 && (
          <div className="rounded-2xl border border-line bg-ink-2/30 p-12 text-center card-enter card-enter-1">
            <div className="w-14 h-14 rounded-2xl bg-ink-3 border border-line flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-body mb-1">No purchases yet</h2>
            <p className="text-sm text-dim mb-6">Buy your first credit pack to get started.</p>
            <Link href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-teal hover:opacity-90 text-ink font-bold px-6 py-3 text-sm transition-opacity">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              Buy credits
            </Link>
          </div>
        )}

        {/* ── Purchase list ──────────────────────────────── */}
        {purchases && purchases.length > 0 && (
          <div className="space-y-3 card-enter card-enter-2">
            {purchases.map((p, i) => {
              const st = STATUS_STYLES[p.status] ?? STATUS_STYLES.failed;
              return (
                <div key={p.id}
                  className="flex items-center gap-4 rounded-2xl border border-line bg-ink-2/50 hover:bg-ink-2 hover:border-line-2 px-5 py-4 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-ink-3 border border-line flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-snow">{PACK_LABELS[p.pack] ?? p.pack}</p>
                    <p className="text-xs text-dim mt-0.5">{fmt(p.created_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-teal">{p.credits} cr</p>
                    <p className="text-xs text-dim mt-0.5">TZS {p.amount_tzs.toLocaleString()}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 ${st.class}`}>
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div>
          <Link href="/profile" className="text-xs text-dim hover:text-body transition-colors flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to profile
          </Link>
        </div>
      </main>
    </div>
  );
}

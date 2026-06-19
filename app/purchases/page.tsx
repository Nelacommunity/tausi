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
    <div className="min-h-screen bg-ink text-snow">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-bottom-nav md:pb-8 space-y-6">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-snow">Purchase History</h1>
            <p className="text-xs text-dim mt-0.5">All your credit top-ups</p>
          </div>
          <Link href="/pricing"
            className="rounded-xl border border-teal/60 hover:border-teal bg-teal-deep/40 hover:bg-teal-deep/60 text-teal font-semibold px-4 py-2 text-sm transition-all">
            Buy credits
          </Link>
        </div>

        {/* Summary cards */}
        {purchases && purchases.filter((p) => p.status === "completed").length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line bg-ink-2/50 p-4 text-center">
              <p className="text-xs text-dim mb-1">Total spent</p>
              <p className="text-xl font-bold text-snow">TZS {totalPaid.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-teal/30 bg-teal-deep/20 p-4 text-center">
              <p className="text-xs text-dim mb-1">Credits purchased</p>
              <p className="text-xl font-bold text-teal">{totalCredits}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {purchases === null && !error && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-bad/30 bg-bad/10 p-4 text-sm text-bad text-center">
            {error}
          </div>
        )}

        {/* Empty state */}
        {purchases?.length === 0 && (
          <div className="rounded-xl border border-line bg-ink-2/50 p-10 text-center">
            <p className="text-body mb-1">No purchases yet</p>
            <p className="text-xs text-dim mb-4">Buy your first credit pack to get started.</p>
            <Link href="/pricing"
              className="inline-block rounded-xl bg-teal hover:bg-teal/90 text-ink font-semibold px-5 py-2.5 text-sm transition-colors">
              Buy credits
            </Link>
          </div>
        )}

        {/* Table */}
        {purchases && purchases.length > 0 && (
          <div className="rounded-2xl border border-line overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto] bg-ink-2 border-b border-line px-5 py-3 text-xs font-semibold text-dim uppercase tracking-wider gap-4">
              <span>Pack</span>
              <span className="text-right">Credits</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Status</span>
            </div>

            {purchases.map((p, i) => {
              const st = STATUS_STYLES[p.status] ?? STATUS_STYLES.failed;
              const isLast = i === purchases.length - 1;
              return (
                <div key={p.id}
                  className={`grid grid-cols-[1fr_auto_auto_auto] px-5 py-4 items-center gap-4 ${!isLast ? "border-b border-line/50" : ""} hover:bg-ink-3/30 transition-colors`}>
                  <div>
                    <p className="text-sm font-semibold text-snow">{PACK_LABELS[p.pack] ?? p.pack}</p>
                    <p className="text-xs text-dim mt-0.5">{fmt(p.created_at)}</p>
                  </div>
                  <p className="text-sm font-bold text-teal text-right">{p.credits} cr</p>
                  <p className="text-sm text-body text-right whitespace-nowrap">
                    TZS {p.amount_tzs.toLocaleString()}
                  </p>
                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${st.class}`}>
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2">
          <Link href="/profile" className="text-xs text-dim hover:text-body transition-colors">
            ← Back to profile
          </Link>
        </div>
      </main>
    </div>
  );
}

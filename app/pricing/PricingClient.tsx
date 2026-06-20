"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Header } from "@/app/components/Header";
import { useT } from "@/app/lib/language-context";
import {
  FEATURE_LABELS,
  CREDIT_COSTS,
  type Feature,
} from "@/app/lib/usage";

// ── Credit packs ──────────────────────────────────────────────
const CREDIT_PACKS = [
  {
    key: "starter" as const,
    name: "Starter",
    credits: 20,
    amount_tzs: 2_500,
    badge: null,
    description: "Perfect to try Tausi AI",
    color: "border-line",
    accent: "text-body",
  },
  {
    key: "scholar" as const,
    name: "Scholar",
    credits: 60,
    amount_tzs: 6_000,
    badge: "Best Value",
    description: "Great for regular studying",
    color: "border-gold/70",
    accent: "text-gold",
  },
  {
    key: "champion" as const,
    name: "Champion",
    credits: 175,
    amount_tzs: 15_000,
    badge: null,
    description: "For serious exam preparation",
    color: "border-teal/60",
    accent: "text-teal",
  },
] as const;

type PackKey = "starter" | "scholar" | "champion";

// Auto-detect the Tanzanian carrier from the phone number prefix.
// Snippe handles the actual detection server-side — this is purely a UI hint.
function detectCarrier(phone: string): string | null {
  const d = phone.replace(/\D/g, "");
  const local = d.startsWith("255") ? "0" + d.slice(3) : d;
  if (!local.startsWith("0") || local.length < 4) return null;
  const pre3 = local.slice(0, 3);
  if (["074", "075", "076"].includes(pre3)) return "M-Pesa (Vodacom)";
  if (["078", "068", "069"].includes(pre3)) return "Airtel Money";
  if (["071", "065", "067"].includes(pre3)) return "Mixx by Yas (Tigo)";
  if (["061", "062"].includes(pre3)) return "Halotel";
  return null;
}

// Feature order for the breakdown table
const FEATURE_ORDER: Feature[] = [
  "exam_prediction", "marking_scheme", "ai_marking",
  "exam_chat", "study_chat", "ai_writer", "paper_prediction", "paper_chat",
];

// Usage ranges computed from actual pack credits ÷ credit cost:
// Starter (20 cr) → Scholar (60 cr) → Champion (175 cr)
const FEATURE_ESTIMATES: Record<Feature, { free: string; premium: string; icon: string }> = {
  exam_prediction:  { free: "5 (Starter) · 15 (Scholar) · 43 (Champion)",  premium: "≈ 43 predictions",   icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" },
  marking_scheme:   { free: "6 (Starter) · 20 (Scholar) · 58 (Champion)",  premium: "≈ 58 schemes",       icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  ai_marking:       { free: "6 (Starter) · 20 (Scholar) · 58 (Champion)",  premium: "≈ 58 markings",      icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  exam_chat:        { free: "10 (Starter) · 30 (Scholar) · 87 (Champion)", premium: "≈ 87 messages",      icon: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" },
  study_chat:       { free: "10 (Starter) · 30 (Scholar) · 87 (Champion)", premium: "≈ 87 messages",      icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  ai_writer:        { free: "20 (Starter) · 60 (Scholar) · 175 (Champion)", premium: "≈ 175 requests",    icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" },
  paper_prediction: { free: "5 (Starter) · 15 (Scholar) · 43 (Champion)",  premium: "≈ 43 predictions",   icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
  paper_chat:       { free: "20 (Starter) · 60 (Scholar) · 175 (Champion)", premium: "≈ 175 messages",    icon: "M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.671 1.09-.085 2.17-.207 3.238-.364 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" },
};

function Icon({ d, className = "w-4 h-4 shrink-0" }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-good shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

type ModalState =
  | { step: "form" }
  | { step: "waiting"; reference: string }
  | { step: "success"; credits: number; pack: string }
  | { step: "error"; message: string };

function BuyModal({
  pack,
  onClose,
}: {
  pack: typeof CREDIT_PACKS[number];
  onClose: () => void;
}) {
  const [phone, setPhone]   = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [state, setState]       = useState<ModalState>({ step: "form" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_QTY = 20;
  const totalAmount = pack.amount_tzs * quantity;
  const totalCredits = pack.credits * quantity;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = (purchaseId: string, snippeRef: string) => {
    let attempts = 0;
    // Poll for up to ~10 minutes (200 × 3 s). After that, show a "check manually" state.
    const MAX_ATTEMPTS = 200;

    pollRef.current = setInterval(async () => {
      attempts++;

      if (attempts > MAX_ATTEMPTS) {
        if (pollRef.current) clearInterval(pollRef.current);
        setState({
          step: "error",
          message: "Confirmation is taking longer than expected. If you paid, your credits will appear shortly — check your purchase history.",
        });
        return;
      }

      try {
        // Poll by purchase UUID (stable). Pass snippe_ref so the server can
        // heal the DB row if the snippe_ref UPDATE after checkout failed.
        const url = `/api/payment-status/${encodeURIComponent(purchaseId)}?snippe_ref=${encodeURIComponent(snippeRef)}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json() as { status: string; credits?: number; pack?: string };
        if (data.status === "completed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setState({ step: "success", credits: data.credits ?? totalCredits, pack: pack.name });
        } else if (data.status === "failed" || data.status === "expired") {
          if (pollRef.current) clearInterval(pollRef.current);
          setState({ step: "error", message: "Payment was not completed. Please try again." });
        }
      } catch { /* keep polling */ }
    }, 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/checkout/snippe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: pack.key, phone: phone.trim(), quantity }),
      });
      let data: { reference?: string; purchase_id?: string; error?: string; message?: string } = {};
      try { data = await res.json(); } catch { /* empty / non-JSON response */ }

      if (!res.ok || !data.reference || !data.purchase_id) {
        setState({ step: "error", message: data.error ?? "Failed to initiate payment. Please try again." });
        setLoading(false);
        return;
      }

      setState({ step: "waiting", reference: data.reference });
      startPolling(data.purchase_id, data.reference);
    } catch (err) {
      setState({ step: "error", message: err instanceof Error ? err.message : "Network error. Please try again." });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={state.step !== "waiting" ? onClose : undefined} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-line bg-ink-2 p-6 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-base font-bold text-snow">Buy {pack.name} Pack</h2>
            <p className="text-xs text-dim mt-0.5">{totalCredits} credits · TZS {totalAmount.toLocaleString()}</p>
          </div>
          {state.step !== "waiting" && (
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-dim hover:text-snow hover:bg-ink-3 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Form */}
        {state.step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quantity stepper */}
            <div>
              <label className="block text-xs font-medium text-body mb-1.5">Quantity</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-xl border border-line bg-ink overflow-hidden">
                  <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="w-10 h-10 flex items-center justify-center text-dim hover:text-snow hover:bg-ink-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                    </svg>
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={MAX_QTY}
                    value={quantity}
                    onChange={(e) => {
                      const n = Math.floor(Number(e.target.value));
                      setQuantity(Number.isNaN(n) ? 1 : Math.max(1, Math.min(n, MAX_QTY)));
                    }}
                    aria-label="Quantity"
                    className="w-12 h-10 bg-transparent text-center text-sm font-bold text-snow outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button type="button" onClick={() => setQuantity((q) => Math.min(MAX_QTY, q + 1))}
                    disabled={quantity >= MAX_QTY}
                    aria-label="Increase quantity"
                    className="w-10 h-10 flex items-center justify-center text-dim hover:text-snow hover:bg-ink-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-dim">
                  {pack.credits} cr × {quantity} = <span className="text-teal font-semibold">{totalCredits} credits</span>
                </p>
              </div>
            </div>

            {/* Order total */}
            <div className="flex items-center justify-between rounded-xl border border-teal/20 bg-teal/5 px-4 py-3">
              <span className="text-xs font-semibold text-dim uppercase tracking-widest">Total</span>
              <span className="font-display text-lg font-bold text-snow">TZS {totalAmount.toLocaleString()}</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-body mb-1.5">Phone number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712345678 or 255712345678"
                required
                className="w-full rounded-xl border border-line bg-ink px-3 py-2.5 text-sm text-snow placeholder:text-dim outline-none focus:border-teal transition-colors"
              />
              {/* Auto-detect carrier from phone prefix */}
              {(() => {
                const carrier = detectCarrier(phone);
                return carrier ? (
                  <p className="mt-1.5 text-xs text-teal flex items-center gap-1">
                    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Detected: {carrier}
                  </p>
                ) : null;
              })()}
              <p className="mt-1 text-xs text-dim">Supports M-Pesa, Airtel, Mixx by Yas, and Halotel</p>
            </div>
            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full rounded-xl bg-teal hover:bg-teal/90 disabled:opacity-50 disabled:cursor-not-allowed text-ink font-semibold py-3 text-sm transition-colors"
            >
              {loading ? "Initiating..." : `Pay TZS ${totalAmount.toLocaleString()}`}
            </button>
          </form>
        )}

        {/* Waiting for confirmation */}
        {state.step === "waiting" && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full border-2 border-teal/40 border-t-teal animate-spin" />
            <div>
              <p className="text-sm font-semibold text-snow">Check your phone</p>
              <p className="text-xs text-dim mt-1">
                A payment prompt has been sent to <span className="text-body font-medium">{phone}</span>. Confirm it on your phone to receive your credits.
              </p>
            </div>
            <p className="text-xs text-dim">Waiting for confirmation...</p>
          </div>
        )}

        {/* Success */}
        {state.step === "success" && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-good/10 border border-good/40 flex items-center justify-center">
              <svg className="w-7 h-7 text-good" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-snow">Credits added!</p>
              <p className="text-xs text-dim mt-1">
                <span className="text-teal font-semibold">{state.credits} credits</span> have been added to your account.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard" className="flex-1 rounded-xl bg-teal hover:bg-teal/90 text-ink font-semibold py-2.5 text-sm text-center transition-colors">
                Go to Dashboard
              </Link>
              <button onClick={onClose} className="flex-1 rounded-xl border border-line hover:border-line-2 text-body hover:text-snow font-medium py-2.5 text-sm transition-colors">
                Close
              </button>
            </div>
            <Link href="/purchases" className="block text-xs text-dim hover:text-body transition-colors">
              View purchase history →
            </Link>
          </div>
        )}

        {/* Error */}
        {state.step === "error" && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-bad/10 border border-bad/40 flex items-center justify-center">
              <svg className="w-7 h-7 text-bad" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-snow">Payment issue</p>
              <p className="text-xs text-dim mt-1">{state.message}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setState({ step: "form" })}
                className="flex-1 rounded-xl bg-teal hover:bg-teal/90 text-ink font-semibold py-2.5 text-sm transition-colors"
              >
                Try again
              </button>
              <button onClick={onClose} className="flex-1 rounded-xl border border-line hover:border-line-2 text-body hover:text-snow font-medium py-2.5 text-sm transition-colors">
                Cancel
              </button>
            </div>
            <Link href="/purchases" className="block text-xs text-dim hover:text-body transition-colors">
              View purchase history →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export function PricingClient() {
  const { T } = useT();
  const PR = T.pricing;
  const [selectedPack, setSelectedPack] = useState<typeof CREDIT_PACKS[number] | null>(null);

  return (
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-7 pb-bottom-nav md:pb-12 space-y-12">

        {/* ── Hero ──────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-line px-6 py-12 text-center page-in"
          style={{ background: "linear-gradient(135deg, oklch(0.32 0.10 72 / 0.5) 0%, oklch(0.19 0.010 238) 55%, oklch(0.30 0.10 192 / 0.4) 100%)" }}>
          <div className="absolute -top-12 -right-10 w-52 h-52 rounded-full opacity-[0.12] pointer-events-none" style={{ background: "oklch(0.82 0.17 72)" }} />
          <div className="absolute -bottom-12 -left-10 w-52 h-52 rounded-full opacity-[0.10] pointer-events-none" style={{ background: "oklch(0.72 0.20 192)" }} />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-xl border border-gold/25 bg-gold/8 px-3 py-1.5 text-xs font-semibold text-gold mb-5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              No subscriptions — pay as you go
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-snow mb-3">Buy Credits</h1>
            <p className="text-body max-w-lg mx-auto text-sm leading-relaxed">
              Fuel your AI exam prep. Credits work across all features — predictions, marking, tutoring, and writing.
            </p>
            <p className="text-xs text-dim mt-2">5 free credits on every new account.</p>
          </div>
        </div>

        {/* ── Credit pack cards ─────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 card-enter card-enter-1">
          {CREDIT_PACKS.map((pack, i) => (
            <div
              key={pack.key}
              className={`relative rounded-2xl border-2 bg-ink-2/60 p-7 flex flex-col transition-all hover:bg-ink-2 card-enter card-enter-${i + 1} ${pack.color}`}
            >
              {pack.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-gold text-on-gold text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                    {pack.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${pack.accent}`}>{pack.name}</p>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="font-display text-5xl font-bold text-snow leading-none">
                    {pack.credits}
                  </span>
                  <span className="text-dim text-base">credits</span>
                </div>
                <p className="text-2xl font-bold text-body">TZS {pack.amount_tzs.toLocaleString()}</p>
                <p className="text-xs text-dim mt-2 leading-relaxed">{pack.description}</p>
              </div>

              {/* What you can do */}
              <ul className="space-y-2.5 text-xs flex-1 mb-7">
                {[
                  { label: "Predict Exam", cost: CREDIT_COSTS.exam_prediction, uses: Math.floor(pack.credits / CREDIT_COSTS.exam_prediction) },
                  { label: "Mark Answers", cost: CREDIT_COSTS.ai_marking, uses: Math.floor(pack.credits / CREDIT_COSTS.ai_marking) },
                  { label: "AI Tutor msgs", cost: CREDIT_COSTS.study_chat, uses: Math.floor(pack.credits / CREDIT_COSTS.study_chat) },
                  { label: "Past Papers", cost: CREDIT_COSTS.paper_prediction, uses: Math.floor(pack.credits / CREDIT_COSTS.paper_prediction) },
                ].map(({ label, cost, uses }) => (
                  <li key={label} className="flex items-center justify-between gap-2">
                    <span className="text-dim">{label}</span>
                    <span className="text-body font-semibold whitespace-nowrap">{cost} cr · ≈{uses}×</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setSelectedPack(pack)}
                className={`flex items-center justify-center gap-2 rounded-xl font-bold py-3.5 transition-all text-sm cursor-pointer ${
                  pack.key === "scholar"
                    ? "bg-gold hover:opacity-90 text-on-gold"
                    : "border border-line hover:border-teal/50 hover:bg-teal/5 text-body hover:text-snow"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Buy {pack.name}
              </button>
            </div>
          ))}
        </div>

        {/* ── Credit breakdown table ────────────────────────── */}
        <section className="card-enter card-enter-2">
          <div className="mb-5">
            <h2 className="text-xs font-bold text-dim uppercase tracking-widest mb-1">Credit costs per action</h2>
            <p className="text-sm text-body">Each AI action deducts credits from your balance. Credits never expire.</p>
          </div>

          <div className="rounded-2xl border border-line overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_1fr] bg-ink-2 border-b border-line px-5 py-3 text-xs font-bold text-dim uppercase tracking-widest">
              <span>Feature</span>
              <span className="text-center">Cost</span>
              <span className="text-right">Uses per pack</span>
            </div>

            {FEATURE_ORDER.map((feature, i) => {
              const est  = FEATURE_ESTIMATES[feature];
              const cost = CREDIT_COSTS[feature];
              const isLast = i === FEATURE_ORDER.length - 1;
              return (
                <div key={feature}
                  className={`grid grid-cols-[1fr_auto_1fr] px-5 py-4 items-center gap-4 ${
                    !isLast ? "border-b border-line/50" : ""
                  } hover:bg-ink-3/30 transition-colors`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center shrink-0">
                      <Icon d={est.icon} className="w-4 h-4 text-teal" />
                    </div>
                    <span className="text-sm font-semibold text-body truncate">{FEATURE_LABELS[feature]}</span>
                  </div>
                  <div className="text-center">
                    <span className="inline-flex items-baseline gap-0.5 text-base font-bold text-gold">
                      {cost}
                      <span className="text-xs font-normal text-dim ml-0.5">cr</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-dim">{est.free}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Payment methods ───────────────────────────────── */}
        <section className="rounded-2xl border border-line bg-ink-2/40 p-6 card-enter card-enter-3">
          <p className="text-xs font-bold text-dim uppercase tracking-widest mb-4">Payment methods</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "M-Pesa", color: "text-good" },
              { label: "Airtel", color: "text-bad" },
              { label: "Mixx by Yas", color: "text-teal" },
              { label: "Halotel", color: "text-gold" },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center justify-center rounded-xl border border-line bg-ink-2 py-3 text-sm font-bold text-body">
                <span className={color}>{label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-dim">Processed securely via Snippe. Credits are added instantly after payment confirmation.</p>
        </section>

        {/* ── FAQ ───────────────────────────────────────────── */}
        <section className="space-y-2 card-enter card-enter-4">
          <p className="text-xs font-bold text-dim uppercase tracking-widest mb-4">{PR.faqHeading}</p>
          {[
            { q: "What is a credit?", a: "A credit is a unit of AI usage. Each AI action costs a fixed number of credits — exam predictions cost 4, marking 3, chat messages 2, writing 1. This is simpler and fairer than tracking tokens." },
            { q: "Do credits expire?", a: "No. Credits never expire. Buy a pack and use them whenever you need." },
            { q: "What happens when I run out?", a: "You'll see a friendly error message. Just buy more credits on this page — it only takes a minute via mobile money." },
            { q: "How do new accounts get started?", a: "Every new account starts with 5 free credits — enough for 1 exam prediction or a few study chat messages, so you can try the platform before buying." },
            { q: "Which mobile money providers are supported?", a: "We support M-Pesa, Airtel Money, Mixx by Yas, and Halotel. More providers coming soon." },
          ].map(({ q, a }) => (
            <details key={q} className="rounded-2xl border border-line bg-ink-2/40 overflow-hidden group">
              <summary className="flex items-center justify-between px-5 py-4 text-sm font-semibold text-body cursor-pointer hover:text-snow select-none transition-colors">
                {q}
                <svg className="w-4 h-4 text-dim group-open:rotate-180 transition-transform shrink-0 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5 border-t border-line/50">
                <p className="text-sm text-dim leading-relaxed pt-3">{a}</p>
              </div>
            </details>
          ))}
        </section>
      </main>

      {/* Buy modal */}
      {selectedPack && (
        <BuyModal pack={selectedPack} onClose={() => setSelectedPack(null)} />
      )}
    </div>
  );
}

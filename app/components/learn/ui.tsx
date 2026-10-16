"use client";

import type { ReactNode, ButtonHTMLAttributes } from "react";
import { useT } from "@/app/lib/language-context";
import { masteryBand, type MasteryBand, type ReadinessStatus } from "@/app/lib/mastery";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-ink-2 p-5 ${className}`}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="text-xs font-bold text-dim uppercase tracking-widest">{children}</h2>
      {action}
    </div>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "teal";
const VARIANT: Record<Variant, string> = {
  primary: "bg-gold text-on-gold hover:bg-gold-hover font-semibold",
  teal: "bg-teal text-ink hover:bg-teal/90 font-semibold",
  secondary: "border border-line bg-ink-3 text-snow hover:border-line-2",
  ghost: "text-dim hover:text-snow hover:bg-white/5",
  danger: "border border-bad/40 text-bad hover:bg-bad/10",
};

export function Button({ variant = "secondary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT[variant]} ${className}`} />
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "teal" | "gold" | "good" | "bad" | "coral" | "magenta" }) {
  const TONE = {
    neutral: "bg-ink-3 text-dim border-line",
    teal: "bg-teal/10 text-teal border-teal/30",
    gold: "bg-gold/10 text-gold border-gold/30",
    good: "bg-good/10 text-good border-good/30",
    bad: "bg-bad/10 text-bad border-bad/30",
    coral: "bg-coral/10 text-coral border-coral/30",
    magenta: "bg-brand-magenta/10 text-brand-magenta border-brand-magenta/30",
  }[tone];
  return <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${TONE}`}>{children}</span>;
}

export function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="rounded-xl border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">{message}</p>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-body">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-dim">{hint}</span>}
    </label>
  );
}

export const inputClass = "w-full rounded-xl border border-line bg-ink px-3 py-2.5 text-sm text-snow placeholder:text-dim/60 outline-none focus:border-teal transition-colors";

const BAND_COLOR: Record<MasteryBand, string> = {
  unpractised: "bg-line",
  weak: "bg-bad",
  developing: "bg-gold",
  mastered: "bg-good",
};
const BAND_TONE: Record<MasteryBand, "neutral" | "bad" | "gold" | "good"> = {
  unpractised: "neutral", weak: "bad", developing: "gold", mastered: "good",
};

export function useBandLabel() {
  const L = useT().T.learn;
  return (b: MasteryBand) => ({
    unpractised: L.bandUnpractised, weak: L.bandWeak, developing: L.bandDeveloping, mastered: L.bandMastered,
  })[b];
}

export function MasteryRow({ name, mastery, attempts, isCore }: { name: string; mastery: number; attempts: number; isCore?: boolean }) {
  const band = masteryBand(mastery, attempts);
  const bandLabel = useBandLabel();
  const pct = Math.round(mastery * 100);
  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-sm text-snow min-w-0 truncate">
          {name}{isCore && <span className="text-teal ml-1" aria-hidden="true">•</span>}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <Badge tone={BAND_TONE[band]}>{bandLabel(band)}</Badge>
          <span className="text-xs font-mono text-body w-9 text-right">{attempts ? `${pct}%` : "—"}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-ink-3 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={name}>
        <div className={`h-full rounded-full transition-all duration-700 ${BAND_COLOR[band]}`} style={{ width: attempts ? `${pct}%` : "0%" }} />
      </div>
    </div>
  );
}

export function useReadinessLabel() {
  const L = useT().T.learn;
  return (s: ReadinessStatus) => ({ ready: L.readyReady, almost: L.readyAlmost, not_yet: L.readyNotYet })[s];
}

export const READINESS_TONE: Record<ReadinessStatus, "good" | "gold" | "bad"> = { ready: "good", almost: "gold", not_yet: "bad" };

/** Horizontal bars for a 5-bucket score distribution (0–19 … 80–100 %). */
export function DistributionBars({ buckets }: { buckets: number[] }) {
  const max = Math.max(1, ...buckets);
  const labels = ["0–19%", "20–39%", "40–59%", "60–79%", "80–100%"];
  const colors = ["bg-bad", "bg-coral", "bg-gold", "bg-teal", "bg-good"];
  return (
    <div className="space-y-2">
      {buckets.map((n, i) => (
        <div key={labels[i]} className="flex items-center gap-3 text-xs">
          <span className="w-16 shrink-0 text-dim font-mono">{labels[i]}</span>
          <div className="flex-1 h-5 rounded-md bg-ink-3 overflow-hidden">
            <div className={`h-full ${colors[i]} transition-all duration-700`} style={{ width: `${(n / max) * 100}%` }} />
          </div>
          <span className="w-6 text-right font-semibold text-snow">{n}</span>
        </div>
      ))}
    </div>
  );
}

export function pct(x: number | null | undefined): string {
  return x === null || x === undefined ? "—" : `${Math.round(x * 100)}%`;
}

export function formatDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === "zh" ? "zh-CN" : lang === "sw" ? "sw-TZ" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
}

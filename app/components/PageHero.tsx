import type { ReactNode } from "react";

type Accent = "teal" | "gold" | "magenta" | "coral";

const HERO_CLASS: Record<Accent, string> = {
  teal: "grad-hero-teal",
  gold: "grad-hero-gold",
  magenta: "grad-hero-magenta",
  coral: "grad-hero-coral",
};

const ICON_BOX: Record<Accent, string> = {
  teal: "bg-teal/15 border-teal/25 text-teal",
  gold: "bg-gold/15 border-gold/25 text-gold",
  magenta: "bg-brand-magenta/15 border-brand-magenta/25 text-brand-magenta",
  coral: "bg-coral/15 border-coral/25 text-coral",
};

const BLOB: Record<Accent, string> = {
  teal: "oklch(0.72 0.20 192)",
  gold: "oklch(0.82 0.17 72)",
  magenta: "oklch(0.62 0.21 340)",
  coral: "oklch(0.72 0.15 33)",
};

/**
 * Premium gradient page header — the shared "bento" hero used across app pages.
 * Pass an icon path (`d`), title, optional subtitle, accent colour, and any
 * trailing controls via `action`.
 */
export function PageHero({
  d, title, subtitle, accent = "teal", action,
}: {
  d: string;
  title: ReactNode;
  subtitle?: ReactNode;
  accent?: Accent;
  action?: ReactNode;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-line p-6 page-in ${HERO_CLASS[accent]}`}>
      {/* Decorative blobs */}
      <div className="absolute -top-10 -right-8 w-44 h-44 rounded-full opacity-[0.12] pointer-events-none"
        style={{ background: BLOB[accent] }} />
      <div className="absolute bottom-0 right-24 w-24 h-24 rounded-full opacity-[0.08] pointer-events-none"
        style={{ background: BLOB[accent] }} />

      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${ICON_BOX[accent]}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={d} />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-snow leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-sm text-dim mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

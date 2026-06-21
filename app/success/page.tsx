"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useT } from "@/app/lib/language-context";

// Local pack credit map (avoids importing the server checkout route into a client component).
const PACK_CREDITS: Record<string, number> = { starter: 20, scholar: 60, champion: 175 };
const PACK_LABELS: Record<string, string> = { starter: "Starter", scholar: "Scholar", champion: "Champion" };

export default function SuccessPage() {
  const { T } = useT();
  const S = T.success;
  const params = useSearchParams();

  const creditsParam = params.get("credits");
  const packParam = params.get("pack");

  const credits = creditsParam ? parseInt(creditsParam, 10) : null;
  const displayCredits = credits ?? (packParam ? PACK_CREDITS[packParam] ?? null : null);
  const displayPack = packParam ? PACK_LABELS[packParam] ?? packParam : null;

  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center px-4">
      {/* Glow blob */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[500px] rounded-full bg-teal/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Check icon */}
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-teal-deep/60 ring-1 ring-teal/40 shadow-xl shadow-teal/10">
          <svg className="h-10 w-10 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="font-display text-3xl font-extrabold text-snow mb-2">{S.title}</h1>
        <p className="text-dim text-sm mb-8">
          {displayCredits ? S.creditsReadyN(displayCredits) : S.message}
        </p>

        {/* Summary card */}
        <div className="rounded-2xl border border-line bg-ink-2/60 backdrop-blur-sm p-6 mb-8 text-left space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-deep border border-teal/40 shrink-0">
              <svg className="h-5 w-5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div>
              <p className="text-snow font-semibold text-sm">
                {displayPack ? `${displayPack} ${S.pack}` : S.pack}
              </p>
              {displayCredits && (
                <p className="text-xs text-dim">{S.creditsAddedN(displayCredits)}</p>
              )}
            </div>
          </div>

          <div className="h-px bg-line" />

          <div className="space-y-2.5">
            {[S.feat1, S.feat2, S.feat3].map((feature) => (
              <div key={feature} className="flex items-center gap-2.5">
                <svg className="h-4 w-4 text-good shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span className="text-sm text-body">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link href="/dashboard"
            className="block w-full rounded-xl bg-teal hover:opacity-90 text-ink font-semibold py-3 text-sm transition-opacity shadow-lg shadow-teal/20 text-center">
            {S.goDashboard}
          </Link>
          <Link href="/pricing"
            className="block w-full rounded-xl border border-line hover:border-line-2 text-body hover:text-snow font-medium py-3 text-sm transition-colors text-center">
            {S.buyMore}
          </Link>
        </div>

        <p className="mt-6 text-xs text-dim">{S.support}</p>
      </div>
    </div>
  );
}

"use client";

import { Header } from "@/app/components/Header";
import { PageHero } from "@/app/components/PageHero";
import { ExamGenerator } from "@/app/components/ExamGenerator";
import { useT } from "@/app/lib/language-context";

const SPARK = "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z";

export default function PredictPage() {
  const { T } = useT();
  const D = T.dashboard;

  return (
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7 pb-bottom-nav md:pb-10 space-y-5">
        <PageHero d={SPARK} accent="teal" title={D.pageHeading}
          subtitle="Upload past papers — get a new practice paper in the same format"
          action={
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-teal border border-teal/30 bg-teal/5 px-2.5 py-1.5 rounded-lg">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              AI-powered
            </span>
          }
        />
        <ExamGenerator />
      </main>
    </div>
  );
}

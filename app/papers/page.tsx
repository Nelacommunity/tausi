import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { Header } from "@/app/components/Header";
import type { ExamPaper } from "@/app/lib/types";
import { PaperActions } from "./PaperActions";
import { PapersHeader, PapersEmpty } from "./PapersHeader";

export const metadata: Metadata = {
  title: "Exam Library",
  description: "Your saved past papers. Reuse them to build practice papers with Tausi AI.",
  robots: { index: false, follow: false },
};

const TYPE_LABELS: Record<string, string> = {
  NECTA: "NECTA", KCSE: "KCSE", KCPE: "KCPE",
  IGCSE: "IGCSE", CAMBRIDGE_ALEVEL: "A-Level", IEB: "IEB", NSC: "NSC / Matric",
  WAEC: "WAEC", NECO: "NECO", ZIMSEC: "ZIMSEC", UNEB: "UNEB", UACE: "UACE",
  JC: "Junior Cert", OTHER: "Other",
};

const TYPE_COLORS: Record<string, string> = {
  NECTA:            "bg-teal-deep/60 text-teal border-teal-deep",
  KCSE:             "bg-good/10 text-good border-good/30",
  KCPE:             "bg-good/10 text-good border-good/30",
  IGCSE:            "bg-gold/10 text-gold border-gold/30",
  CAMBRIDGE_ALEVEL: "bg-gold/10 text-gold border-gold/30",
  IEB:              "bg-coral/10 text-coral border-coral/30",
  NSC:              "bg-coral/10 text-coral border-coral/30",
  WAEC:             "bg-teal/10 text-teal/80 border-teal/20",
  NECO:             "bg-teal/10 text-teal/80 border-teal/20",
  ZIMSEC:           "bg-ink-3 text-body border-line",
  UNEB:             "bg-brand-magenta/10 text-brand-magenta border-brand-magenta/30",
  UACE:             "bg-brand-magenta/10 text-brand-magenta border-brand-magenta/30",
};

function TypeBadge({ type }: { type: string }) {
  const color = TYPE_COLORS[type] ?? "bg-ink-3 text-dim border-line";
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function PapersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: papers } = await supabase
    .from("exam_papers")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const list = (papers ?? []) as ExamPaper[];

  return (
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7 pb-bottom-nav md:pb-10 space-y-5">

        {/* ── Page hero ───────────────────────────────────── */}
        <PapersHeader />

        {list.length === 0 ? (
          <PapersEmpty />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((paper, i) => (
              <div key={paper.id}
                className={`group bg-ink-2/50 border border-line rounded-2xl p-5 flex flex-col gap-4 hover:border-coral/30 hover:bg-ink-2 transition-all card-enter card-enter-${Math.min(i + 1, 5)}`}>

                {/* Top: badge + year */}
                <div className="flex items-center justify-between gap-2">
                  <TypeBadge type={paper.exam_type} />
                  <span className="text-xs font-bold text-dim bg-ink-3 border border-line rounded-lg px-2.5 py-1">{paper.year}</span>
                </div>

                {/* Name + subject */}
                <div className="flex-1">
                  <p className="text-sm font-bold text-snow leading-snug mb-1">{paper.name}</p>
                  <p className="text-xs text-dim">{paper.subject}</p>
                </div>

                {/* Files + date */}
                <div className="flex items-center justify-between text-xs text-dim border-t border-line/60 pt-3">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    {paper.original_filenames.length} file{paper.original_filenames.length !== 1 ? "s" : ""}
                  </span>
                  <span>{formatDate(paper.created_at)}</span>
                </div>

                {/* Actions */}
                <PaperActions paperId={paper.id} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { Header } from "@/app/components/Header";
import type { ExamPaper } from "@/app/lib/types";
import { PaperActions } from "./PaperActions";
import { PapersHeader, PapersEmpty } from "./PapersHeader";

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
    <div className="min-h-screen bg-ink text-snow">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        <PapersHeader />

        {list.length === 0 ? (
          <PapersEmpty />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map(paper => (
              <div key={paper.id}
                className="bg-ink-2 border border-line rounded-2xl p-5 flex flex-col gap-3 hover:border-line-2 transition-colors">

                {/* Top: badge + year */}
                <div className="flex items-center justify-between gap-2">
                  <TypeBadge type={paper.exam_type} />
                  <span className="text-sm font-bold text-body">{paper.year}</span>
                </div>

                {/* Name + subject */}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-snow leading-snug mb-0.5">{paper.name}</p>
                  <p className="text-xs text-dim">{paper.subject}</p>
                </div>

                {/* Files + date */}
                <div className="flex items-center justify-between text-xs text-dim">
                  <span>{paper.original_filenames.length} file{paper.original_filenames.length !== 1 ? "s" : ""}</span>
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

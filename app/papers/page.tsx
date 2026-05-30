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
  NECTA: "bg-blue-950 text-blue-400 border-blue-800",
  KCSE:  "bg-emerald-950 text-emerald-400 border-emerald-800",
  KCPE:  "bg-emerald-950 text-emerald-400 border-emerald-800",
  IGCSE: "bg-violet-950 text-violet-400 border-violet-800",
  CAMBRIDGE_ALEVEL: "bg-violet-950 text-violet-400 border-violet-800",
  IEB:   "bg-amber-950 text-amber-400 border-amber-800",
  NSC:   "bg-amber-950 text-amber-400 border-amber-800",
  WAEC:  "bg-orange-950 text-orange-400 border-orange-800",
  NECO:  "bg-orange-950 text-orange-400 border-orange-800",
  ZIMSEC:"bg-cyan-950 text-cyan-400 border-cyan-800",
  UNEB:  "bg-pink-950 text-pink-400 border-pink-800",
  UACE:  "bg-pink-950 text-pink-400 border-pink-800",
};

function TypeBadge({ type }: { type: string }) {
  const color = TYPE_COLORS[type] ?? "bg-gray-800 text-gray-400 border-gray-700";
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
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        <PapersHeader />

        {list.length === 0 ? (
          <PapersEmpty />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map(paper => (
              <div key={paper.id}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-3 hover:border-gray-700 transition-colors">

                {/* Top: badge + year */}
                <div className="flex items-center justify-between gap-2">
                  <TypeBadge type={paper.exam_type} />
                  <span className="text-sm font-bold text-gray-300">{paper.year}</span>
                </div>

                {/* Name + subject */}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white leading-snug mb-0.5">{paper.name}</p>
                  <p className="text-xs text-gray-500">{paper.subject}</p>
                </div>

                {/* Files + date */}
                <div className="flex items-center justify-between text-xs text-gray-600">
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

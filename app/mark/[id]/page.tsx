import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { Header } from "@/app/components/Header";
import { ExamOutput } from "@/app/components/ExamOutput";
import type { MarkingSession } from "@/app/lib/types";

export const metadata: Metadata = {
  title: "Marking Result",
  description: "Your AI-graded marking result — score, grade and per-question feedback from Tausi.",
  robots: { index: false, follow: false },
};

function GradeDisplay({ pct, total, max }: { pct: number; total: number; max: number }) {
  const grade = pct >= 75 ? "A" : pct >= 65 ? "B" : pct >= 50 ? "C" : pct >= 40 ? "D" : "F";
  const label = pct >= 75 ? "Excellent" : pct >= 65 ? "Good" : pct >= 50 ? "Average" : pct >= 40 ? "Below Average" : "Fail";
  const colors: Record<string,string> = { A:"text-emerald-400 border-emerald-800 bg-emerald-950/40", B:"text-blue-400 border-blue-800 bg-blue-950/40", C:"text-amber-400 border-amber-800 bg-amber-950/40", D:"text-orange-400 border-orange-800 bg-orange-950/40", F:"text-red-400 border-red-800 bg-red-950/40" };
  const barColor: Record<string,string> = { A:"bg-emerald-500", B:"bg-blue-500", C:"bg-amber-500", D:"bg-orange-500", F:"bg-red-500" };

  return (
    <div className={`rounded-2xl border p-6 ${colors[grade]}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-4xl font-extrabold mb-1">{total} <span className="text-xl font-normal text-current/70">/ {max} marks</span></div>
          <div className="text-sm font-semibold">{grade} — {label}</div>
        </div>
        <div className="text-6xl font-black opacity-30 select-none">{grade}</div>
      </div>
      <div className="h-2 rounded-full bg-black/20 overflow-hidden">
        <div className={`h-full rounded-full ${barColor[grade]} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm mt-1.5 opacity-70">{pct}%</p>
    </div>
  );
}

export default async function MarkingResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data, error } = await supabase
    .from("marking_sessions").select("*").eq("id", id).eq("user_id", user.id).single();

  if (error || !data) notFound();
  const session = data as MarkingSession;

  const feedback = session.raw_feedback.replace(/<!--SESSION_ID:[^-]+-->/g, "");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/mark" className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">{session.title}</h1>
            <p className="text-xs text-gray-600">{new Date(session.created_at).toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}</p>
          </div>
        </div>

        {/* Score card */}
        {session.total_marks !== null && session.max_marks !== null && session.percentage !== null && (
          <GradeDisplay pct={Number(session.percentage)} total={session.total_marks} max={session.max_marks} />
        )}

        {/* Full feedback */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
          <ExamOutput content={feedback} />
        </div>

        {/* Answer files */}
        {session.original_filenames?.length > 0 && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/30 px-4 py-3">
            <p className="text-xs text-gray-500 mb-2">Answer sheet(s) marked:</p>
            {session.original_filenames.map(name => (
              <p key={name} className="text-xs text-gray-400">{name}</p>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

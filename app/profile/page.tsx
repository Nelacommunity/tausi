"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Header } from "@/app/components/Header";
import { useT } from "@/app/lib/language-context";
import type { Profile } from "@/app/lib/types";
import { CREDIT_COSTS } from "@/app/lib/usage";

interface Stats { exams: number; markings: number; studies: number }

function StatCard({ value, label, icon }: { value: number; label: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-ink-2/50 p-4 text-center">
      <div className="text-2xl font-bold text-snow mb-0.5">{value}</div>
      <div className="text-xs text-dim flex items-center justify-center gap-1">{icon}{label}</div>
    </div>
  );
}

export default function ProfilePage() {
  const { T } = useT();
  const P = T.profile;
  const [profile, setProfile]     = useState<Profile | null>(null);
  const [stats, setStats]         = useState<Stats>({ exams: 0, markings: 0, studies: 0 });
  const [credits, setCredits]     = useState<number>(0);
  const [loading, setLoading]     = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft]     = useState("");
  const [savingName, setSavingName]   = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(({ profile: p, stats: s, credits: c }) => {
        setProfile(p);
        if (s) setStats(s);
        if (typeof c === "number") setCredits(c);
        else if (p?.credits) setCredits(p.credits as number);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const saveName = async () => {
    if (!nameDraft.trim()) { setEditingName(false); return; }
    setSavingName(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: nameDraft.trim() }),
    });
    setProfile((p) => p ? { ...p, full_name: nameDraft.trim() } : p);
    setEditingName(false);
    setSavingName(false);
  };

  const initials = (profile?.full_name || profile?.email || "?").slice(0, 2).toUpperCase();

  if (loading) return (
    <div className="min-h-screen bg-ink">
      <Header />
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  const lowCredits = credits <= 5;

  return (
    <div className="min-h-screen bg-ink text-snow">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Identity card */}
        <div className="rounded-2xl border border-line bg-ink-2/50 p-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-teal-deep border border-teal/30 flex items-center justify-center text-2xl font-bold text-teal shrink-0 select-none">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <form onSubmit={(e) => { e.preventDefault(); saveName(); }} className="flex items-center gap-2 mb-1">
                  <input ref={nameInputRef} value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={saveName} disabled={savingName}
                    className="bg-ink border border-teal rounded-lg px-3 py-1 text-sm text-snow outline-none w-48" />
                </form>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-lg font-bold text-snow">
                    {profile?.full_name || P.setName}
                  </h1>
                  <button onClick={() => { setNameDraft(profile?.full_name || ""); setEditingName(true); }}
                    className="text-dim hover:text-body transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </button>
                </div>
              )}
              <p className="text-sm text-dim mb-3">{profile?.email}</p>
              <div className="flex items-center gap-3">
                {profile?.created_at && (
                  <span className="text-xs text-dim">
                    {P.joined} {new Date(profile.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Credits balance */}
        <div className={`rounded-2xl border p-6 ${lowCredits ? "border-amber-700/60 bg-amber-950/20" : "border-teal/40 bg-teal-deep/20"}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-body mb-1">Credit Balance</h2>
              <div className="flex items-baseline gap-2">
                <span className={`font-display text-5xl font-bold ${lowCredits ? "text-amber-400" : "text-teal"}`}>
                  {credits}
                </span>
                <span className="text-body text-lg">credits</span>
              </div>
              {lowCredits && (
                <p className="text-xs text-amber-400 mt-1">Running low — consider buying more credits</p>
              )}
            </div>
            <Link href="/pricing"
              className="flex items-center gap-2 rounded-xl border border-teal/60 hover:border-teal bg-teal-deep/40 hover:bg-teal-deep/60 text-teal font-semibold px-4 py-2.5 text-sm transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Buy credits
            </Link>
          </div>

          {/* Quick cost reference */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            {([
              { label: "Exam Predict", cost: CREDIT_COSTS.exam_prediction },
              { label: "AI Mark",      cost: CREDIT_COSTS.ai_marking      },
              { label: "Chat msg",     cost: CREDIT_COSTS.exam_chat        },
              { label: "AI Write",     cost: CREDIT_COSTS.ai_writer        },
            ] as const).map(({ label, cost }) => (
              <div key={label} className="rounded-lg border border-line/60 bg-ink-2/40 px-3 py-2 text-center">
                <p className="text-xs text-dim">{label}</p>
                <p className="text-sm font-bold text-body">{cost} cr</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div>
          <h2 className="text-sm font-semibold text-dim mb-3">{P.allTimeStats}</h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard value={stats.exams} label={P.predictedExams} icon={
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            } />
            <StatCard value={stats.markings} label={P.aiMarkings} icon={
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            } />
            <StatCard value={stats.studies} label={P.studySessions} icon={
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            } />
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/dashboard",  label: T.nav.myExams,   color: "text-teal"  },
            { href: "/mark",       label: T.nav.aiMarker,  color: "text-body"  },
            { href: "/study",      label: T.nav.studyRoom, color: "text-body"  },
            { href: "/pricing",    label: "Buy credits",   color: "text-gold"  },
          ].map(({ href, label, color }) => (
            <Link key={href} href={href}
              className="flex items-center justify-center rounded-xl border border-line bg-ink-2/50 hover:bg-ink-2 hover:border-line-2 py-3 text-xs font-medium transition-all">
              <span className={color}>{label}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

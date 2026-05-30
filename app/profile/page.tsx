"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Header } from "@/app/components/Header";
import { useT } from "@/app/lib/language-context";
import type { Profile } from "@/app/lib/types";
import { FREE_LIMITS } from "@/app/lib/types";

interface Stats { exams: number; markings: number; studies: number }

function UsageBar({ label, used, limit, color }: { label: string; used: number; limit: number; color: string }) {
  const pct = limit <= 0 ? 100 : Math.min((used / limit) * 100, 100);
  const isUnlimited = limit <= 0;
  const nearLimit = !isUnlimited && pct >= 80;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className={nearLimit ? "text-amber-400 font-medium" : "text-gray-500"}>
          {isUnlimited ? `${used} used (unlimited)` : `${used} / ${limit}`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isUnlimited ? "bg-indigo-500" : nearLimit ? "bg-amber-500" : color
          }`}
          style={{ width: `${isUnlimited ? 40 : pct}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({ value, label, icon }: { value: number; label: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center">
      <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-xs text-gray-500 flex items-center justify-center gap-1">{icon}{label}</div>
    </div>
  );
}

export default function ProfilePage() {
  const { T } = useT();
  const P = T.profile;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ exams: 0, markings: 0, studies: 0 });
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(({ profile, stats }) => { setProfile(profile); if (stats) setStats(stats); })
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

  const isPremium = profile?.tier === "premium" && profile?.subscription_status === "active";
  const initials = (profile?.full_name || profile?.email || "?").slice(0, 2).toUpperCase();
  const currentMonth = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

  if (loading) return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Identity card */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shrink-0 select-none">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <form onSubmit={(e) => { e.preventDefault(); saveName(); }} className="flex items-center gap-2 mb-1">
                  <input ref={nameInputRef} value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={saveName} disabled={savingName}
                    className="bg-gray-800 border border-indigo-600 rounded-lg px-3 py-1 text-sm text-white outline-none w-48" />
                </form>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-lg font-bold text-white">
                    {profile?.full_name || P.setName}
                  </h1>
                  <button onClick={() => { setNameDraft(profile?.full_name || ""); setEditingName(true); }}
                    className="text-gray-600 hover:text-gray-400 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </button>
                </div>
              )}
              <p className="text-sm text-gray-500 mb-3">{profile?.email}</p>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${
                  isPremium
                    ? "bg-amber-950/60 border-amber-700 text-amber-300"
                    : "bg-gray-800 border-gray-700 text-gray-400"
                }`}>
                  {isPremium ? (
                    <>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Premium
                    </>
                  ) : "Free Plan"}
                </span>
                {profile?.created_at && (
                  <span className="text-xs text-gray-600">
                    {P.joined} {new Date(profile.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
            </div>
            {!isPremium && (
              <Link href="/pricing"
                className="shrink-0 flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white px-4 py-2 rounded-lg transition-all">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {P.upgrade}
              </Link>
            )}
          </div>
        </div>

        {/* Monthly usage */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-200">{P.usageHeading} — {currentMonth}</h2>
            {!isPremium && (
              <Link href="/pricing" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                {P.upgradeLink}
              </Link>
            )}
          </div>
          <div className="space-y-4">
            <UsageBar label={P.predictedExams} used={profile?.predictions_used ?? 0}
              limit={isPremium ? -1 : FREE_LIMITS.predictions} color="bg-indigo-500" />
            <UsageBar label={T.nav.examLibrary} used={profile?.marking_schemes_used ?? 0}
              limit={isPremium ? -1 : FREE_LIMITS.marking_schemes} color="bg-emerald-500" />
            <UsageBar label={P.aiMarkings} used={profile?.ai_markings_used ?? 0}
              limit={isPremium ? -1 : FREE_LIMITS.ai_markings} color="bg-purple-500" />
            <UsageBar label={P.studySessions} used={profile?.study_sessions_used ?? 0}
              limit={isPremium ? -1 : FREE_LIMITS.study_sessions} color="bg-cyan-500" />
          </div>
          {!isPremium && (
            <p className="text-xs text-gray-600 mt-4">{P.usageResets}</p>
          )}
        </div>

        {/* Stats */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">{P.allTimeStats}</h2>
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
            { href: "/dashboard", label: T.nav.myExams, color: "text-indigo-400" },
            { href: "/mark", label: T.nav.aiMarker, color: "text-purple-400" },
            { href: "/study", label: T.nav.studyRoom, color: "text-cyan-400" },
            { href: "/pricing", label: isPremium ? P.managePlan : P.upgrade, color: "text-amber-400" },
          ].map(({ href, label, color }) => (
            <Link key={href} href={href}
              className="flex items-center justify-center rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-900 hover:border-gray-600 py-3 text-xs font-medium transition-all">
              <span className={color}>{label}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

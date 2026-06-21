"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Header } from "@/app/components/Header";
import { useT } from "@/app/lib/language-context";
import type { Profile } from "@/app/lib/types";
import { CREDIT_COSTS } from "@/app/lib/usage";

interface Stats { exams: number; markings: number; studies: number }

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
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="space-y-4">
          <div className="h-8 w-48 skeleton" />
          <div className="h-32 rounded-2xl skeleton" />
          <div className="h-24 rounded-2xl skeleton" />
          <div className="grid grid-cols-3 gap-3">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl skeleton" />)}
          </div>
        </div>
      </div>
    </div>
  );

  const lowCredits = credits <= 5;

  return (
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-7 pb-bottom-nav md:pb-10 space-y-5">

        {/* ── Identity hero ──────────────────────────────── */}
        <div className="grad-hero-teal relative overflow-hidden rounded-2xl border border-line p-6 sm:p-8 page-in">
          <div className="absolute -top-10 -right-8 w-44 h-44 rounded-full opacity-[0.12] pointer-events-none" style={{ background: "oklch(0.72 0.20 192)" }} />
          <div className="relative flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-teal/15 border border-teal/30 flex items-center justify-center text-2xl font-bold text-teal shrink-0 select-none">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <form onSubmit={(e) => { e.preventDefault(); saveName(); }} className="flex items-center gap-2 mb-1">
                  <input ref={nameInputRef} value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={saveName} disabled={savingName}
                    className="bg-ink border border-teal rounded-xl px-3 py-2 text-sm text-snow outline-none w-52" />
                </form>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="font-display text-xl font-bold text-snow">{profile?.full_name || P.setName}</h1>
                  <button onClick={() => { setNameDraft(profile?.full_name || ""); setEditingName(true); }}
                    className="p-1 rounded-md text-dim hover:text-body hover:bg-ink-3 transition-colors cursor-pointer">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </button>
                </div>
              )}
              <p className="text-sm text-body">{profile?.email}</p>
              {profile?.created_at && (
                <p className="text-xs text-dim mt-2">
                  {P.joined} {new Date(profile.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Credits balance ────────────────────────────── */}
        <div className={`rounded-2xl border p-6 card-enter card-enter-1 ${lowCredits ? "border-gold/40 bg-gold/5" : "border-teal/30 bg-teal/5"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-dim uppercase tracking-widest mb-3">Credit Balance</p>
              <div className="flex items-baseline gap-2">
                <span className={`font-display text-6xl font-bold leading-none ${lowCredits ? "text-gold" : "text-teal"}`}>
                  {credits}
                </span>
                <span className="text-body text-lg">credits</span>
              </div>
              {lowCredits && (
                <p className="text-xs text-gold mt-2 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  Running low — top up to keep working
                </p>
              )}
            </div>
            <Link href="/pricing"
              className="flex items-center gap-2 rounded-xl border border-teal/50 hover:border-teal bg-teal/10 hover:bg-teal/15 text-teal font-bold px-4 py-2.5 text-sm transition-all shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Buy credits
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6 pt-6 border-t border-line/40">
            {([
              { label: "Exam Predict", cost: CREDIT_COSTS.exam_prediction },
              { label: "AI Mark",      cost: CREDIT_COSTS.ai_marking      },
              { label: "Chat msg",     cost: CREDIT_COSTS.exam_chat        },
              { label: "AI Write",     cost: CREDIT_COSTS.ai_writer        },
            ] as const).map(({ label, cost }) => (
              <div key={label} className="rounded-xl border border-line/50 bg-ink-2/40 px-3 py-2.5 text-center">
                <p className="text-[11px] text-dim mb-1">{label}</p>
                <p className="text-sm font-bold text-body">{cost} <span className="text-dim font-normal">cr</span></p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Stats ─────────────────────────────────────── */}
        <div className="card-enter card-enter-2">
          <p className="text-xs font-bold text-dim uppercase tracking-widest mb-3">{P.allTimeStats}</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: stats.exams, label: P.predictedExams, accent: "text-coral bg-coral/10 border-coral/20", d: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" },
              { value: stats.markings, label: P.aiMarkings, accent: "text-teal bg-teal/10 border-teal/20", d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
              { value: stats.studies, label: P.studySessions, accent: "text-gold bg-gold/10 border-gold/20", d: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" },
            ].map(({ value, label, accent, d }) => (
              <div key={label} className="rounded-2xl border border-line bg-ink-2/50 p-4 text-center">
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center mx-auto mb-3 ${accent}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-snow mb-0.5">{value}</div>
                <div className="text-[11px] text-dim">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quick links ───────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 card-enter card-enter-3">
          {[
            { href: "/dashboard",  label: T.nav.myExams,      icon: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25", teal: true },
            { href: "/mark",       label: T.nav.aiMarker,     icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
            { href: "/study",      label: T.nav.studyRoom,    icon: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" },
            { href: "/pricing",    label: "Buy credits",      icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75", gold: true },
            { href: "/purchases",  label: "Purchase history", icon: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" },
            { href: "/discover",   label: T.nav.discover,     icon: "M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" },
          ].map(({ href, label, icon, teal, gold }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 rounded-xl border border-line bg-ink-2/50 hover:bg-ink-2 hover:border-line-2 px-4 py-3.5 text-sm font-medium transition-all cursor-pointer group">
              <svg className={`w-4 h-4 shrink-0 ${teal ? "text-teal" : gold ? "text-gold" : "text-dim group-hover:text-body"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
              </svg>
              <span className={teal ? "text-teal" : gold ? "text-gold" : "text-body"}>{label}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

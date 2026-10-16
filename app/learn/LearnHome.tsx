"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/app/components/Header";
import { PageHero } from "@/app/components/PageHero";
import { useT } from "@/app/lib/language-context";
import type { LevelProgress, SessionResult } from "@/app/lib/learning/progress";
import type { CurriculumNode } from "@/app/lib/learning/types";
import { api } from "@/app/components/learn/api";
import { Badge, Button, Card, ErrorNote, formatDate, inputClass, MasteryRow, pct, READINESS_TONE, SectionTitle, Spinner, useReadinessLabel } from "@/app/components/learn/ui";

export const LEARN_ICON = "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6";

export function LevelReadiness({ level, practiceHref }: { level: LevelProgress; practiceHref?: string }) {
  const L = useT().T.learn;
  const readinessLabel = useReadinessLabel();
  const r = level.readiness;
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-dim">{level.curriculumName}</p>
          <h3 className="font-display text-xl font-bold">{L.readinessFor(level.levelName)}</h3>
        </div>
        <Badge tone={READINESS_TONE[r.status]}>{readinessLabel(r.status)} · {pct(r.score)}</Badge>
      </div>
      <p className="text-sm text-body">{L.readinessSentence(level.levelName, readinessLabel(r.status))} {L.coverage(Math.round(r.coverage * 100))}</p>
      <div className="rounded-xl border border-bad/20 bg-bad/[0.04] p-3">
        <p className="text-xs font-bold text-bad uppercase tracking-widest mb-1.5">{L.atRisk}</p>
        {r.atRisk.length ? (
          <div className="flex flex-wrap gap-1.5">
            {r.atRisk.map((k) => <Badge key={k.kpId} tone="bad">{k.name} · {pct(k.mastery)}</Badge>)}
          </div>
        ) : <p className="text-sm text-body">{L.noAtRisk}</p>}
      </div>
      {practiceHref && (
        <Link href={practiceHref} className="inline-flex items-center justify-center rounded-xl bg-gold text-on-gold font-semibold px-4 py-2.5 text-sm hover:bg-gold-hover w-full sm:w-auto">
          {L.practiceWeak}
        </Link>
      )}
      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold text-teal list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform">›</span> {L.topics} ({level.kps.length})
        </summary>
        <div className="mt-2 divide-y divide-line/50">
          {[...level.kps].sort((a, b) => (a.attempts ? a.mastery : 2) - (b.attempts ? b.mastery : 2)).map((k) => (
            <MasteryRow key={k.kpId} name={k.name} mastery={k.mastery} attempts={k.attempts} isCore={k.isCore} />
          ))}
        </div>
      </details>
    </Card>
  );
}

export function LearnHome() {
  const { T, lang } = useT();
  const L = T.learn;
  const [overview, setOverview] = useState<{ levels: LevelProgress[]; sessions: SessionResult[] } | null>(null);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [curricula, setCurricula] = useState<CurriculumNode[]>([]);
  const [code, setCode] = useState("");
  const [joinMsg, setJoinMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    api<{ levels: LevelProgress[]; sessions: SessionResult[] }>("/api/learn/overview").then(setOverview).catch((e: Error) => setError(e.message));
    api<{ member: { id: string; name: string }[] }>("/api/classes").then((d) => setClasses(d.member)).catch(() => {});
    api<CurriculumNode[]>("/api/curricula").then(setCurricula).catch(() => {});
  }, []);

  const joinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoining(true); setError(null); setJoinMsg(null);
    try {
      const c = await api<{ id: string; name: string }>("/api/classes/join", { method: "POST", json: { code } });
      setJoinMsg(L.joinedClass(c.name));
      setCode("");
      const d = await api<{ member: { id: string; name: string }[] }>("/api/classes");
      setClasses(d.member);
    } catch (err) { setError((err as Error).message); }
    setJoining(false);
  };

  const practised = new Set(overview?.levels.map((l) => l.levelId));
  const otherLevels = curricula.flatMap((c) => c.levels.map((l) => ({ ...l, curriculumName: c.name }))).filter((l) => !practised.has(l.id));

  return (
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7 pb-bottom-nav md:pb-10 space-y-6">
        <PageHero d={LEARN_ICON} title={L.learnTitle} subtitle={L.learnSub} accent="gold"
          action={<Link href="/join" className="hidden sm:inline-flex rounded-xl bg-teal text-ink font-semibold px-4 py-2.5 text-sm">{L.joinLive}</Link>} />
        <ErrorNote message={error} />

        <div className="grid lg:grid-cols-3 gap-5 items-start">
          <section className="lg:col-span-2 space-y-4">
            {overview === null ? <div className="flex justify-center py-10 text-dim"><Spinner className="w-6 h-6" /></div>
              : overview.levels.length === 0 ? <Card><p className="text-sm text-body">{L.noActivity}</p></Card>
              : overview.levels.map((l) => <LevelReadiness key={l.levelId} level={l} practiceHref={`/learn/practice/${l.levelId}`} />)}

            {otherLevels.length > 0 && (
              <div>
                <SectionTitle>{L.pickLevel}</SectionTitle>
                <div className="grid sm:grid-cols-2 gap-2">
                  {otherLevels.map((l) => (
                    <Link key={l.id} href={`/learn/practice/${l.id}`} className="rounded-xl border border-line bg-ink-2 hover:border-line-2 px-4 py-3 transition-colors">
                      <p className="text-sm font-semibold">{l.name}</p>
                      <p className="text-xs text-dim truncate">{l.curriculumName} · {L.startPractice} →</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <Link href="/join" className="sm:hidden flex justify-center rounded-xl bg-teal text-ink font-semibold px-4 py-3 text-sm">{L.joinLive}</Link>
            <Card>
              <SectionTitle>{L.joinClass}</SectionTitle>
              <form onSubmit={joinClass} className="flex gap-2">
                <input className={`${inputClass} font-mono uppercase tracking-widest`} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={L.classCodePh} maxLength={12} />
                <Button type="submit" variant="teal" disabled={joining || code.length < 4}>{joining ? <Spinner /> : L.join}</Button>
              </form>
              {joinMsg && <p className="text-xs text-good mt-2">{joinMsg}</p>}
              {classes.length > 0 && (
                <ul className="mt-4 space-y-1.5">
                  {classes.map((c) => <li key={c.id} className="text-sm text-body">• {c.name}</li>)}
                </ul>
              )}
            </Card>
            <Card>
              <SectionTitle>{L.recentResults}</SectionTitle>
              {!overview?.sessions.length ? <p className="text-sm text-dim">—</p> : (
                <ul className="space-y-2">
                  {overview.sessions.map((s) => (
                    <li key={s.code}>
                      <Link href={`/play/${s.code}`} className="flex items-center justify-between gap-2 text-sm hover:text-teal">
                        <span className="min-w-0">
                          <span className="block truncate">{s.title}</span>
                          <span className="block text-[11px] text-dim">{s.mode === "exam" ? L.modeExam : L.modeGame} · {formatDate(s.date, lang)}</span>
                        </span>
                        <span className="font-mono font-semibold shrink-0">{s.correct}/{s.total}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}

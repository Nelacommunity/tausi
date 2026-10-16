"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/app/components/Header";
import { PageHero } from "@/app/components/PageHero";
import { useT } from "@/app/lib/language-context";
import { useSession } from "@/app/lib/session-context";
import type { AssessmentSummary, CurriculumNode } from "@/app/lib/learning/types";
import { api } from "@/app/components/learn/api";
import { ResourceList } from "@/app/components/learn/ResourceList";
import { ResourceUpload } from "@/app/components/learn/ResourceUpload";
import type { ResourceSummary } from "@/app/lib/learning/types";
import { Badge, Button, Card, ErrorNote, Field, formatDate, inputClass, SectionTitle, Spinner } from "@/app/components/learn/ui";

interface ClassRow { id: string; name: string; code: string; memberCount: number; curriculumName: string | null }
interface SessionRow { id: string; code: string; mode: "exam" | "game"; status: string; createdAt: string; title: string; className: string | null; participants: number }

export const TEACH_ICON = "M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5";

export function TeachHome() {
  const { T, lang } = useT();
  const L = T.learn;
  const router = useRouter();
  const { role, setRole } = useSession();

  const [curricula, setCurricula] = useState<CurriculumNode[]>([]);
  const [exams, setExams] = useState<AssessmentSummary[] | null>(null);
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [resources, setResources] = useState<ResourceSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [curriculumId, setCurriculumId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [creating, setCreating] = useState(false);
  const [className, setClassName] = useState("");
  const [creatingClass, setCreatingClass] = useState(false);
  const [switching, setSwitching] = useState(false);

  const loadResources = useCallback(() => {
    api<ResourceSummary[]>("/api/resources").then((r) => setResources(r.filter((x) => x.isOwner))).catch(() => setResources([]));
  }, []);

  const load = useCallback(() => {
    api<CurriculumNode[]>("/api/curricula").then((c) => {
      setCurricula(c);
      if (c[0]) { setCurriculumId((v) => v || c[0].id); setLevelId((v) => v || c[0].levels[0]?.id || ""); }
    }).catch((e: Error) => setError(e.message));
    api<AssessmentSummary[]>("/api/assessments").then(setExams).catch(() => setExams([]));
    api<{ teaching: ClassRow[] }>("/api/classes").then((d) => setClasses(d.teaching)).catch(() => setClasses([]));
    api<SessionRow[]>("/api/live").then(setSessions).catch(() => setSessions([]));
    loadResources();
  }, [loadResources]);

  useEffect(() => { if (role === "teacher") load(); }, [role, load]);

  const becomeTeacher = async () => {
    setSwitching(true);
    try {
      await api("/api/profile", { method: "PATCH", json: { role: "teacher" } });
      setRole("teacher");
    } catch (e) { setError((e as Error).message); }
    setSwitching(false);
  };

  const createExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !levelId) return;
    setCreating(true); setError(null);
    try {
      const { id } = await api<{ id: string }>("/api/assessments", { method: "POST", json: { title, levelId } });
      router.push(`/teach/assessments/${id}`);
    } catch (err) { setError((err as Error).message); setCreating(false); }
  };

  const createClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;
    setCreatingClass(true); setError(null);
    try {
      await api("/api/classes", { method: "POST", json: { name: className, curriculumId: curriculumId || null } });
      setClassName("");
      const d = await api<{ teaching: ClassRow[] }>("/api/classes");
      setClasses(d.teaching);
    } catch (err) { setError((err as Error).message); }
    setCreatingClass(false);
  };

  const curriculum = curricula.find((c) => c.id === curriculumId);
  const statusLabel = (s: string) => (s === "finished" ? L.statusEnded : s === "lobby" ? L.statusLobby : L.statusLive);

  return (
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7 pb-bottom-nav md:pb-10 space-y-6">
        <PageHero d={TEACH_ICON} title={L.teachTitle} subtitle={L.teachSub} accent="teal" />
        <ErrorNote message={error} />

        {role === null && <div className="flex justify-center py-10 text-dim"><Spinner className="w-6 h-6" /></div>}

        {role === "student" && (
          <Card className="text-center py-10 space-y-3">
            <h2 className="font-display text-xl font-bold">{L.becomeTeacherTitle}</h2>
            <p className="text-sm text-body max-w-md mx-auto">{L.becomeTeacherBody}</p>
            <Button variant="primary" onClick={becomeTeacher} disabled={switching}>
              {switching && <Spinner />} {L.becomeTeacherBtn}
            </Button>
          </Card>
        )}

        {role === "teacher" && (
          <div className="grid lg:grid-cols-3 gap-5">
            {/* Practice exams */}
            <section className="lg:col-span-2 space-y-4">
              <Card>
                <SectionTitle>{L.newExam}</SectionTitle>
                <form onSubmit={createExam} className="grid sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Field label={L.examTitle}>
                      <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={L.examTitlePh} maxLength={200} required />
                    </Field>
                  </div>
                  <Field label={L.curriculum}>
                    <select className={inputClass} value={curriculumId} onChange={(e) => {
                      setCurriculumId(e.target.value);
                      setLevelId(curricula.find((c) => c.id === e.target.value)?.levels[0]?.id ?? "");
                    }}>
                      {curricula.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                  <Field label={L.level}>
                    <select className={inputClass} value={levelId} onChange={(e) => setLevelId(e.target.value)}>
                      {curriculum?.levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Button type="submit" variant="primary" disabled={creating || !title.trim() || !levelId} className="w-full sm:w-auto">
                      {creating && <Spinner />} {L.create}
                    </Button>
                  </div>
                </form>
              </Card>

              <div>
                <SectionTitle>{L.practiceExams}</SectionTitle>
                {exams === null ? <Spinner /> : exams.length === 0 ? (
                  <Card><p className="text-sm text-dim">{L.noExams}</p></Card>
                ) : (
                  <ul className="space-y-2">
                    {exams.map((a) => (
                      <li key={a.id}>
                        <Link href={`/teach/assessments/${a.id}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink-2 hover:border-line-2 px-4 py-3 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-snow truncate">{a.title}</p>
                            <p className="text-xs text-dim mt-0.5">{a.levelName} · {L.questionsN(a.itemCount)} · {formatDate(a.createdAt, lang)}</p>
                          </div>
                          <Badge tone={a.status === "published" ? "good" : "gold"}>{a.status === "published" ? L.published : L.draft}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <SectionTitle>{L.liveSessions}</SectionTitle>
                {sessions === null ? <Spinner /> : sessions.length === 0 ? (
                  <Card><p className="text-sm text-dim">{L.noSessions}</p></Card>
                ) : (
                  <ul className="space-y-2">
                    {sessions.map((s) => (
                      <li key={s.id}>
                        <Link href={s.status === "finished" ? `/teach/sessions/${s.id}` : `/teach/live/${s.code}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink-2 hover:border-line-2 px-4 py-3 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-snow truncate">{s.title}</p>
                            <p className="text-xs text-dim mt-0.5">
                              {s.mode === "exam" ? L.modeExam : L.modeGame} · {L.playersN(s.participants)}{s.className ? ` · ${s.className}` : ""} · {formatDate(s.createdAt, lang)}
                            </p>
                          </div>
                          <Badge tone={s.status === "finished" ? "neutral" : "teal"}>{statusLabel(s.status)}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Classes + resources */}
            <section className="space-y-4">
              <Card>
                <SectionTitle>{L.uploadResource}</SectionTitle>
                <ResourceUpload classes={(classes ?? []).map((c) => ({ id: c.id, name: c.name }))} onDone={loadResources} />
              </Card>
              <div>
                <SectionTitle>{L.resourcesTitle}</SectionTitle>
                {resources === null ? <Spinner /> : <ResourceList items={resources} onChanged={loadResources} empty={L.noResources} />}
              </div>
              <Card>
                <SectionTitle>{L.newClass}</SectionTitle>
                <form onSubmit={createClass} className="space-y-3">
                  <Field label={L.className}>
                    <input className={inputClass} value={className} onChange={(e) => setClassName(e.target.value)} placeholder={L.classNamePh} maxLength={100} />
                  </Field>
                  <Button type="submit" variant="teal" disabled={creatingClass || !className.trim()} className="w-full">
                    {creatingClass && <Spinner />} {L.create}
                  </Button>
                </form>
              </Card>
              <div>
                <SectionTitle>{L.classes}</SectionTitle>
                {classes === null ? <Spinner /> : classes.length === 0 ? (
                  <Card><p className="text-sm text-dim">{L.noClasses}</p></Card>
                ) : (
                  <ul className="space-y-2">
                    {classes.map((c) => (
                      <li key={c.id}>
                        <Link href={`/teach/classes/${c.id}`} className="block rounded-xl border border-line bg-ink-2 hover:border-line-2 px-4 py-3 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-snow truncate">{c.name}</p>
                            <span className="font-mono text-xs font-bold text-teal tracking-wider">{c.code}</span>
                          </div>
                          <p className="text-xs text-dim mt-0.5">{L.studentsN(c.memberCount)} · {L.viewReport} →</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

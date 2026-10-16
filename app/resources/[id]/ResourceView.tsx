"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/app/components/Header";
import { useT } from "@/app/lib/language-context";
import type { KpState } from "@/app/lib/mastery";
import { api } from "@/app/components/learn/api";
import { CountSteppers, countTotal, type Counts } from "@/app/components/learn/CountSteppers";
import { PracticeRunner, type PracticeSet } from "@/app/components/learn/PracticeRunner";
import { Badge, Button, Card, ErrorNote, formatDate, inputClass, MasteryRow, SectionTitle, Spinner } from "@/app/components/learn/ui";

interface Detail {
  id: string; title: string; fileName: string; kind: string; sizeBytes: number;
  status: string; error: string | null; summary: string | null; levelId: string | null;
  classId: string | null; className: string | null; isOwner: boolean; createdAt: string;
  downloadUrl: string | null; text: string; textTruncated: boolean; topics: KpState[];
}

const KIND_LABEL: Record<string, string> = { pdf: "PDF", docx: "Word", pptx: "PowerPoint", text: "Text" };

/** A teaching resource: read or download it, see your mastery of its topics, practise from it. */
export function ResourceView({ id }: { id: string }) {
  const { T, lang } = useT();
  const L = T.learn;
  const router = useRouter();
  const [r, setR] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Counts>({ mcq: 5, true_false: 2, fill_blank: 3 });
  const [creating, setCreating] = useState(false);
  const [practice, setPractice] = useState<PracticeSet | null>(null);
  const [round, setRound] = useState(0);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [building, setBuilding] = useState(false);

  const load = useCallback(() => {
    api<Detail>(`/api/resources/${id}`).then(setR).catch((e: Error) => setError(e.message));
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!r?.isOwner) return;
    api<{ teaching: { id: string; name: string }[] }>("/api/classes").then((d) => setClasses(d.teaching)).catch(() => {});
  }, [r?.isOwner]);

  const createPractice = async () => {
    setCreating(true); setError(null);
    try {
      const set = await api<PracticeSet>(`/api/resources/${id}/practice`, { method: "POST", json: { counts } });
      setPractice(set);
      setRound((n) => n + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { setError((e as Error).message); }
    setCreating(false);
  };

  const buildClassExam = async () => {
    if (!r?.levelId) return;
    setBuilding(true); setError(null);
    try {
      const { id: examId } = await api<{ id: string }>("/api/assessments", { method: "POST", json: { title: r.title, levelId: r.levelId } });
      router.push(`/teach/assessments/${examId}?notes=${r.id}`);
    } catch (e) { setError((e as Error).message); setBuilding(false); }
  };

  const share = async (classId: string) => {
    await api(`/api/resources/${id}`, { method: "PATCH", json: { classId: classId || null } }).catch((e: Error) => setError(e.message));
    load();
  };

  const remove = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try { await api(`/api/resources/${id}`, { method: "DELETE" }); router.push("/teach"); }
    catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-7 pb-bottom-nav md:pb-10 space-y-5">
        <Link href={r?.isOwner ? "/teach" : "/learn"} className="text-xs text-dim hover:text-snow">← {r?.isOwner ? L.teachTitle : L.backToLearn}</Link>
        <ErrorNote message={error} />
        {!r ? !error && <div className="flex justify-center py-16 text-dim"><Spinner className="w-6 h-6" /></div> : practice ? (
          <>
            <button type="button" onClick={() => { setPractice(null); load(); }} className="text-xs text-teal cursor-pointer">← {r.title}</button>
            <PracticeRunner key={round} set={practice} levelId={r.levelId!} title={r.title} onAgain={createPractice} />
          </>
        ) : (
          <>
            <Card className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-dim">{L.resourcesTitle} · {KIND_LABEL[r.kind] ?? r.kind} · {formatDate(r.createdAt, lang)}</p>
                  <h1 className="font-display text-2xl font-bold break-words">{r.title}</h1>
                  {r.className && <p className="text-xs text-dim mt-1">{L.sharedBy} {r.className}</p>}
                </div>
                {r.status !== "ready" && <Badge tone={r.status === "failed" ? "bad" : "gold"}>{r.status === "failed" ? L.statusFailed : L.statusProcessing}</Badge>}
              </div>
              {r.summary && <p className="text-sm text-body leading-relaxed">{r.summary}</p>}
              <div className="flex flex-wrap gap-2">
                {r.downloadUrl && <a href={r.downloadUrl} className="inline-flex items-center rounded-xl border border-line px-4 py-2.5 text-sm hover:border-line-2">{L.download}</a>}
                {r.isOwner && r.levelId && (
                  <Button variant="primary" onClick={buildClassExam} disabled={building}>{building && <Spinner />} {L.buildExamFromThis}</Button>
                )}
                {r.isOwner && <Button variant="danger" onClick={remove} onBlur={() => setConfirmDelete(false)}>{confirmDelete ? L.confirmAgain : L.deleteResource}</Button>}
              </div>
              {r.isOwner && (
                <label className="flex items-center gap-2 text-xs text-dim">
                  {L.shareWith}
                  <select className={`${inputClass} !w-auto !py-1.5`} value={r.classId ?? ""} onChange={(e) => share(e.target.value)}>
                    <option value="">{L.privateOnly}</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
              )}
            </Card>

            {r.status === "ready" && r.levelId && (
              <div className="grid md:grid-cols-2 gap-5 items-start">
                <Card>
                  <SectionTitle>{L.topicsCovered}</SectionTitle>
                  <div className="divide-y divide-line/50">
                    {r.topics.map((k) => <MasteryRow key={k.kpId} name={k.name} mastery={k.mastery} attempts={k.attempts} />)}
                  </div>
                </Card>
                <Card className="space-y-3">
                  <SectionTitle>{L.createPracticeExam}</SectionTitle>
                  <p className="text-xs text-dim leading-relaxed">{L.createPracticeSub}</p>
                  <CountSteppers counts={counts} onChange={setCounts} />
                  <Button variant="primary" className="w-full" onClick={createPractice} disabled={creating || countTotal(counts) < 1}>
                    {creating ? <><Spinner /> {L.writingExam}</> : L.createPracticeExam}
                  </Button>
                </Card>
              </div>
            )}

            {r.text && (
              <Card>
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-teal">{L.readText}</summary>
                  <div className="mt-3 max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-ink p-4">
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-body">{r.text}</pre>
                  </div>
                  {r.textTruncated && <p className="text-xs text-dim mt-2">{L.textTruncated}</p>}
                </details>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}

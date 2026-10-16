"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/app/components/Header";
import { useT } from "@/app/lib/language-context";
import type { AssessmentDetail, CurriculumNode, KpNode, TeacherQuestion } from "@/app/lib/learning/types";
import type { QuestionType } from "@/app/lib/learning/grading";
import { MAX_PER_DRAFT, MAX_PER_TYPE } from "@/app/lib/learning/limits";
import { api } from "@/app/components/learn/api";
import { Badge, Button, Card, ErrorNote, Field, inputClass, SectionTitle, Spinner } from "@/app/components/learn/ui";

type Counts = Record<QuestionType, number>;

export function Builder({ id }: { id: string }) {
  const { T } = useT();
  const L = T.learn;
  const router = useRouter();

  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [kps, setKps] = useState<KpNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"ai" | "bank">("ai");
  const [counts, setCounts] = useState<Counts>({ mcq: 5, true_false: 2, fill_blank: 1 });
  const [bankCount, setBankCount] = useState(8);
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showHost, setShowHost] = useState(false);

  useEffect(() => {
    Promise.all([api<AssessmentDetail>(`/api/assessments/${id}`), api<CurriculumNode[]>("/api/curricula")])
      .then(([d, tree]) => {
        setDetail(d);
        setTitle(d.title);
        setKps(tree.flatMap((c) => c.levels).find((l) => l.id === d.levelId)?.kps ?? []);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  const kpById = useMemo(() => new Map(kps.map((k) => [k.id, k])), [kps]);
  const grouped = useMemo(() => {
    const g = new Map<string, KpNode[]>();
    for (const k of kps) g.set(k.category, [...(g.get(k.category) ?? []), k]);
    return [...g];
  }, [kps]);

  const run = async (fn: () => Promise<AssessmentDetail>, busy?: string) => {
    setError(null);
    if (busy) setBusyId(busy);
    try { setDetail(await fn()); } catch (e) { setError((e as Error).message); }
    if (busy) setBusyId(null);
  };

  const addQuestions = async () => {
    if (!selected.size) return;
    setAdding(true);
    await run(() => tab === "ai"
      ? api(`/api/assessments/${id}/draft`, { method: "POST", json: { kpIds: [...selected], counts, note: note || undefined } })
      : api(`/api/assessments/${id}/bank`, { method: "POST", json: { kpIds: [...selected], count: bankCount } }));
    setAdding(false);
  };

  const setStatus = (q: TeacherQuestion, status: "approved" | "rejected") =>
    run(() => api(`/api/questions/${q.id}`, { method: "PATCH", json: { assessmentId: id, status } }), q.id);
  const regenerate = (q: TeacherQuestion) =>
    run(() => api(`/api/questions/${q.id}/regenerate`, { method: "POST", json: { assessmentId: id } }), q.id);
  const remove = (q: TeacherQuestion) =>
    run(() => api(`/api/assessments/${id}/items?questionId=${q.id}`, { method: "DELETE" }), q.id);
  const saveEdit = async (q: TeacherQuestion, content: Omit<TeacherQuestion, "id" | "provenance" | "status" | "editable">) => {
    await run(() => api(`/api/questions/${q.id}`, { method: "PATCH", json: { assessmentId: id, status: "approved", content } }), q.id);
    setEditingId(null);
  };
  const saveTitle = () => {
    if (!detail || !title.trim() || title === detail.title) return;
    run(() => api(`/api/assessments/${id}`, { method: "PATCH", json: { title } }));
  };
  const publish = () => run(() => api(`/api/assessments/${id}`, { method: "PATCH", json: { publish: true } }));
  const deleteExam = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try { await api(`/api/assessments/${id}`, { method: "DELETE" }); router.push("/teach"); }
    catch (e) { setError((e as Error).message); }
  };

  if (!detail) {
    return (
      <div className="min-h-screen bg-ink text-snow page-shell">
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-10">{error ? <ErrorNote message={error} /> : <Spinner className="w-6 h-6 text-dim" />}</main>
      </div>
    );
  }

  const qs = detail.questions;
  const nApproved = qs.filter((q) => q.status === "approved").length;
  const nDraft = qs.filter((q) => q.status === "draft").length;
  const nRejected = qs.filter((q) => q.status === "rejected").length;
  const src = (p: string) => qs.filter((q) => q.status !== "rejected" && q.provenance === p).length;
  const total = counts.mcq + counts.true_false + counts.fill_blank;

  return (
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7 pb-bottom-nav md:pb-10 space-y-5">
        <Link href="/teach" className="text-xs text-dim hover:text-snow">← {L.teachTitle}</Link>

        {/* Title + status */}
        <Card className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} aria-label={L.examTitle}
                className="w-full bg-transparent font-display text-xl sm:text-2xl font-bold text-snow outline-none border-b border-transparent focus:border-teal" maxLength={200} />
              <p className="text-xs text-dim mt-1">{detail.curriculumName} · {detail.levelName}</p>
            </div>
            <Badge tone={detail.status === "published" ? "good" : "gold"}>{detail.status === "published" ? L.published : L.draft}</Badge>
          </div>
          <p className="text-sm text-body">{L.reviewSummary(nApproved, nDraft, nRejected)}</p>
          <p className="text-xs text-dim">{L.sourcesLine(src("ai_draft"), src("ai_edited"), src("seed"), src("teacher"))}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {detail.status === "published" ? (
              <Button variant="primary" onClick={() => setShowHost((v) => !v)}>{L.hostLive}</Button>
            ) : (
              <Button variant="primary" onClick={publish} disabled={!nApproved}>{L.publish}</Button>
            )}
            <Button variant="danger" onClick={deleteExam} onBlur={() => setConfirmDelete(false)}>
              {confirmDelete ? L.confirmAgain : L.deleteExam}
            </Button>
          </div>
          {detail.status === "published" && <p className="text-xs text-good">{L.publishedNote}</p>}
          {showHost && <HostSetup assessmentId={id} />}
        </Card>

        <ErrorNote message={error} />

        <div className="grid lg:grid-cols-[minmax(0,340px)_1fr] gap-5 items-start">
          {/* Add questions */}
          <Card className="space-y-4 lg:sticky lg:top-4">
            <SectionTitle action={
              <span className="flex gap-2 text-[11px]">
                <button type="button" className="text-teal hover:underline cursor-pointer" onClick={() => setSelected(new Set(kps.map((k) => k.id)))}>{L.selectAll}</button>
                <button type="button" className="text-dim hover:underline cursor-pointer" onClick={() => setSelected(new Set())}>{L.clearSel}</button>
              </span>
            }>{L.chooseKps}</SectionTitle>
            <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
              {grouped.map(([cat, list]) => (
                <fieldset key={cat}>
                  <legend className="text-[10px] font-bold uppercase tracking-widest text-dim mb-1">{cat}</legend>
                  {list.map((k) => (
                    <label key={k.id} className="flex items-start gap-2 py-1 text-sm cursor-pointer">
                      <input type="checkbox" className="mt-1 accent-[var(--tausi-teal)]" checked={selected.has(k.id)}
                        onChange={(e) => setSelected((s) => { const n = new Set(s); if (e.target.checked) n.add(k.id); else n.delete(k.id); return n; })} />
                      <span className="flex-1 min-w-0">
                        <span className="text-snow">{k.name}</span>
                        <span className="block text-[11px] text-dim">{L.inBank(k.questionCount)}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>

            <div className="flex rounded-xl border border-line overflow-hidden" role="tablist">
              {(["ai", "bank"] as const).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-xs font-semibold cursor-pointer transition-colors ${tab === t ? "bg-teal text-ink" : "text-dim hover:text-snow"}`}>
                  {t === "ai" ? L.aiDraft : L.fromBank}
                </button>
              ))}
            </div>

            {tab === "ai" ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  {([["mcq", L.countMcq], ["true_false", L.countTf], ["fill_blank", L.countFill]] as const).map(([k, label]) => {
                    // Each type may go up to MAX_PER_TYPE, as long as the total stays within MAX_PER_DRAFT.
                    const cap = Math.min(MAX_PER_TYPE, counts[k] + MAX_PER_DRAFT - total);
                    const set = (v: number) => setCounts((c) => ({ ...c, [k]: Math.max(0, Math.min(cap, v)) }));
                    return (
                      <div key={k} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink px-3 py-2">
                        <label htmlFor={`count-${k}`} className="text-sm text-snow min-w-0">{label}</label>
                        <div className="flex items-center gap-1 shrink-0">
                          <button type="button" aria-label={`${L.less}: ${label}`} onClick={() => set(counts[k] - 1)} disabled={counts[k] <= 0}
                            className="w-8 h-8 rounded-lg border border-line text-snow hover:border-line-2 disabled:opacity-40 cursor-pointer">−</button>
                          <input id={`count-${k}`} type="number" inputMode="numeric" min={0} max={cap} value={counts[k]}
                            onChange={(e) => set(Number(e.target.value) || 0)}
                            className="w-14 h-8 rounded-lg border border-line bg-ink-2 text-center text-sm font-semibold text-snow outline-none focus:border-teal" />
                          <button type="button" aria-label={`${L.more}: ${label}`} onClick={() => set(counts[k] + 1)} disabled={counts[k] >= cap}
                            className="w-8 h-8 rounded-lg border border-line text-snow hover:border-line-2 disabled:opacity-40 cursor-pointer">+</button>
                        </div>
                      </div>
                    );
                  })}
                  <p className={`text-right text-xs font-semibold ${total > MAX_PER_DRAFT ? "text-bad" : "text-dim"}`}>{L.totalOf(total, MAX_PER_DRAFT)}</p>
                </div>
                <Field label={L.note}>
                  <textarea className={`${inputClass} resize-none`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={L.notePh} maxLength={500} />
                </Field>
              </div>
            ) : (
              <Field label={L.howMany}>
                <input type="number" min={1} max={30} className={inputClass} value={bankCount}
                  onChange={(e) => setBankCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />
              </Field>
            )}
            <Button variant="teal" className="w-full" onClick={addQuestions}
              disabled={adding || !selected.size || (tab === "ai" && (total < 1 || total > MAX_PER_DRAFT))}>
              {adding ? <><Spinner /> {tab === "ai" ? L.drafting : L.loading}</> : tab === "ai" ? L.draftBtn : L.addFromBank}
            </Button>
            <p className="text-[11px] text-dim leading-relaxed">{L.reviewHint}</p>
          </Card>

          {/* Questions */}
          <section className="space-y-3 min-w-0">
            {qs.length === 0 && <Card><p className="text-sm text-dim">{L.builderEmpty}</p></Card>}
            {qs.map((q, i) => (
              editingId === q.id
                ? <QuestionEditor key={q.id} q={q} kps={kps} busy={busyId === q.id} onCancel={() => setEditingId(null)} onSave={(c) => saveEdit(q, c)} />
                : <QuestionCard key={q.id} index={i} q={q} kpById={kpById} busy={busyId === q.id}
                    onApprove={() => setStatus(q, "approved")} onReject={() => setStatus(q, "rejected")}
                    onEdit={() => setEditingId(q.id)} onRegenerate={() => regenerate(q)} onRemove={() => remove(q)} />
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}

function useProvenance() {
  const L = useT().T.learn;
  return (p: TeacherQuestion["provenance"]) => ({
    seed: { label: L.provSeed, tone: "neutral" as const },
    ai_draft: { label: L.provAiDraft, tone: "magenta" as const },
    ai_edited: { label: L.provAiEdited, tone: "coral" as const },
    teacher: { label: L.provTeacher, tone: "teal" as const },
  })[p];
}

function QuestionCard({ q, index, kpById, busy, onApprove, onReject, onEdit, onRegenerate, onRemove }: {
  q: TeacherQuestion; index: number; kpById: Map<string, KpNode>; busy: boolean;
  onApprove: () => void; onReject: () => void; onEdit: () => void; onRegenerate: () => void; onRemove: () => void;
}) {
  const L = useT().T.learn;
  const prov = useProvenance()(q.provenance);
  const statusTone = q.status === "approved" ? "good" : q.status === "rejected" ? "bad" : "gold";
  const statusLabel = q.status === "approved" ? L.stApproved : q.status === "rejected" ? L.stRejected : L.stDraft;
  const typeLabel = q.type === "mcq" ? L.typeMcq : q.type === "true_false" ? L.typeTf : L.typeFill;
  const opt = (o: string) => (q.type === "true_false" ? (o === "True" ? L.trueLabel : L.falseLabel) : o);

  return (
    <article className={`rounded-2xl border bg-ink-2 p-4 sm:p-5 transition-opacity ${q.status === "rejected" ? "border-line opacity-60" : q.status === "draft" ? "border-gold/40" : "border-line"} ${busy ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="text-xs font-bold text-dim mr-1">#{index + 1}</span>
        <Badge>{typeLabel}</Badge>
        <Badge tone={prov.tone}>{prov.label}</Badge>
        <Badge tone={statusTone}>{statusLabel}</Badge>
        <span className="text-[11px] text-dim ml-auto">{L.difficultyN(q.difficulty)}</span>
      </div>
      <p className="text-sm sm:text-base text-snow leading-relaxed mb-3">{q.prompt}</p>
      {q.type === "fill_blank" ? (
        <p className="text-sm"><span className="text-dim">{L.answer}: </span><span className="text-good font-semibold">{q.answer}</span></p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-1.5">
          {q.options.map((o) => (
            <li key={o} className={`rounded-lg border px-3 py-1.5 text-sm ${o === q.answer ? "border-good/50 bg-good/10 text-snow" : "border-line text-body"}`}>{opt(o)}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {q.kpIds.map((k) => kpById.get(k)).filter(Boolean).map((k) => <Badge key={k!.id} tone="teal">{k!.name}</Badge>)}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-4">
        {busy && <Spinner className="w-4 h-4 text-dim self-center" />}
        {q.editable && q.status !== "approved" && <Button variant="teal" className="!py-1.5 !px-3 text-xs" onClick={onApprove} disabled={busy}>{L.approve}</Button>}
        <Button className="!py-1.5 !px-3 text-xs" onClick={onEdit} disabled={busy}>{L.edit}</Button>
        <Button className="!py-1.5 !px-3 text-xs" onClick={onRegenerate} disabled={busy}>{L.regenerate}</Button>
        {q.editable && q.status !== "rejected" && <Button variant="ghost" className="!py-1.5 !px-3 text-xs" onClick={onReject} disabled={busy}>{L.reject}</Button>}
        <Button variant="ghost" className="!py-1.5 !px-3 text-xs" onClick={onRemove} disabled={busy}>{L.remove}</Button>
      </div>
    </article>
  );
}

function QuestionEditor({ q, kps, busy, onCancel, onSave }: {
  q: TeacherQuestion; kps: KpNode[]; busy: boolean;
  onCancel: () => void;
  onSave: (c: { type: QuestionType; prompt: string; options: string[]; answer: string; difficulty: number; kpIds: string[] }) => void;
}) {
  const L = useT().T.learn;
  const [type, setType] = useState<QuestionType>(q.type);
  const [prompt, setPrompt] = useState(q.prompt);
  const [options, setOptions] = useState<string[]>(q.type === "mcq" ? [...q.options, "", "", "", ""].slice(0, 4) : ["", "", "", ""]);
  const [answer, setAnswer] = useState(q.answer);
  const [difficulty, setDifficulty] = useState(q.difficulty);
  const [kpIds, setKpIds] = useState<string[]>(q.kpIds);

  const save = () => onSave({
    type, prompt, difficulty, kpIds,
    options: type === "mcq" ? options.map((o) => o.trim()) : type === "true_false" ? ["True", "False"] : [],
    answer: answer.trim(),
  });

  return (
    <article className="rounded-2xl border-2 border-teal/50 bg-ink-2 p-4 sm:p-5 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={L.questionType}>
          <select className={inputClass} value={type} onChange={(e) => {
            const t = e.target.value as QuestionType;
            setType(t);
            if (t === "true_false" && answer !== "True" && answer !== "False") setAnswer("True");
          }}>
            <option value="mcq">{L.typeMcq}</option>
            <option value="true_false">{L.typeTf}</option>
            <option value="fill_blank">{L.typeFill}</option>
          </select>
        </Field>
        <Field label={L.difficulty}>
          <select className={inputClass} value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}>
            {[1, 2, 3].map((d) => <option key={d} value={d}>{L.difficultyN(d)}</option>)}
          </select>
        </Field>
      </div>
      <Field label={L.prompt}>
        <textarea className={`${inputClass} resize-y`} rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={600} />
      </Field>
      {type === "mcq" && (
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name={`correct-${q.id}`} aria-label={L.markCorrect} checked={answer === o && o !== ""}
                onChange={() => setAnswer(o)} className="accent-[var(--tausi-green)]" />
              <input className={inputClass} value={o} placeholder={L.optionN(i + 1)} maxLength={200}
                onChange={(e) => {
                  const v = e.target.value;
                  setOptions((list) => list.map((x, j) => (j === i ? v : x)));
                  if (answer === o) setAnswer(v);
                }} />
            </div>
          ))}
        </div>
      )}
      {type === "true_false" && (
        <Field label={L.answer}>
          <select className={inputClass} value={answer} onChange={(e) => setAnswer(e.target.value)}>
            <option value="True">{L.trueLabel}</option>
            <option value="False">{L.falseLabel}</option>
          </select>
        </Field>
      )}
      {type === "fill_blank" && (
        <Field label={L.answer}>
          <input className={inputClass} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={L.answerPh} maxLength={200} />
        </Field>
      )}
      <fieldset>
        <legend className="text-xs font-semibold text-body mb-1.5">{L.kps}</legend>
        <div className="flex flex-wrap gap-1.5">
          {kps.map((k) => {
            const on = kpIds.includes(k.id);
            return (
              <button key={k.id} type="button" aria-pressed={on}
                onClick={() => setKpIds((ids) => (on ? ids.filter((x) => x !== k.id) : [...ids, k.id]))}
                className={`text-[11px] px-2 py-1 rounded-full border cursor-pointer ${on ? "border-teal bg-teal/15 text-teal" : "border-line text-dim hover:text-snow"}`}>
                {k.name}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex gap-2">
        <Button variant="teal" onClick={save} disabled={busy || !prompt.trim() || !answer.trim() || !kpIds.length}>
          {busy && <Spinner />} {L.saveApprove}
        </Button>
        <Button variant="ghost" onClick={onCancel}>{L.cancel}</Button>
      </div>
    </article>
  );
}

function HostSetup({ assessmentId }: { assessmentId: string }) {
  const L = useT().T.learn;
  const router = useRouter();
  const [mode, setMode] = useState<"exam" | "game">("game");
  const [requireLogin, setRequireLogin] = useState(false);
  const [classId, setClassId] = useState("");
  const [questionSeconds, setQuestionSeconds] = useState(20);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(15);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api<{ teaching: { id: string; name: string }[] }>("/api/classes").then((d) => setClasses(d.teaching)).catch(() => {}); }, []);

  const open = async () => {
    setBusy(true); setError(null);
    try {
      const { code } = await api<{ code: string }>("/api/live", {
        method: "POST",
        json: { assessmentId, mode, requireLogin, classId: classId || null, questionSeconds, timeLimitMinutes },
      });
      router.push(`/teach/live/${code}`);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-teal/30 bg-teal/[0.04] p-4 space-y-4 mt-2">
      <h3 className="font-display font-bold">{L.hostTitle}</h3>
      <div className="grid sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label={L.mode}>
        {([["game", L.modeGame, L.gameModeDesc], ["exam", L.modeExam, L.examModeDesc]] as const).map(([m, name, desc]) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m}
            onClick={() => { setMode(m); if (m === "exam") setRequireLogin(true); }}
            className={`text-left rounded-xl border-2 p-3 cursor-pointer transition-colors ${mode === m ? "border-teal bg-teal/10" : "border-line hover:border-line-2"}`}>
            <span className="block text-sm font-semibold text-snow">{name}</span>
            <span className="block text-xs text-dim mt-1 leading-snug">{desc}</span>
          </button>
        ))}
      </div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" className="mt-1 accent-[var(--tausi-teal)]" checked={requireLogin} onChange={(e) => setRequireLogin(e.target.checked)} />
        <span>
          <span className="block text-sm font-semibold text-snow">{L.requireLogin}</span>
          <span className="block text-xs text-dim leading-snug">{L.requireLoginDesc}</span>
        </span>
      </label>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={L.attachClass}>
          <select className={inputClass} value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">{L.noClass}</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        {mode === "game" ? (
          <Field label={L.perQuestion}>
            <input type="number" min={5} max={120} className={inputClass} value={questionSeconds}
              onChange={(e) => setQuestionSeconds(Math.max(5, Math.min(120, Number(e.target.value) || 20)))} />
          </Field>
        ) : (
          <Field label={L.timeLimit}>
            <input type="number" min={1} max={180} className={inputClass} value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(Math.max(1, Math.min(180, Number(e.target.value) || 15)))} />
          </Field>
        )}
      </div>
      <ErrorNote message={error} />
      <Button variant="primary" onClick={open} disabled={busy}>{busy && <Spinner />} {L.openSession}</Button>
    </div>
  );
}

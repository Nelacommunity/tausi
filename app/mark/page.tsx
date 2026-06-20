"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/app/components/Header";
import { PageHero } from "@/app/components/PageHero";
import { useT } from "@/app/lib/language-context";
import type { MarkingSession } from "@/app/lib/types";

const MARK_ICON = "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z";

const ACCEPTED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const ACCEPT_STR = ".pdf,.png,.jpg,.jpeg,.webp";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function GradeChip({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const grade = pct >= 75 ? "A" : pct >= 65 ? "B" : pct >= 50 ? "C" : pct >= 40 ? "D" : "F";
  const colors: Record<string, string> = {
    A: "bg-good/10 text-good border-good/30",
    B: "bg-teal-deep/60 text-teal border-teal-deep",
    C: "bg-gold/10 text-gold border-gold/30",
    D: "bg-coral/10 text-coral border-coral/30",
    F: "bg-bad/10 text-bad border-bad/30",
  };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colors[grade]}`}>{grade} · {pct}%</span>;
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-1 ml-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-teal animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

interface UploadZoneProps {
  label: string;
  required?: boolean;
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (i: number) => void;
  disabled?: boolean;
  hint?: string;
}

function UploadZone({ label, required, files, onAdd, onRemove, disabled, hint }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handle = (raw: FileList | null) => {
    if (!raw) return;
    onAdd(Array.from(raw).filter((f) => ACCEPTED.includes(f.type)));
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-bold text-dim uppercase tracking-widest">
          {label} {required && <span className="text-teal">*</span>}
        </p>
        {hint && <p className="text-xs text-dim/60 mt-0.5">{hint}</p>}
      </div>
      <div
        onClick={() => !disabled && ref.current?.click()}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        className={`flex-1 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all select-none ${
          disabled ? "opacity-50 cursor-not-allowed" :
          dragging ? "border-teal bg-teal/5 scale-[1.01]" : "border-line hover:border-teal/40 bg-ink-2/20"
        }`}
      >
        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto mb-3 transition-colors ${
          dragging ? "bg-teal/20 border-teal/40" : "bg-ink-3 border-line"
        }`}>
          <svg className={`w-6 h-6 transition-colors ${dragging ? "text-teal" : "text-dim"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <p className="text-sm font-medium text-body">Drop here or <span className="text-teal">browse</span></p>
        <p className="text-xs text-dim mt-1">PDF, PNG, JPG, WEBP</p>
        <input ref={ref} type="file" accept={ACCEPT_STR} multiple
          onChange={(e) => { handle(e.target.files); e.target.value = ""; }}
          className="hidden" disabled={disabled} />
      </div>
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => (
            <li key={f.name + f.size}
              className="flex items-center gap-3 bg-ink border border-line rounded-xl px-3 py-2.5">
              <div className="w-7 h-7 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <span className="flex-1 truncate text-xs text-body font-medium">{f.name}</span>
              <button onClick={() => onRemove(i)} disabled={disabled}
                className="p-1 rounded-md text-dim hover:text-bad hover:bg-bad/10 transition-colors disabled:opacity-50 cursor-pointer">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MarkPage() {
  const router = useRouter();
  const { T } = useT();
  const M = T.marker;
  const [answerFiles, setAnswerFiles] = useState<File[]>([]);
  const [questionFiles, setQuestionFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [isMarking, setIsMarking] = useState(false);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<MarkingSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    fetch("/api/mark")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setSessions(d); })
      .finally(() => setLoadingSessions(false));
  }, []);

  const addAnswerFiles = useCallback((files: File[]) => {
    setAnswerFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...files.filter((f) => !existing.has(f.name + f.size))];
    });
  }, []);

  const addQuestionFiles = useCallback((files: File[]) => {
    setQuestionFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...files.filter((f) => !existing.has(f.name + f.size))];
    });
  }, []);

  const submit = async () => {
    if (!answerFiles.length || !questionFiles.length) {
      setError("Upload both the answer sheet(s) and the question paper.");
      return;
    }
    setError(""); setPreview(""); setIsMarking(true);

    const fd = new FormData();
    answerFiles.forEach((f) => fd.append("answer_files", f));
    questionFiles.forEach((f) => fd.append("question_files", f));
    fd.append("title", title || `Marking — ${new Date().toLocaleDateString("en-GB")}`);

    try {
      const res = await fetch("/api/mark", { method: "POST", body: fd });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? res.statusText);
      }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        full += chunk;
        setPreview(full);
      }
      const match = full.match(/<!--SESSION_ID:([^-]+)-->/);
      if (match?.[1]) router.push(`/mark/${match[1]}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Marking failed");
    } finally {
      setIsMarking(false);
    }
  };

  const canSubmit = answerFiles.length > 0 && questionFiles.length > 0;
  const graded = sessions.filter((s) => s.percentage !== null);
  const avgPct = graded.length
    ? Math.round(graded.reduce((sum, s) => sum + (s.percentage ?? 0), 0) / graded.length)
    : null;

  return (
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7 pb-bottom-nav md:pb-10 space-y-5">

        {/* ── Page hero ───────────────────────────────────── */}
        <PageHero d={MARK_ICON} accent="teal" title={M.heading} subtitle={M.subtitle}
          action={
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-teal border border-teal/30 bg-teal/5 px-2.5 py-1.5 rounded-lg">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Instant grading
            </span>
          }
        />

        {/* ── Marking form + side panel (bento) ───────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 card-enter card-enter-1">
        <div className="lg:col-span-2 rounded-2xl border border-line bg-ink-2/40 p-6 sm:p-8 space-y-6">

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-dim uppercase tracking-widest mb-2">
              {M.sessionTitle} <span className="normal-case font-normal opacity-60">{M.titleOptional}</span>
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={isMarking}
              placeholder={M.titlePlaceholder}
              className="w-full rounded-xl bg-ink border border-line focus:border-teal text-body placeholder:text-dim/50 text-sm px-4 py-3 outline-none transition-colors disabled:opacity-50" />
          </div>

          {/* Two upload zones side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <UploadZone
              label={M.questionPaper}
              required
              hint={M.questionPaperHint}
              files={questionFiles}
              onAdd={addQuestionFiles}
              onRemove={(i) => setQuestionFiles((p) => p.filter((_, j) => j !== i))}
              disabled={isMarking}
            />
            <UploadZone
              label={M.answerSheet}
              required
              hint={M.answerSheetHint}
              files={answerFiles}
              onAdd={addAnswerFiles}
              onRemove={(i) => setAnswerFiles((p) => p.filter((_, j) => j !== i))}
              disabled={isMarking}
            />
          </div>

          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-bad/30 bg-bad/8 px-4 py-3 text-sm text-bad">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          <button onClick={submit} disabled={isMarking || !canSubmit}
            className="flex items-center justify-center gap-2.5 w-full rounded-xl bg-teal hover:opacity-90 disabled:bg-ink-3 disabled:text-dim disabled:cursor-not-allowed text-ink font-bold py-4 text-base transition-all cursor-pointer">
            {isMarking ? (
              <>
                <div className="w-5 h-5 border-2 border-ink/40 border-t-ink rounded-full animate-spin" />
                {M.markingBtn}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {M.markBtn}
              </>
            )}
          </button>

          {preview && (
            <div>
              <p className="text-xs font-bold text-dim uppercase tracking-widest mb-2">Live preview</p>
              <div className="rounded-xl border border-teal/20 bg-ink p-4 max-h-64 overflow-y-auto text-xs text-dim font-mono whitespace-pre-wrap leading-relaxed">
                {preview.replace(/<!--SESSION_ID:[^-]+-->/g, "")}
                {isMarking && <span className="inline-block w-1.5 h-3.5 bg-teal animate-pulse ml-0.5 align-middle" />}
              </div>
            </div>
          )}
        </div>

          {/* ── Side panel (bento) ─────────────────────────── */}
          <div className="rounded-2xl border border-line overflow-hidden relative">
            <div className="absolute inset-0"
              style={{ background: "linear-gradient(160deg, oklch(0.30 0.10 192 / 0.45) 0%, oklch(0.19 0.010 238) 50%, oklch(0.24 0.08 158 / 0.35) 100%)" }} />
            <div className="relative p-5 flex flex-col gap-4 h-full">
              <p className="text-xs font-bold text-dim uppercase tracking-widest">At a glance</p>

              {/* Stat tiles */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-teal/20 bg-teal/10 text-teal p-3.5 flex flex-col gap-1">
                  <span className="font-display text-2xl font-bold leading-none">
                    {loadingSessions ? "—" : sessions.length}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Marked</span>
                </div>
                <div className="rounded-xl border border-good/20 bg-good/10 text-good p-3.5 flex flex-col gap-1">
                  <span className="font-display text-2xl font-bold leading-none">
                    {avgPct !== null ? `${avgPct}%` : "—"}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Avg score</span>
                </div>
              </div>

              {/* How it works */}
              <div className="rounded-xl border border-white/10 bg-ink/40 p-4 space-y-3 flex-1">
                <p className="text-xs font-semibold text-snow">How it works</p>
                {[
                  { n: "1", t: "Upload the question paper & your answers" },
                  { n: "2", t: "AI matches answers to each question" },
                  { n: "3", t: "Get marks, grade & detailed feedback" },
                ].map(({ n, t }) => (
                  <div key={n} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-teal/15 border border-teal/25 text-teal text-[10px] font-bold flex items-center justify-center shrink-0">{n}</span>
                    <p className="text-xs text-dim leading-relaxed">{t}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-teal/20 bg-teal/5 px-3.5 py-3">
                <svg className="w-4 h-4 text-teal shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <p className="text-[11px] text-teal/80 leading-relaxed">{M.howItWorksNote}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Past sessions ───────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-bold text-dim uppercase tracking-widest">{M.prevMarkings}</h2>
            {sessions.length > 0 && (
              <span className="text-xs font-semibold text-dim bg-ink-3 border border-line rounded-full px-2 py-0.5">{sessions.length}</span>
            )}
          </div>

          {loadingSessions ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl skeleton" />)}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-line bg-ink-2/20 p-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-ink-3 border border-line flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-body">{M.noMarkings}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sessions.map((s, i) => (
                <a key={s.id} href={`/mark/${s.id}`}
                  className={`group block rounded-2xl border border-line bg-ink-2/40 hover:bg-ink-2 hover:border-teal/30 p-5 transition-all card-enter card-enter-${Math.min(i + 1, 5)}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-bold text-body group-hover:text-snow truncate flex-1 transition-colors">{s.title}</h3>
                    <GradeChip pct={s.percentage} />
                  </div>
                  {s.original_filenames?.[0] && (
                    <p className="text-xs text-dim truncate mb-1">{s.original_filenames[0]}</p>
                  )}
                  {s.total_marks !== null && (
                    <p className="text-xs text-dim/80">{s.total_marks} / {s.max_marks} marks</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-dim/60">{formatDate(s.created_at)}</p>
                    <svg className="w-4 h-4 text-dim group-hover:text-teal transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

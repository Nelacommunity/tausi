"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/app/components/Header";
import { useT } from "@/app/lib/language-context";
import type { MarkingSession } from "@/app/lib/types";

const ACCEPTED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const ACCEPT_STR = ".pdf,.png,.jpg,.jpeg,.webp";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function GradeChip({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const grade = pct >= 75 ? "A" : pct >= 65 ? "B" : pct >= 50 ? "C" : pct >= 40 ? "D" : "F";
  const colors: Record<string, string> = {
    A: "bg-emerald-950 text-emerald-400 border-emerald-800",
    B: "bg-blue-950 text-blue-400 border-blue-800",
    C: "bg-amber-950 text-amber-400 border-amber-800",
    D: "bg-orange-950 text-orange-400 border-orange-800",
    F: "bg-red-950 text-red-400 border-red-800",
  };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colors[grade]}`}>{grade} · {pct}%</span>;
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-1 ml-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
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
    <div>
      <label className="text-xs font-medium text-gray-400 block mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
        {hint && <span className="text-gray-600 font-normal ml-1">— {hint}</span>}
      </label>
      <div
        onClick={() => !disabled && ref.current?.click()}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all ${
          disabled ? "opacity-50 cursor-not-allowed" :
          dragging ? "border-purple-400 bg-purple-950/20" : "border-gray-700 hover:border-gray-500 bg-gray-900/40"
        }`}
      >
        <p className="text-sm text-gray-400">
          Drop files here or <span className="text-purple-400 underline">browse</span>
        </p>
        <p className="text-xs text-gray-600 mt-1">PDF, PNG, JPG, WEBP</p>
        <input ref={ref} type="file" accept={ACCEPT_STR} multiple
          onChange={(e) => { handle(e.target.files); e.target.value = ""; }}
          className="hidden" disabled={disabled} />
      </div>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {files.map((f, i) => (
            <li key={f.name + f.size}
              className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-1.5">
              <span className="flex-1 truncate">{f.name}</span>
              <button onClick={() => onRemove(i)} disabled={disabled}
                className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50">✕</button>
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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{M.heading}</h1>
          <p className="text-sm text-gray-500">{M.subtitle}</p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 space-y-6">

          {/* Title */}
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1.5">
              {M.sessionTitle} <span className="text-gray-600">{M.titleOptional}</span>
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={isMarking}
              placeholder={M.titlePlaceholder}
              className="w-full rounded-xl bg-gray-900 border border-gray-700 focus:border-purple-500 text-gray-200 placeholder-gray-600 text-sm px-4 py-2.5 outline-none transition-colors disabled:opacity-50" />
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

          {/* How it works blurb */}
          <div className="flex items-start gap-3 rounded-xl bg-purple-950/20 border border-purple-900/40 px-4 py-3">
            <svg className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <p className="text-xs text-purple-300/80 leading-relaxed">
              {M.howItWorksNote}
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-2.5 text-sm text-red-300">{error}</div>
          )}

          <button onClick={submit} disabled={isMarking || !canSubmit}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-3 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {isMarking ? <>{M.markingBtn}<LoadingDots /></> : M.markBtn}
          </button>

          {preview && (
            <div className="rounded-xl border border-purple-900/40 bg-gray-900 p-4 max-h-64 overflow-y-auto text-xs text-gray-400 font-mono whitespace-pre-wrap">
              {preview.replace(/<!--SESSION_ID:[^-]+-->/g, "")}
              {isMarking && <span className="inline-block w-1.5 h-3 bg-purple-400 animate-pulse ml-0.5" />}
            </div>
          )}
        </div>

        {/* Past sessions */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-300">{M.prevMarkings}</h2>
          {loadingSessions ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-gray-900/50 border border-gray-800 animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-6 text-center text-sm text-gray-600">
              {M.noMarkings}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sessions.map((s) => (
                <a key={s.id} href={`/mark/${s.id}`}
                  className="block rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-900 hover:border-gray-600 p-4 transition-all group">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-200 group-hover:text-white truncate flex-1">{s.title}</h3>
                    <GradeChip pct={s.percentage} />
                  </div>
                  <p className="text-xs text-gray-600 truncate mb-1">{s.original_filenames?.[0]}</p>
                  {s.total_marks !== null && (
                    <p className="text-xs text-gray-500">{s.total_marks} / {s.max_marks} marks</p>
                  )}
                  <p className="text-xs text-gray-700 mt-1">{formatDate(s.created_at)}</p>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExamOutput } from "@/app/components/ExamOutput";
import { Header } from "@/app/components/Header";
import type { ExamPaper } from "@/app/lib/types";
import { useT } from "@/app/lib/language-context";

type Tab = "exam" | "marking";
type InputMode = "upload" | "library";
type Status = "idle" | "generating-exam" | "done-exam" | "generating-marking" | "done-marking";

interface RecentExam {
  id: string;
  title: string;
  original_filenames: string[];
  is_public: boolean;
  created_at: string;
}

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const ACCEPTED_EXTENSIONS = ".pdf,.png,.jpg,.jpeg,.webp";
const MAX_FILES = 3;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_BYTES = 60 * 1024 * 1024;

const TYPE_LABELS: Record<string, string> = {
  NECTA: "NECTA", KCSE: "KCSE", KCPE: "KCPE", IGCSE: "IGCSE",
  CAMBRIDGE_ALEVEL: "A-Level", IEB: "IEB", NSC: "NSC", WAEC: "WAEC",
  NECO: "NECO", ZIMSEC: "ZIMSEC", UNEB: "UNEB", UACE: "UACE", JC: "JC", OTHER: "Other",
};

function UploadIcon() {
  return (
    <svg className="w-10 h-10 text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}
function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1 ml-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse motion-reduce:animate-none"
          style={{ animationDelay: `${i * 0.25}s` }} />
      ))}
    </span>
  );
}
function formatFileSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function deriveTitleFromFiles(files: File[]) {
  if (!files.length) return `Exam — ${new Date().toLocaleDateString("en-GB")}`;
  return files[0].name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
function deriveTitleFromPapers(papers: ExamPaper[]) {
  if (!papers.length) return `Exam — ${new Date().toLocaleDateString("en-GB")}`;
  return `${papers[0].name} — Predicted ${new Date().getFullYear()}`;
}

export default function Home() {
  const router = useRouter();
  const { T } = useT();
  const D = T.dashboard;

  // ── Upload mode state ──────────────────────────────────────────────────────
  const [inputMode, setInputMode] = useState<InputMode>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Library mode state ─────────────────────────────────────────────────────
  const [libraryPapers, setLibraryPapers] = useState<ExamPaper[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);

  // ── Shared state ───────────────────────────────────────────────────────────
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [examContent, setExamContent] = useState("");
  const [markingContent, setMarkingContent] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("exam");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [recentExams, setRecentExams] = useState<RecentExam[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  useEffect(() => {
    fetch("/api/exams")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setRecentExams(d); })
      .catch(() => {})
      .finally(() => setLoadingRecent(false));
  }, []);

  const loadLibrary = useCallback(() => {
    if (libraryLoaded) return;
    setLoadingLibrary(true);
    fetch("/api/papers")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setLibraryPapers(d as ExamPaper[]); })
      .catch(() => {})
      .finally(() => { setLoadingLibrary(false); setLibraryLoaded(true); });
  }, [libraryLoaded]);

  const switchMode = (mode: InputMode) => {
    setInputMode(mode);
    if (mode === "library") loadLibrary();
  };

  const togglePaper = (id: string) => {
    setSelectedPaperIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < MAX_FILES ? [...prev, id] : prev
    );
  };

  // ── File upload handlers ───────────────────────────────────────────────────
  const addFiles = useCallback((newFiles: File[]) => {
    const valid = newFiles.filter(f => ACCEPTED_TYPES.includes(f.type));
    if (valid.length < newFiles.length) setError("Some files skipped — PDF, PNG, JPG, WEBP only.");
    setFiles(prev => {
      if (prev.length >= MAX_FILES) return prev;
      const existing = new Set(prev.map(f => f.name + f.size));
      const toAdd = valid.filter(f => !existing.has(f.name + f.size));
      const combined = [...prev, ...toAdd].slice(0, MAX_FILES);
      const oversized = combined.find(f => f.size > MAX_FILE_BYTES);
      if (oversized) { setTimeout(() => setError(`"${oversized.name}" exceeds 20 MB.`), 0); return prev; }
      const totalSize = combined.reduce((s, f) => s + f.size, 0);
      if (totalSize > MAX_TOTAL_BYTES) { setTimeout(() => setError("Total size exceeds 60 MB."), 0); return prev; }
      return combined;
    });
  }, []);

  const removeFile = (i: number) => setFiles(p => p.filter((_, j) => j !== i));
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false); addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  // ── Streaming helper ───────────────────────────────────────────────────────
  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
    setError("");
  }, []);

  const streamResponse = async (url: string, init: RequestInit, onChunk: (t: string) => void) => {
    abortRef.current = new AbortController();
    const res = await fetch(url, { ...init, signal: abortRef.current.signal });
    if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error); }
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
  };

  // ── Generate ───────────────────────────────────────────────────────────────
  const generateExam = async () => {
    setConfirmRegenerate(false);
    setError(""); setExamContent(""); setMarkingContent("");
    setStatus("generating-exam"); setActiveTab("exam");

    try {
      if (inputMode === "library") {
        if (!selectedPaperIds.length) { setError("Select at least one paper from your library."); setStatus("idle"); return; }
        await streamResponse(
          "/api/generate-from-library",
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paperIds: selectedPaperIds, notes: notes.trim() || undefined }) },
          c => setExamContent(p => p + c)
        );
      } else {
        if (!files.length) { setError("Upload at least one exam paper."); setStatus("idle"); return; }
        const fd = new FormData();
        files.forEach(f => fd.append("files", f));
        if (notes.trim()) fd.append("notes", notes.trim());
        await streamResponse("/api/generate-exam", { method: "POST", body: fd }, c => setExamContent(p => p + c));
      }
      setStatus("done-exam");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") { setStatus("idle"); return; }
      setError(err instanceof Error ? err.message : "Failed"); setStatus("idle");
    }
  };

  const generateMarking = async () => {
    if (!examContent.trim()) return;
    setError(""); setMarkingContent("");
    setStatus("generating-marking"); setActiveTab("marking");
    try {
      await streamResponse("/api/generate-marking",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ examContent }) },
        c => setMarkingContent(p => p + c));
      setStatus("done-marking");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") { setStatus("done-exam"); return; }
      setError(err instanceof Error ? err.message : "Failed"); setStatus("done-exam");
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const saveExam = async () => {
    if (!examContent || isSaving) return;
    setIsSaving(true); setError("");
    try {
      const fd = new FormData();
      fd.append("predicted_exam", examContent);
      fd.append("marking_scheme", markingContent);

      if (inputMode === "library") {
        const selected = libraryPapers.filter(p => selectedPaperIds.includes(p.id));
        fd.append("title", deriveTitleFromPapers(selected));
        selectedPaperIds.forEach(id => fd.append("paper_ids", id));
      } else {
        files.forEach(f => fd.append("files", f));
        fd.append("title", deriveTitleFromFiles(files));
      }

      const res = await fetch("/api/exams", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Save failed");
      const { id } = await res.json();
      router.push(`/exams/${id}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); setIsSaving(false); }
  };

  const isGenerating = status === "generating-exam" || status === "generating-marking";
  const hasExam = examContent.replace(/<!--FROM_STRUCTURE-->/, "").trim().length > 0;
  const hasMarking = markingContent.length > 0;
  const canGenerate = inputMode === "upload" ? files.length > 0 : selectedPaperIds.length > 0;

  const filteredLibrary = libraryPapers.filter(p => {
    if (!librarySearch) return true;
    const q = librarySearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.subject.toLowerCase().includes(q) ||
      (TYPE_LABELS[p.exam_type] ?? p.exam_type).toLowerCase().includes(q) ||
      String(p.year).includes(q);
  });

  const cleanExamContent = examContent.replace(/<!--FROM_STRUCTURE-->\n?/, "");
  const fromStructure = examContent.startsWith("<!--FROM_STRUCTURE-->");

  return (
    <div className="min-h-screen bg-ink text-snow md:pl-56">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-bottom-nav md:pb-8 space-y-8">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-snow">{D.pageHeading}</h1>
            <p className="text-sm text-dim mt-0.5">Upload past papers — get AI-predicted exam questions</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-teal/30 bg-teal-deep/20 px-3 py-2">
            <svg className="w-4 h-4 text-teal shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="text-xs text-dim">AI-powered</span>
          </div>
        </div>

        {/* ── Input + controls ─────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT — source picker */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-body mb-1">{D.sourceHeading}</h2>
              <p className="text-sm text-dim">{D.sourceSub}</p>
            </div>

            {/* Mode tabs */}
            <div className="flex rounded-xl border border-line overflow-hidden bg-ink-2/40 p-1 gap-1">
              {([
                { mode: "upload" as InputMode, label: D.uploadTab, icon: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" },
                { mode: "library" as InputMode, label: D.libraryTab, icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
              ] as const).map(({ mode, label, icon }) => (
                <button key={mode} onClick={() => switchMode(mode)}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all cursor-pointer ${
                    inputMode === mode
                      ? "bg-teal text-ink shadow-sm"
                      : "text-dim hover:text-snow"
                  }`}>
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                  </svg>
                  {label}
                  {mode === "library" && selectedPaperIds.length > 0 && (
                    <span className="ml-0.5 text-xs bg-teal/20 text-teal px-1.5 py-0.5 rounded-full">
                      {selectedPaperIds.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Upload Files panel ──────────────────────────────────────── */}
            {inputMode === "upload" && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-dim">{D.filesCount(files.length, MAX_FILES)}</span>
                  {files.length >= MAX_FILES && (
                    <span className="text-xs text-gold">{D.limitReached}</span>
                  )}
                </div>
                <div
                  onClick={() => files.length < MAX_FILES && !isGenerating && fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); if (files.length < MAX_FILES) setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  className={`rounded-xl border-2 border-dashed p-8 transition-all flex flex-col items-center justify-center gap-3 min-h-[160px] ${
                    files.length >= MAX_FILES || isGenerating
                      ? "opacity-40 cursor-not-allowed border-line bg-ink-2/30"
                      : isDragging
                      ? "cursor-pointer border-teal bg-teal-deep/20"
                      : "cursor-pointer border-line hover:border-line-2 bg-ink-2/50 hover:bg-ink-2"
                  }`}>
                  <UploadIcon />
                  <div className="text-center">
                    <p className="text-sm text-body font-medium">
                      {files.length >= MAX_FILES
                        ? D.maxReached
                        : <>{D.dropFiles} <span className="text-teal underline underline-offset-2">{D.browse}</span></>}
                    </p>
                    <p className="text-xs text-dim mt-1">{D.dropSub(MAX_FILES)}</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} multiple
                    onChange={e => { if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = ""; } }}
                    className="hidden" disabled={files.length >= MAX_FILES || isGenerating} />
                </div>
                {files.length > 0 && (
                  <ul className="space-y-2">
                    {files.map((file, i) => (
                      <li key={`${file.name}-${file.size}`}
                        className="flex items-center gap-3 rounded-lg bg-ink-3/60 border border-line px-3 py-2">
                        <svg className="w-5 h-5 shrink-0 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-body truncate font-medium">{file.name}</p>
                          <p className="text-xs text-dim">{formatFileSize(file.size)}</p>
                        </div>
                        <button onClick={() => removeFile(i)} disabled={isGenerating}
                          className="text-dim hover:text-bad disabled:opacity-50 p-0.5 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {/* ── From Library panel ──────────────────────────────────────── */}
            {inputMode === "library" && (
              <div className="space-y-3">
                {/* Selected papers */}
                {selectedPaperIds.length > 0 && (
                  <div className="rounded-xl bg-teal-deep/30 border border-teal-deep p-3 space-y-2">
                    <p className="text-xs font-semibold text-teal">
                      {D.selected(selectedPaperIds.length, MAX_FILES)}
                    </p>
                    {libraryPapers.filter(p => selectedPaperIds.includes(p.id)).map(p => (
                      <div key={p.id} className="flex items-center gap-2 text-xs text-body">
                        <span className="flex-1 truncate">{p.name} — {p.subject} {p.year}</span>
                        {p.exam_structure
                          ? <span className="text-xs text-good shrink-0 font-medium">{D.structureReady}</span>
                          : <span className="text-xs text-dim shrink-0">PDF</span>
                        }
                        <button onClick={() => togglePaper(p.id)}
                          className="text-teal hover:text-bad shrink-0 transition-colors cursor-pointer">✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input value={librarySearch} onChange={e => setLibrarySearch(e.target.value)}
                    placeholder={D.searchPlaceholder}
                    className="w-full rounded-xl bg-ink border border-line focus:border-teal text-body placeholder-dim text-sm pl-9 pr-4 py-2.5 outline-none transition-colors" />
                </div>

                {/* Paper grid */}
                {loadingLibrary ? (
                  <div className="grid grid-cols-1 gap-2">
                    {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-ink-3/50 animate-pulse" />)}
                  </div>
                ) : filteredLibrary.length === 0 ? (
                  <div className="rounded-xl border border-line bg-ink-2/30 p-6 text-center">
                    {libraryPapers.length === 0 ? (
                      <>
                        <p className="text-sm text-body mb-3">{D.emptyLibrary}</p>
                        <Link href="/papers/upload"
                          className="text-xs text-teal hover:text-snow underline underline-offset-2">
                          {D.uploadFirst}
                        </Link>
                      </>
                    ) : (
                      <p className="text-sm text-dim">{D.noMatch}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                    {filteredLibrary.map(paper => {
                      const isSelected = selectedPaperIds.includes(paper.id);
                      const atMax = selectedPaperIds.length >= MAX_FILES && !isSelected;
                      return (
                        <button key={paper.id} onClick={() => !atMax && togglePaper(paper.id)}
                          disabled={atMax}
                          className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all flex items-center gap-3 ${
                            isSelected
                              ? "border-teal bg-teal-deep/30"
                              : atMax
                              ? "border-line bg-ink-2/20 opacity-40 cursor-not-allowed"
                              : "border-line bg-ink-2/50 hover:border-line-2 hover:bg-ink-2"
                          }`}>
                          {/* Checkbox */}
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? "bg-teal border-teal" : "border-line"
                          }`}>
                            {isSelected && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-body truncate">{paper.name}</span>
                              <span className="text-xs text-dim shrink-0">{paper.year}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-dim truncate">{paper.subject}</span>
                              <span className="text-xs text-dim shrink-0">·</span>
                              <span className="text-xs text-dim shrink-0">{TYPE_LABELS[paper.exam_type] ?? paper.exam_type}</span>
                            </div>
                          </div>
                          {/* Structure status */}
                          {paper.exam_structure
                            ? <span className="text-xs text-good shrink-0 font-medium">{D.structureReady}</span>
                            : <span className="text-xs text-dim shrink-0">{D.analysing}</span>
                          }
                        </button>
                      );
                    })}
                  </div>
                )}

                {libraryPapers.length > 0 && (
                  <Link href="/papers/upload"
                    className="flex items-center gap-1.5 text-xs text-dim hover:text-teal transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {D.uploadAnother}
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* RIGHT — notes + actions ──────────────────────────────────────── */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-body mb-1">{D.notesHeading}</h2>
              <p className="text-sm text-dim">{D.notesSub}</p>
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={isGenerating}
              placeholder={D.notesPlaceholder}
              rows={6}
              className="w-full rounded-xl bg-ink border border-line text-body placeholder-dim text-sm px-4 py-3 resize-none focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/30 transition-colors disabled:opacity-50" />

            {error && (
              <div className="rounded-lg border border-bad/50 bg-bad/10 px-4 py-3 text-sm text-bad">{error}</div>
            )}

            {confirmRegenerate && (
              <div className="flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2.5">
                <p className="text-xs text-gold flex-1">{D.replaceExam}</p>
                <button onClick={generateExam}
                  className="text-xs font-semibold text-on-gold bg-gold hover:bg-gold-hover px-3 py-1.5 rounded-lg transition-colors shrink-0">
                  {D.replaceBtn}
                </button>
                <button onClick={() => setConfirmRegenerate(false)}
                  className="text-xs text-dim hover:text-snow px-2 py-1.5 transition-colors shrink-0 cursor-pointer">
                  {T.common.cancel}
                </button>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={hasExam ? () => setConfirmRegenerate(true) : generateExam}
                disabled={isGenerating || !canGenerate}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-teal hover:bg-teal-deep text-ink disabled:bg-ink-3 disabled:text-dim font-semibold py-3 px-6 transition-all focus:outline-none cursor-pointer">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                {status === "generating-exam"
                  ? (<>{D.generatingBtn}<LoadingDots /></>)
                  : inputMode === "library" && selectedPaperIds.length > 0
                  ? D.generateFrom(selectedPaperIds.length)
                  : D.generateBtn}
              </button>

              {isGenerating && (
                <button onClick={cancelGeneration}
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-line hover:border-line-2 text-dim hover:text-snow font-medium py-3 px-6 transition-colors cursor-pointer">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {T.common.cancel}
                </button>
              )}

              {hasExam && (
                <button onClick={generateMarking} disabled={isGenerating}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-good/20 hover:bg-good/30 disabled:bg-ink-3 disabled:text-dim text-good border border-good/30 font-semibold py-3 px-6 transition-all cursor-pointer">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {status === "generating-marking" ? (<>{D.generatingMarking}<LoadingDots /></>) : D.markingSchemeBtn}
                </button>
              )}

              {hasExam && !isGenerating && (
                <button onClick={saveExam} disabled={isSaving}
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-teal-deep hover:bg-teal-deep/20 disabled:opacity-50 text-teal font-semibold py-3 px-6 transition-all cursor-pointer">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  {isSaving ? D.savingBtn : D.saveBtn}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── Output preview ───────────────────────────────────────────────── */}
        {(hasExam || status === "generating-exam") && (
          <section className="space-y-4">
            <div className="flex items-center gap-1 border-b border-line">
              {(["exam", "marking"] as Tab[]).map(tab => {
                const isActive = activeTab === tab;
                const isMarking = tab === "marking";
                if (isMarking && !hasMarking && status !== "generating-marking") return null;
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      isActive
                        ? isMarking ? "text-good border-good/50 bg-ink-3/50" : "text-teal border-teal/50 bg-ink-3/50"
                        : "text-dim border-transparent hover:text-snow"
                    }`}>
                    {isMarking ? T.examViewer.markingScheme : T.examViewer.predictedExam}
                    {!isMarking && status === "generating-exam" && <LoadingDots />}
                    {isMarking && status === "generating-marking" && <LoadingDots />}
                  </button>
                );
              })}
              {/* Structure badge */}
              {fromStructure && activeTab === "exam" && status !== "generating-exam" && (
                <span className="ml-auto text-xs text-good flex items-center gap-1 pr-2">
                  {D.fromStructureBadge}
                </span>
              )}
            </div>
            <div className="rounded-xl border border-line bg-ink-2/60 p-6 min-h-[300px]">
              {activeTab === "exam" && (
                cleanExamContent
                  ? <ExamOutput content={cleanExamContent} isStreaming={status === "generating-exam"} />
                  : <div className="flex flex-col items-center justify-center h-48 gap-3 text-dim">
                      <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm">{D.analysing2}</p>
                    </div>
              )}
              {activeTab === "marking" && (
                markingContent
                  ? <ExamOutput content={markingContent} isStreaming={status === "generating-marking"} />
                  : <div className="flex flex-col items-center justify-center h-48 gap-3 text-dim">
                      <div className="w-8 h-8 border-2 border-good border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm">{D.generatingScheme}</p>
                    </div>
              )}
            </div>
          </section>
        )}

        {/* ── My recent exams ──────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-body">{D.myExamsHeading}</h2>
            {!loadingRecent && recentExams.length > 0 && (
              <span className="text-xs text-dim">{D.saved(recentExams.length)}</span>
            )}
          </div>

          {loadingRecent ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 rounded-xl bg-ink-3/50 border border-line animate-pulse" />
              ))}
            </div>
          ) : recentExams.length === 0 ? (
            <div className="rounded-xl border border-line bg-ink-2/40 p-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-teal-deep/40 border border-teal/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-body mb-1">{D.noExams}</p>
              <p className="text-xs text-dim">Upload a past paper above to generate your first AI exam</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentExams.map(exam => (
                <Link key={exam.id} href={`/exams/${exam.id}`}
                  className="block rounded-xl border border-line bg-ink-2/60 hover:bg-ink-2 hover:border-teal/40 p-4 transition-all group cursor-pointer card-accent-teal">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-body group-hover:text-snow line-clamp-2 leading-snug flex-1">
                      {exam.title}
                    </h3>
                    <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full border mt-0.5 ${
                      exam.is_public ? "text-good border-teal-deep" : "text-dim border-line"
                    }`}>
                      {exam.is_public ? T.common.public : T.common.private}
                    </span>
                  </div>
                  <p className="text-xs text-dim mb-2 truncate">
                    {exam.original_filenames.slice(0, 2).join(", ")}
                    {exam.original_filenames.length > 2 && ` +${exam.original_filenames.length - 2}`}
                  </p>
                  <p className="text-xs text-dim" suppressHydrationWarning>{formatDate(exam.created_at)}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

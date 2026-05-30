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
    <svg className="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}
function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1 ml-2">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
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
  const streamResponse = async (url: string, init: RequestInit, onChunk: (t: string) => void) => {
    const res = await fetch(url, init);
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
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); setStatus("idle"); }
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
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); setStatus("done-exam"); }
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
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Input + controls ─────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT — source picker */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-200 mb-1">{D.sourceHeading}</h2>
              <p className="text-sm text-gray-500">{D.sourceSub}</p>
            </div>

            {/* Mode tabs */}
            <div className="flex rounded-xl border border-gray-800 overflow-hidden bg-gray-900/40 p-1 gap-1">
              {([
                { mode: "upload" as InputMode, label: D.uploadTab, icon: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" },
                { mode: "library" as InputMode, label: D.libraryTab, icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
              ] as const).map(({ mode, label, icon }) => (
                <button key={mode} onClick={() => switchMode(mode)}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    inputMode === mode
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-gray-200"
                  }`}>
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                  </svg>
                  {label}
                  {mode === "library" && selectedPaperIds.length > 0 && (
                    <span className="ml-0.5 text-xs bg-indigo-400/30 text-indigo-200 px-1.5 py-0.5 rounded-full">
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
                  <span className="text-xs text-gray-600">{D.filesCount(files.length, MAX_FILES)}</span>
                  {files.length >= MAX_FILES && (
                    <span className="text-xs text-amber-400">{D.limitReached}</span>
                  )}
                </div>
                <div
                  onClick={() => files.length < MAX_FILES && !isGenerating && fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); if (files.length < MAX_FILES) setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  className={`rounded-xl border-2 border-dashed p-8 transition-all flex flex-col items-center justify-center gap-3 min-h-[160px] ${
                    files.length >= MAX_FILES || isGenerating
                      ? "opacity-40 cursor-not-allowed border-gray-700 bg-gray-900/30"
                      : isDragging
                      ? "cursor-pointer border-indigo-400 bg-indigo-950/30"
                      : "cursor-pointer border-gray-700 hover:border-gray-500 bg-gray-900/50 hover:bg-gray-900"
                  }`}>
                  <UploadIcon />
                  <div className="text-center">
                    <p className="text-sm text-gray-300 font-medium">
                      {files.length >= MAX_FILES
                        ? D.maxReached
                        : <>{D.dropFiles} <span className="text-indigo-400 underline underline-offset-2">{D.browse}</span></>}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{D.dropSub(MAX_FILES)}</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} multiple
                    onChange={e => { if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = ""; } }}
                    className="hidden" disabled={files.length >= MAX_FILES || isGenerating} />
                </div>
                {files.length > 0 && (
                  <ul className="space-y-2">
                    {files.map((file, i) => (
                      <li key={`${file.name}-${file.size}`}
                        className="flex items-center gap-3 rounded-lg bg-gray-800/60 border border-gray-700 px-3 py-2">
                        <svg className="w-5 h-5 shrink-0 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-200 truncate font-medium">{file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                        <button onClick={() => removeFile(i)} disabled={isGenerating}
                          className="text-gray-500 hover:text-red-400 disabled:opacity-50 p-0.5 transition-colors">
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
                  <div className="rounded-xl bg-indigo-950/30 border border-indigo-800/50 p-3 space-y-2">
                    <p className="text-xs font-semibold text-indigo-300">
                      {D.selected(selectedPaperIds.length, MAX_FILES)}
                    </p>
                    {libraryPapers.filter(p => selectedPaperIds.includes(p.id)).map(p => (
                      <div key={p.id} className="flex items-center gap-2 text-xs text-indigo-200">
                        <span className="flex-1 truncate">{p.name} — {p.subject} {p.year}</span>
                        {p.exam_structure
                          ? <span className="text-emerald-400 shrink-0" title="Structure ready — instant generation">⚡</span>
                          : <span className="text-gray-500 shrink-0" title="No structure yet — will download PDF">PDF</span>
                        }
                        <button onClick={() => togglePaper(p.id)}
                          className="text-indigo-400 hover:text-red-400 shrink-0 transition-colors">✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input value={librarySearch} onChange={e => setLibrarySearch(e.target.value)}
                    placeholder={D.searchPlaceholder}
                    className="w-full rounded-xl bg-gray-900 border border-gray-700 focus:border-indigo-500 text-gray-200 placeholder-gray-600 text-sm pl-9 pr-4 py-2.5 outline-none transition-colors" />
                </div>

                {/* Paper grid */}
                {loadingLibrary ? (
                  <div className="grid grid-cols-1 gap-2">
                    {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-900/50 animate-pulse" />)}
                  </div>
                ) : filteredLibrary.length === 0 ? (
                  <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-6 text-center">
                    {libraryPapers.length === 0 ? (
                      <>
                        <p className="text-sm text-gray-500 mb-3">{D.emptyLibrary}</p>
                        <Link href="/papers/upload"
                          className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                          {D.uploadFirst}
                        </Link>
                      </>
                    ) : (
                      <p className="text-sm text-gray-600">{D.noMatch}</p>
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
                              ? "border-indigo-600 bg-indigo-950/40"
                              : atMax
                              ? "border-gray-800 bg-gray-900/20 opacity-40 cursor-not-allowed"
                              : "border-gray-800 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-900"
                          }`}>
                          {/* Checkbox */}
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-600"
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
                              <span className="text-xs font-semibold text-gray-200 truncate">{paper.name}</span>
                              <span className="text-xs text-gray-500 shrink-0">{paper.year}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 truncate">{paper.subject}</span>
                              <span className="text-xs text-gray-700 shrink-0">·</span>
                              <span className="text-xs text-gray-600 shrink-0">{TYPE_LABELS[paper.exam_type] ?? paper.exam_type}</span>
                            </div>
                          </div>
                          {/* Structure status */}
                          {paper.exam_structure
                            ? <span className="text-xs text-emerald-500 shrink-0 font-medium">⚡ {D.structureReady}</span>
                            : <span className="text-xs text-gray-600 shrink-0">{D.analysing}</span>
                          }
                        </button>
                      );
                    })}
                  </div>
                )}

                {libraryPapers.length > 0 && (
                  <Link href="/papers/upload"
                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-indigo-400 transition-colors">
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
              <h2 className="text-base font-semibold text-gray-200 mb-1">{D.notesHeading}</h2>
              <p className="text-sm text-gray-500">{D.notesSub}</p>
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={isGenerating}
              placeholder={D.notesPlaceholder}
              rows={6}
              className="w-full rounded-xl bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-600 text-sm px-4 py-3 resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors disabled:opacity-50" />

            {error && (
              <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <div className="flex flex-col gap-3">
              <button onClick={generateExam} disabled={isGenerating || !canGenerate}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-3 px-6 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
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

              {hasExam && (
                <button onClick={generateMarking} disabled={isGenerating}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-3 px-6 transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {status === "generating-marking" ? (<>{D.generatingMarking}<LoadingDots /></>) : D.markingSchemeBtn}
                </button>
              )}

              {hasExam && !isGenerating && (
                <button onClick={saveExam} disabled={isSaving}
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-indigo-700 hover:bg-indigo-950 disabled:opacity-50 text-indigo-300 font-semibold py-3 px-6 transition-all">
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
            <div className="flex items-center gap-1 border-b border-gray-800">
              {(["exam", "marking"] as Tab[]).map(tab => {
                const isActive = activeTab === tab;
                const isMarking = tab === "marking";
                if (isMarking && !hasMarking && status !== "generating-marking") return null;
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
                      isActive
                        ? isMarking ? "text-emerald-300 border-emerald-500 bg-gray-900/50" : "text-indigo-300 border-indigo-500 bg-gray-900/50"
                        : "text-gray-500 border-transparent hover:text-gray-300"
                    }`}>
                    {isMarking ? T.examViewer.markingScheme : T.examViewer.predictedExam}
                    {!isMarking && status === "generating-exam" && <LoadingDots />}
                    {isMarking && status === "generating-marking" && <LoadingDots />}
                  </button>
                );
              })}
              {/* Structure badge */}
              {fromStructure && activeTab === "exam" && status !== "generating-exam" && (
                <span className="ml-auto text-xs text-emerald-500 flex items-center gap-1 pr-2">
                  <span>⚡</span> {D.fromStructureBadge}
                </span>
              )}
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 min-h-[300px]">
              {activeTab === "exam" && (
                cleanExamContent
                  ? <ExamOutput content={cleanExamContent} isStreaming={status === "generating-exam"} />
                  : <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-600">
                      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm">{D.analysing2}</p>
                    </div>
              )}
              {activeTab === "marking" && (
                markingContent
                  ? <ExamOutput content={markingContent} isStreaming={status === "generating-marking"} />
                  : <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-600">
                      <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm">{D.generatingScheme}</p>
                    </div>
              )}
            </div>
          </section>
        )}

        {/* ── My recent exams ──────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-300">{D.myExamsHeading}</h2>
            {!loadingRecent && recentExams.length > 0 && (
              <span className="text-xs text-gray-600">{D.saved(recentExams.length)}</span>
            )}
          </div>

          {loadingRecent ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 rounded-xl bg-gray-900/50 border border-gray-800 animate-pulse" />
              ))}
            </div>
          ) : recentExams.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-8 text-center">
              <p className="text-sm text-gray-600">{D.noExams}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentExams.map(exam => (
                <a key={exam.id} href={`/exams/${exam.id}`}
                  className="block rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-900 hover:border-gray-600 p-4 transition-all group">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-gray-200 group-hover:text-white line-clamp-2 leading-snug flex-1">
                      {exam.title}
                    </h3>
                    <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full border mt-0.5 ${
                      exam.is_public ? "text-emerald-400 border-emerald-800" : "text-gray-600 border-gray-700"
                    }`}>
                      {exam.is_public ? T.common.public : T.common.private}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2 truncate">
                    {exam.original_filenames.slice(0, 2).join(", ")}
                    {exam.original_filenames.length > 2 && ` +${exam.original_filenames.length - 2}`}
                  </p>
                  <p className="text-xs text-gray-700" suppressHydrationWarning>{formatDate(exam.created_at)}</p>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

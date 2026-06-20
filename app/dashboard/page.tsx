"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExamOutput } from "@/app/components/ExamOutput";
import { Header } from "@/app/components/Header";
import type { ExamPaper } from "@/app/lib/types";
import { useT } from "@/app/lib/language-context";
import { createClient } from "@/app/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

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
  const supabase = createClient();

  // ── User / credits ─────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch("/api/credits").then(r => r.ok ? r.json() : null)
      .then(d => { if (d && typeof d.credits === "number") setCredits(d.credits); })
      .catch(() => {});
  }, [user]);

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

  const displayName = user?.email?.split("@")[0] ?? "";
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "?";
  // Credits ring: treat 100 as max (clamp between 0–100)
  const ringMax = 100;
  const ringVal = Math.max(0, Math.min(credits ?? 0, ringMax));
  const circumference = 2 * Math.PI * 36;

  return (
    <div className="min-h-screen bg-ink text-snow page-shell">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-7 pb-bottom-nav md:pb-10 space-y-5">

        {/* ════════════════════════════════════════════════════════════
            ROW 1 — Stats overview + Recent Exams hero
            ════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 page-in">

          {/* ── Stats card ─────────────────────────────────────────── */}
          <div className="rounded-2xl border border-line bg-ink-2 p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-dim uppercase tracking-widest">Overview</p>
              <Link href="/pricing"
                className="text-[11px] font-semibold text-teal border border-teal/30 bg-teal/5 hover:bg-teal/10 px-2 py-1 rounded-lg transition-colors cursor-pointer">
                Buy credits
              </Link>
            </div>

            {/* Avatar with credits ring */}
            <div className="flex flex-col items-center gap-3 py-1">
              <div className="relative w-22 h-22">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 88 88">
                  <circle cx="44" cy="44" r="38" fill="none" stroke="oklch(0.31 0.015 234)" strokeWidth="4" />
                  <circle cx="44" cy="44" r="38" fill="none"
                    stroke="oklch(0.72 0.20 192)" strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={`${circumference * (ringVal / ringMax)} ${circumference}`} />
                </svg>
                <div className="absolute inset-1.75 rounded-full bg-teal/10 border border-teal/20 flex items-center justify-center text-base font-bold text-teal select-none">
                  {initials}
                </div>
              </div>

              {credits !== null && (
                <span className="text-[11px] font-semibold bg-teal/10 text-teal border border-teal/20 rounded-full px-3 py-1">
                  {credits} credits left
                </span>
              )}

              <div className="text-center">
                <p className="font-display text-xl font-bold text-snow leading-snug">
                  Welcome{displayName ? `, ${displayName}` : " back"}
                </p>
                <p className="text-xs text-dim mt-0.5">Ready to ace your exams?</p>
              </div>
            </div>

            {/* Credits progress bar */}
            {credits !== null && (
              <div className="space-y-1.5 px-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-dim">Monthly activity</span>
                  <span className="font-semibold text-body">{ringVal}%</span>
                </div>
                <div className="h-2 rounded-full bg-ink-3 overflow-hidden">
                  <div className="h-full rounded-full bg-teal transition-all duration-700"
                    style={{ width: `${ringVal}%` }} />
                </div>
              </div>
            )}

            {/* 3 stat boxes */}
            <div className="grid grid-cols-3 gap-2 mt-auto">
              {([
                {
                  value: isGenerating ? "1" : "0",
                  label: "Active",
                  path: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
                  accent: "text-gold bg-gold/10 border-gold/20",
                },
                {
                  value: loadingRecent ? "—" : String(recentExams.length),
                  label: "Exams",
                  path: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
                  accent: "text-coral bg-coral/10 border-coral/20",
                },
                {
                  value: libraryLoaded ? String(libraryPapers.length) : "—",
                  label: "Papers",
                  path: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
                  accent: "text-brand-magenta bg-brand-magenta/10 border-brand-magenta/20",
                },
              ] as const).map(({ value, label, path, accent }) => (
                <div key={label} className={`rounded-xl border p-3 flex flex-col items-center gap-1.5 ${accent}`}>
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
                  </svg>
                  <span className="font-display text-xl font-bold leading-none">{value}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Exams hero (coral) ────────────────────────────────── */}
          <div className="lg:col-span-2 rounded-2xl p-6 flex flex-col gap-5 overflow-hidden relative"
            style={{ background: "linear-gradient(135deg, oklch(0.60 0.20 30) 0%, oklch(0.55 0.17 24) 100%)" }}>

            {/* Decorative blobs */}
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20"
              style={{ background: "oklch(0.75 0.15 55)" }} />
            <div className="absolute bottom-4 right-16 w-24 h-24 rounded-full opacity-10"
              style={{ background: "oklch(0.85 0.10 35)" }} />

            <div className="relative flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold text-white">Your Exams</h2>
              <div className="flex items-center gap-2">
                {recentExams.length > 3 && (
                  <span className="text-xs font-semibold text-white/70">
                    {recentExams.length} total
                  </span>
                )}
                <Link href="/exams"
                  className="text-xs font-semibold text-white border border-white/25 bg-white/15 hover:bg-white/25 rounded-lg px-3 py-1.5 transition-all cursor-pointer">
                  View all
                </Link>
              </div>
            </div>

            {loadingRecent ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 flex-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-xl h-40 animate-pulse" style={{ background: "oklch(0.70 0.15 30 / 0.3)" }} />
                ))}
              </div>
            ) : recentExams.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-6 text-white/60">
                <svg className="w-12 h-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">No exams yet</p>
                  <p className="text-xs text-white/50 mt-0.5">Generate your first predicted exam below</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 flex-1">
                {recentExams.slice(0, 3).map((exam, i) => {
                  const pct = [72, 46, 56][i % 3];
                  return (
                    <Link key={exam.id} href={`/exams/${exam.id}`}
                      className="group relative block rounded-xl bg-white p-4 hover:-translate-y-1 hover:shadow-xl transition-all duration-200 cursor-pointer">
                      {/* File icon */}
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                        style={{ background: "oklch(0.94 0.04 30)" }}>
                        <svg className="w-4 h-4" style={{ color: "oklch(0.60 0.20 30)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>

                      <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug mb-2 group-hover:text-[oklch(0.60_0.20_30)] transition-colors">
                        {exam.title}
                      </h3>

                      <div className="flex flex-wrap gap-1 mb-3">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          exam.is_public
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {exam.is_public ? "Public" : "Private"}
                        </span>
                        <span className="text-[10px] font-medium bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full">
                          AI
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-gray-400">Reviewed</span>
                          <span className="text-xs font-bold" style={{ color: "oklch(0.60 0.20 30)" }}>
                            {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "oklch(0.60 0.20 30)" }} />
                        </div>
                      </div>

                      <p className="text-[10px] text-gray-400 mt-2 truncate" suppressHydrationWarning>
                        {formatDate(exam.created_at)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            ROW 2 — Generate tool + AI Tools panel
            ════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 card-enter card-enter-1">

          {/* ── Generate section (2/3) ─────────────────────────────── */}
          <section className="lg:col-span-2 rounded-2xl border border-line bg-ink-2/40 overflow-hidden">

            {/* Section header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-snow leading-none">{D.pageHeading}</h2>
                  <p className="text-[11px] text-dim mt-0.5">Upload past papers — get AI-predicted exam questions</p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-teal border border-teal/25 bg-teal/5 px-2 py-1 rounded-lg">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                AI-powered
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5">
              {/* LEFT — source picker */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-dim uppercase tracking-widest mb-1">{D.sourceHeading}</p>
                  <p className="text-xs text-dim">{D.sourceSub}</p>
                </div>

                {/* Mode tabs */}
                <div className="flex rounded-xl border border-line overflow-hidden bg-ink-2/40 p-1 gap-1">
                  {([
                    { mode: "upload" as InputMode, label: D.uploadTab, icon: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" },
                    { mode: "library" as InputMode, label: D.libraryTab, icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
                  ] as const).map(({ mode, label, icon }) => (
                    <button key={mode} onClick={() => switchMode(mode)} cursor-pointer
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                        inputMode === mode ? "bg-teal text-ink shadow-sm" : "text-dim hover:text-snow"
                      }`}>
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                      </svg>
                      {label}
                      {mode === "library" && selectedPaperIds.length > 0 && (
                        <span className="ml-0.5 text-[10px] bg-teal/20 text-teal px-1.5 py-0.5 rounded-full">
                          {selectedPaperIds.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* ── Upload Files panel ────────────────────────────── */}
                {inputMode === "upload" && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-dim">{D.filesCount(files.length, MAX_FILES)}</span>
                      {files.length >= MAX_FILES && (
                        <span className="text-[11px] text-gold">{D.limitReached}</span>
                      )}
                    </div>
                    <div
                      onClick={() => files.length < MAX_FILES && !isGenerating && fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={e => { e.preventDefault(); if (files.length < MAX_FILES) setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      className={`rounded-xl border-2 border-dashed p-6 transition-all flex flex-col items-center justify-center gap-2.5 min-h-32.5 select-none ${
                        files.length >= MAX_FILES || isGenerating
                          ? "opacity-40 cursor-not-allowed border-line bg-ink-2/20"
                          : isDragging
                          ? "cursor-pointer border-teal bg-teal/5 scale-[1.01]"
                          : "cursor-pointer border-line hover:border-teal/40 bg-ink-2/20"
                      }`}>
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${
                        isDragging ? "bg-teal/20 border-teal/40" : "bg-ink-3 border-line"
                      }`}>
                        <svg className={`w-5 h-5 transition-colors ${isDragging ? "text-teal" : "text-dim"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-body font-semibold">
                          {files.length >= MAX_FILES
                            ? D.maxReached
                            : <>{D.dropFiles} <span className="text-teal">{D.browse}</span></>}
                        </p>
                        <p className="text-[10px] text-dim mt-0.5">{D.dropSub(MAX_FILES)}</p>
                      </div>
                      <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} multiple
                        onChange={e => { if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = ""; } }}
                        className="hidden" disabled={files.length >= MAX_FILES || isGenerating} />
                    </div>
                    {files.length > 0 && (
                      <ul className="space-y-1.5">
                        {files.map((file, i) => (
                          <li key={`${file.name}-${file.size}`}
                            className="flex items-center gap-2.5 rounded-lg bg-ink border border-line px-3 py-2">
                            <div className="w-7 h-7 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center shrink-0">
                              <svg className="w-3.5 h-3.5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-body truncate font-medium">{file.name}</p>
                              <p className="text-[10px] text-dim">{formatFileSize(file.size)}</p>
                            </div>
                            <button onClick={() => removeFile(i)} disabled={isGenerating}
                              className="p-1 rounded text-dim hover:text-bad hover:bg-bad/10 disabled:opacity-50 transition-colors cursor-pointer">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}

                {/* ── From Library panel ────────────────────────────── */}
                {inputMode === "library" && (
                  <div className="space-y-3">
                    {selectedPaperIds.length > 0 && (
                      <div className="rounded-xl bg-teal-deep/30 border border-teal-deep p-3 space-y-1.5">
                        <p className="text-[11px] font-semibold text-teal">
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

                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input value={librarySearch} onChange={e => setLibrarySearch(e.target.value)}
                        placeholder={D.searchPlaceholder}
                        className="w-full rounded-lg bg-ink border border-line focus:border-teal text-body placeholder-dim text-xs pl-8 pr-3 py-2 outline-none transition-colors" />
                    </div>

                    {loadingLibrary ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg bg-ink-3/50 animate-pulse" />)}
                      </div>
                    ) : filteredLibrary.length === 0 ? (
                      <div className="rounded-xl border border-line bg-ink-2/30 p-4 text-center">
                        {libraryPapers.length === 0 ? (
                          <>
                            <p className="text-xs text-body mb-2">{D.emptyLibrary}</p>
                            <Link href="/papers/upload" className="text-[11px] text-teal hover:text-snow underline underline-offset-2">
                              {D.uploadFirst}
                            </Link>
                          </>
                        ) : (
                          <p className="text-xs text-dim">{D.noMatch}</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                        {filteredLibrary.map(paper => {
                          const isSelected = selectedPaperIds.includes(paper.id);
                          const atMax = selectedPaperIds.length >= MAX_FILES && !isSelected;
                          return (
                            <button key={paper.id} onClick={() => !atMax && togglePaper(paper.id)} disabled={atMax}
                              className={`w-full text-left rounded-lg border px-3 py-2 transition-all flex items-center gap-2.5 cursor-pointer ${
                                isSelected
                                  ? "border-teal bg-teal-deep/30"
                                  : atMax
                                  ? "border-line bg-ink-2/20 opacity-40 cursor-not-allowed"
                                  : "border-line bg-ink-2/50 hover:border-line-2 hover:bg-ink-2"
                              }`}>
                              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected ? "bg-teal border-teal" : "border-line"
                              }`}>
                                {isSelected && (
                                  <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold text-body truncate">{paper.name}</span>
                                  <span className="text-[10px] text-dim shrink-0">{paper.year}</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-dim truncate">{paper.subject}</span>
                                  <span className="text-[10px] text-dim shrink-0">·</span>
                                  <span className="text-[10px] text-dim shrink-0">{TYPE_LABELS[paper.exam_type] ?? paper.exam_type}</span>
                                </div>
                              </div>
                              {paper.exam_structure
                                ? <span className="text-[10px] text-good shrink-0 font-medium">{D.structureReady}</span>
                                : <span className="text-[10px] text-dim shrink-0">{D.analysing}</span>
                              }
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {libraryPapers.length > 0 && (
                      <Link href="/papers/upload" className="flex items-center gap-1 text-[11px] text-dim hover:text-teal transition-colors">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {D.uploadAnother}
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT — notes + actions */}
              <div className="space-y-4 flex flex-col">
                <div>
                  <p className="text-xs font-bold text-dim uppercase tracking-widest mb-1">{D.notesHeading}</p>
                  <p className="text-xs text-dim">{D.notesSub}</p>
                </div>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} disabled={isGenerating}
                  placeholder={D.notesPlaceholder} rows={5}
                  className="w-full rounded-xl bg-ink border border-line text-body placeholder:text-dim/50 text-sm px-4 py-3 resize-none outline-none focus:border-teal transition-colors disabled:opacity-50 flex-1" />

                {error && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-bad/30 bg-bad/8 px-3 py-2.5 text-xs text-bad">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    {error}
                  </div>
                )}

                {confirmRegenerate && (
                  <div className="flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/8 px-3 py-2.5">
                    <p className="text-[11px] text-gold flex-1">{D.replaceExam}</p>
                    <button onClick={generateExam}
                      className="text-[11px] font-bold text-ink bg-gold hover:opacity-90 px-2.5 py-1 rounded-lg transition-opacity cursor-pointer shrink-0">
                      {D.replaceBtn}
                    </button>
                    <button onClick={() => setConfirmRegenerate(false)}
                      className="text-[11px] text-dim hover:text-snow px-2 py-1 transition-colors shrink-0 cursor-pointer">
                      {T.common.cancel}
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-2 mt-auto">
                  <button
                    onClick={hasExam ? () => setConfirmRegenerate(true) : generateExam}
                    disabled={isGenerating || !canGenerate}
                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-teal hover:opacity-90 text-ink disabled:bg-ink-3 disabled:text-dim disabled:cursor-not-allowed font-bold py-3.5 text-sm transition-all cursor-pointer">
                    {status === "generating-exam" ? (
                      <>
                        <div className="w-4 h-4 border-2 border-ink/40 border-t-ink rounded-full animate-spin" />
                        {D.generatingBtn}
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                        {inputMode === "library" && selectedPaperIds.length > 0
                          ? D.generateFrom(selectedPaperIds.length)
                          : D.generateBtn}
                      </>
                    )}
                  </button>

                  {isGenerating && (
                    <button onClick={cancelGeneration}
                      className="flex items-center justify-center gap-2 w-full rounded-xl border border-line hover:border-line-2 text-dim hover:text-snow font-medium py-2.5 transition-colors cursor-pointer text-sm">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {T.common.cancel}
                    </button>
                  )}

                  {hasExam && (
                    <button onClick={generateMarking} disabled={isGenerating}
                      className="flex items-center justify-center gap-2 w-full rounded-xl bg-good/10 hover:bg-good/20 disabled:opacity-40 text-good border border-good/30 font-semibold py-2.5 text-sm transition-all cursor-pointer">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      {status === "generating-marking" ? (<>{D.generatingMarking}<LoadingDots /></>) : D.markingSchemeBtn}
                    </button>
                  )}

                  {hasExam && !isGenerating && (
                    <button onClick={saveExam} disabled={isSaving}
                      className="flex items-center justify-center gap-2 w-full rounded-xl border border-teal/30 hover:border-teal hover:bg-teal/5 disabled:opacity-50 text-teal font-semibold py-2.5 text-sm transition-all cursor-pointer">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      {isSaving ? D.savingBtn : D.saveBtn}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── AI Tools panel (1/3) ──────────────────────────────── */}
          <div className="rounded-2xl border border-line overflow-hidden relative">
            {/* Gradient background */}
            <div className="absolute inset-0"
              style={{ background: "linear-gradient(145deg, oklch(0.25 0.10 340 / 0.7) 0%, oklch(0.19 0.010 238) 45%, oklch(0.22 0.08 192 / 0.5) 100%)" }} />

            <div className="relative p-5 flex flex-col gap-5 h-full">
              <div>
                <p className="text-xs font-bold text-dim uppercase tracking-widest mb-1">AI Tools</p>
                <h3 className="font-display text-xl font-bold text-snow leading-snug">
                  Supercharge your studies
                </h3>
              </div>

              <div className="space-y-2 flex-1">
                {([
                  {
                    href: "/mark",
                    label: "AI Marker",
                    desc: "Grade your answers instantly",
                    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
                    accent: "text-teal bg-teal/10 border-teal/20 group-hover:bg-teal/20",
                  },
                  {
                    href: "/study",
                    label: "Study Room",
                    desc: "Chat with AI about any topic",
                    icon: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337 5.972 5.972 0 01-5.035 2.057 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z",
                    accent: "text-gold bg-gold/10 border-gold/20 group-hover:bg-gold/20",
                  },
                  {
                    href: "/write",
                    label: "AI Writer",
                    desc: "Generate notes & essays",
                    icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z",
                    accent: "text-brand-magenta bg-brand-magenta/10 border-brand-magenta/20 group-hover:bg-brand-magenta/20",
                  },
                  {
                    href: "/discover",
                    label: "Discover",
                    desc: "Browse public exam papers",
                    icon: "M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c-.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z",
                    accent: "text-coral bg-coral/10 border-coral/20 group-hover:bg-coral/20",
                  },
                ] as const).map(({ href, label, desc, icon, accent }) => (
                  <Link key={href} href={href}
                    className="group flex items-center gap-3 p-2.5 rounded-xl bg-ink/30 hover:bg-ink/50 border border-white/5 hover:border-white/10 transition-all cursor-pointer">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${accent}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-body group-hover:text-snow transition-colors leading-none">{label}</p>
                      <p className="text-[10px] text-dim mt-0.5 truncate">{desc}</p>
                    </div>
                    <svg className="w-3.5 h-3.5 text-dim group-hover:text-snow shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                ))}
              </div>

              {/* Ask-something input → links to Study Room */}
              <div className="rounded-xl border border-white/10 bg-ink/40 flex items-center gap-2 px-3 py-2.5">
                <svg className="w-4 h-4 text-dim shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337 5.972 5.972 0 01-5.035 2.057 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                <Link href="/study" className="flex-1 text-xs text-dim hover:text-body transition-colors">
                  Ask something...
                </Link>
                <Link href="/study"
                  className="w-7 h-7 rounded-lg bg-teal flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity cursor-pointer">
                  <svg className="w-3.5 h-3.5 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            OUTPUT PREVIEW (conditional)
            ════════════════════════════════════════════════════════════ */}
        {(hasExam || status === "generating-exam") && (
          <section className="rounded-2xl border border-line bg-ink-2/40 overflow-hidden card-enter card-enter-2">
            <div className="flex items-center gap-1 px-2 pt-2 border-b border-line">
              {(["exam", "marking"] as Tab[]).map(tab => {
                const isActive = activeTab === tab;
                const isMarkingTab = tab === "marking";
                if (isMarkingTab && !hasMarking && status !== "generating-marking") return null;
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl border-b-2 -mb-px transition-all cursor-pointer ${
                      isActive
                        ? isMarkingTab ? "text-good border-good bg-good/5" : "text-teal border-teal bg-teal/5"
                        : "text-dim border-transparent hover:text-snow"
                    }`}>
                    {isMarkingTab ? T.examViewer.markingScheme : T.examViewer.predictedExam}
                    {!isMarkingTab && status === "generating-exam" && <LoadingDots />}
                    {isMarkingTab && status === "generating-marking" && <LoadingDots />}
                  </button>
                );
              })}
              {fromStructure && activeTab === "exam" && status !== "generating-exam" && (
                <span className="ml-auto text-xs font-semibold text-good flex items-center gap-1 pr-3">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {D.fromStructureBadge}
                </span>
              )}
            </div>
            <div className="p-6 min-h-75">
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

        {/* ════════════════════════════════════════════════════════════
            ALL EXAMS — full grid (shows when there are more than 3)
            ════════════════════════════════════════════════════════════ */}
        {!loadingRecent && recentExams.length > 3 && (
          <section className="space-y-4 card-enter card-enter-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-dim uppercase tracking-widest">{D.myExamsHeading}</h2>
              <span className="text-xs font-semibold text-dim bg-ink-3 border border-line rounded-full px-2 py-0.5">{D.saved(recentExams.length)}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentExams.slice(3).map((exam, i) => (
                <Link key={exam.id} href={`/exams/${exam.id}`}
                  className={`group block rounded-2xl border border-line bg-ink-2/50 hover:bg-ink-2 hover:border-teal/40 p-5 transition-all cursor-pointer card-enter card-enter-${Math.min(i + 1, 5)}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-sm font-bold text-body group-hover:text-snow line-clamp-2 leading-snug flex-1 transition-colors">
                      {exam.title}
                    </h3>
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-0.5 ${
                      exam.is_public ? "text-good border-good/30 bg-good/10" : "text-dim border-line"
                    }`}>
                      {exam.is_public ? T.common.public : T.common.private}
                    </span>
                  </div>
                  <p className="text-xs text-dim mb-2 truncate">
                    {exam.original_filenames.slice(0, 2).join(", ")}
                    {exam.original_filenames.length > 2 && ` +${exam.original_filenames.length - 2}`}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-dim/60" suppressHydrationWarning>{formatDate(exam.created_at)}</p>
                    <svg className="w-4 h-4 text-dim group-hover:text-teal transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}

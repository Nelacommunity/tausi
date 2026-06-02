"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Exam, ChatMessage } from "@/app/lib/types";
import { ExamOutput } from "@/app/components/ExamOutput";
import { downloadPDF } from "@/app/lib/download-pdf";
import { useT } from "@/app/lib/language-context";

type Tab = "exam" | "marking" | "chat" | "source";

interface ExamViewerProps {
  exam: Exam;
  initialMessages: ChatMessage[];
  isOwner: boolean;
  userTier: "free" | "premium";
  sourceSignedUrls: string[];
}

// ── Icons ────────────────────────────────────────────────────

const Icon = ({ d, size = 4 }: { d: string; size?: number }) => (
  <svg className={`w-${size} h-${size} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
  </svg>
);

function isImage(path: string) {
  return /\.(png|jpg|jpeg|webp)$/i.test(path);
}

const ICONS = {
  pdf:  "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  back: "M10 19l-7-7m0 0l7-7m-7 7h18",
  sparkle: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
  book: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  chat: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z",
  send: "M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5",
  globe: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418",
  lock: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z",
  trash: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0",
  pencil: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125",
  check: "M4.5 12.75l6 6 9-13.5",
  copy: "M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184",
  file: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  external: "M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25",
};

function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1 ml-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function ExamViewer({ exam: initialExam, initialMessages, isOwner, userTier, sourceSignedUrls }: ExamViewerProps) {
  const router = useRouter();
  const { T } = useT();
  const V = T.examViewer;
  const [exam, setExam] = useState(initialExam);
  const [activeTab, setActiveTab] = useState<Tab>("exam");
  const [markingContent, setMarkingContent] = useState(initialExam.marking_scheme);
  const [isGeneratingMarking, setIsGeneratingMarking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [chatInput, setChatInput] = useState("");
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(initialExam.title);
  const [savingTitle, setSavingTitle] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeSourceFile, setActiveSourceFile] = useState(0);
  const [chatContext, setChatContext] = useState<"predicted" | "source">("predicted");
  const examContentRef = useRef<HTMLDivElement>(null);
  const markingContentRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  const patchExam = async (updates: Partial<Exam>) => {
    const res = await fetch(`/api/exams/${exam.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(await res.text());
    setExam((prev) => ({ ...prev, ...updates }));
  };

  const toggleVisibility = async () => {
    setIsTogglingVisibility(true);
    try {
      await patchExam({ is_public: !exam.is_public });
    } catch {
      // ignore
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  const saveTitle = async () => {
    if (!titleDraft.trim() || titleDraft === exam.title) {
      setEditingTitle(false);
      setTitleDraft(exam.title);
      return;
    }
    setSavingTitle(true);
    try {
      await patchExam({ title: titleDraft.trim() });
      setEditingTitle(false);
    } catch {
      setTitleDraft(exam.title);
    } finally {
      setSavingTitle(false);
    }
  };

  const deleteExam = async () => {
    setIsDeleting(true);
    const res = await fetch(`/api/exams/${exam.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
    } else {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const generateMarking = async () => {
    if (!exam.predicted_exam || isGeneratingMarking) return;
    setIsGeneratingMarking(true);
    setMarkingContent("");
    setActiveTab("marking");
    try {
      const res = await fetch("/api/generate-marking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examContent: exam.predicted_exam, examId: exam.id }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setMarkingContent((p) => p + chunk);
      }
      setExam((p) => ({ ...p, marking_scheme: full }));
    } catch {
      setMarkingContent("**Error generating marking scheme.**");
    } finally {
      setIsGeneratingMarking(false);
    }
  };

  const sendMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || isChatStreaming) return;
    setChatInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const tempUserId = `u-${Date.now()}`;
    const tempAiId = `a-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: tempUserId, exam_id: exam.id, user_id: "", role: "user", content: text, created_at: new Date().toISOString() },
      { id: tempAiId, exam_id: exam.id, user_id: "", role: "assistant", content: "", created_at: new Date().toISOString() },
    ]);
    setIsChatStreaming(true);
    setStreamingMsgId(tempAiId);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: exam.id, message: text, context: chatContext }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => prev.map((m) => m.id === tempAiId ? { ...m, content: m.content + chunk } : m));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      setMessages((prev) => prev.map((m) => m.id === tempAiId ? { ...m, content: `**Error:** ${msg}` } : m));
    } finally {
      setIsChatStreaming(false);
      setStreamingMsgId(null);
    }
  }, [chatInput, isChatStreaming, exam.id]);

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const copyExam = async () => {
    const text = activeTab === "exam" ? exam.predicted_exam : markingContent;
    await navigator.clipboard.writeText(text);
    setCopyState("copied");
    setTimeout(() => setCopyState("idle"), 2000);
  };

  const handleDownloadPDF = () => {
    const ref = activeTab === "exam" ? examContentRef : markingContentRef;
    const html = ref.current?.innerHTML ?? "";
    if (!html) return;
    setIsDownloading(true);
    downloadPDF({
      title: exam.title,
      html,
      isFree: userTier === "free",
    });
    setTimeout(() => setIsDownloading(false), 1500);
  };

  const hasMarking = markingContent.length > 0;

  const SUGGESTIONS = V.suggestions;

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors shrink-0"
            aria-label="Go back"
          >
            <Icon d={ICONS.back} />
            <span className="font-bold text-indigo-400 hidden sm:block">Tausi</span>
          </button>
          <span className="text-gray-700 select-none">/</span>

          {/* Editable title */}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {editingTitle ? (
              <form onSubmit={(e) => { e.preventDefault(); saveTitle(); }} className="flex items-center gap-2 flex-1 min-w-0">
                <input ref={titleInputRef} value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => { if (e.key === "Escape") { setEditingTitle(false); setTitleDraft(exam.title); } }}
                  className="flex-1 min-w-0 bg-gray-800 border border-indigo-600 rounded-lg px-3 py-1 text-sm text-white outline-none"
                  disabled={savingTitle} />
              </form>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-sm font-semibold text-gray-200 truncate">{exam.title}</h1>
                {isOwner && (
                  <button onClick={() => setEditingTitle(true)}
                    className="text-gray-600 hover:text-gray-400 transition-colors shrink-0 p-0.5">
                    <Icon d={ICONS.pencil} size={3} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-600 hidden md:block" suppressHydrationWarning>
              {formatDate(exam.created_at)}
            </span>

            {/* Public/Private badge */}
            <span className={`hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${
              exam.is_public
                ? "text-emerald-400 border-emerald-800 bg-emerald-950/40"
                : "text-gray-500 border-gray-700 bg-gray-900"
            }`}>
              <Icon d={exam.is_public ? ICONS.globe : ICONS.lock} size={3} />
              {exam.is_public ? V.public : V.private}
            </span>

            {activeTab !== "chat" && (
              <button onClick={copyExam}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 rounded-lg px-2.5 py-1.5 transition-colors">
                <Icon d={copyState === "copied" ? ICONS.check : ICONS.copy} size={3} />
                <span className="hidden sm:block">{copyState === "copied" ? V.copied : V.copy}</span>
              </button>
            )}

            {activeTab !== "chat" && (
              <button onClick={handleDownloadPDF} disabled={isDownloading}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50">
                <Icon d={ICONS.pdf} size={3} />
                <span className="hidden sm:block">{isDownloading ? "…" : V.pdf}</span>
              </button>
            )}

            {isOwner && (
              <>
                <button onClick={toggleVisibility} disabled={isTogglingVisibility}
                  className={`flex items-center gap-1 text-xs border rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50 ${
                    exam.is_public
                      ? "text-emerald-400 border-emerald-800 hover:bg-emerald-950/40"
                      : "text-gray-400 border-gray-700 hover:text-white hover:border-gray-500"
                  }`}>
                  <Icon d={exam.is_public ? ICONS.lock : ICONS.globe} size={3} />
                  <span className="hidden md:block">{exam.is_public ? V.makePrivate : V.makePublic}</span>
                </button>

                {!showDeleteConfirm ? (
                  <button onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400 border border-red-900 hover:border-red-700 rounded-lg px-2.5 py-1.5 transition-colors">
                    <Icon d={ICONS.trash} size={3} />
                    <span className="hidden sm:block">{V.delete}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-red-400">{V.deleteConfirm}</span>
                    <button onClick={deleteExam} disabled={isDeleting}
                      className="text-xs text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg px-2.5 py-1 transition-colors">
                      {isDeleting ? "…" : V.yes}
                    </button>
                    <button onClick={() => setShowDeleteConfirm(false)}
                      className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-2.5 py-1 transition-colors">
                      {V.no}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Body — flex-1 min-h-0 lets this shrink to fit the remaining viewport */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT — exam content (hidden on mobile when chat tab is active) */}
        <div className={`flex-col flex-1 min-w-0 overflow-hidden border-r border-gray-800 ${
          activeTab === "chat" ? "hidden md:flex" : "flex"
        }`}>
          <div className="border-b border-gray-800 bg-gray-950 shrink-0">
            {/* ── Primary picker: Source Paper vs Predicted Exam ── */}
            <div className="flex items-center gap-2 px-3 pt-2 pb-2">
              {sourceSignedUrls.length > 0 ? (
                <div className="flex rounded-lg bg-gray-900 border border-gray-800 p-0.5 gap-px">
                  <button
                    onClick={() => setActiveTab("source")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                      activeTab === "source"
                        ? "bg-amber-500/20 text-amber-300 shadow-sm"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <Icon d={ICONS.file} size={3} />
                    Source Paper
                  </button>
                  <button
                    onClick={() => setActiveTab(activeTab === "marking" ? "marking" : "exam")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                      activeTab === "exam" || activeTab === "marking"
                        ? "bg-indigo-500/20 text-indigo-300 shadow-sm"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <Icon d={ICONS.sparkle} size={3} />
                    Predicted Exam
                  </button>
                </div>
              ) : (
                /* No source paper — flat tabs only */
                <div className="flex items-center gap-1">
                  {([
                    { key: "exam" as Tab, label: V.predictedExam, iconD: ICONS.sparkle, active: "text-indigo-300 border-indigo-500" },
                    { key: "marking" as Tab, label: V.markingScheme, iconD: ICONS.book, active: "text-emerald-300 border-emerald-500" },
                  ] as const).map(({ key, label, iconD, active }) => (
                    <button key={key} onClick={() => setActiveTab(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === key ? active : "text-gray-500 border-transparent hover:text-gray-300"
                      }`}>
                      <Icon d={iconD} size={3} />
                      {label}
                      {key === "marking" && isGeneratingMarking && <LoadingDots />}
                    </button>
                  ))}
                </div>
              )}

              {/* Mobile Chat tab */}
              <button
                onClick={() => setActiveTab("chat")}
                className={`md:hidden ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === "chat"
                    ? "bg-purple-500/20 text-purple-300"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <Icon d={ICONS.chat} size={3} />
                {V.chat}
              </button>
            </div>

            {/* ── Sub-tabs: Exam / Marking Scheme (only when Predicted is active) ── */}
            {sourceSignedUrls.length > 0 && (activeTab === "exam" || activeTab === "marking") && (
              <div className="flex items-center gap-1 px-3 border-t border-gray-800/60">
                {([
                  { key: "exam" as Tab, label: V.predictedExam, iconD: ICONS.sparkle, cls: "text-indigo-300 border-indigo-500" },
                  { key: "marking" as Tab, label: V.markingScheme, iconD: ICONS.book, cls: "text-emerald-300 border-emerald-500" },
                ] as const).map(({ key, label, iconD, cls }) => (
                  <button key={key} onClick={() => setActiveTab(key)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                      activeTab === key ? cls : "text-gray-500 border-transparent hover:text-gray-300"
                    }`}>
                    <Icon d={iconD} size={3} />
                    {label}
                    {key === "marking" && isGeneratingMarking && <LoadingDots />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={`flex-1 min-h-0 ${activeTab === "source" ? "flex flex-col overflow-hidden" : "overflow-y-auto p-6"}`}>
            {activeTab === "exam" && (
              <div ref={examContentRef}>
                <ExamOutput content={exam.predicted_exam} />
              </div>
            )}
            {activeTab === "source" && sourceSignedUrls.length > 0 && (() => {
              const currentUrl = sourceSignedUrls[activeSourceFile] ?? "";
              const currentPath = (exam.pdf_storage_paths as string[])[activeSourceFile] ?? "";
              return (
                <>
                  {/* File tabs */}
                  {exam.original_filenames.length > 1 && (
                    <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-800 bg-gray-950 shrink-0 overflow-x-auto">
                      {exam.original_filenames.map((name, i) => (
                        <button key={i} onClick={() => setActiveSourceFile(i)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                            activeSourceFile === i
                              ? "bg-gray-800 text-white"
                              : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
                          }`}>
                          <Icon d={ICONS.file} size={3} />
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* File bar */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900/60 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon d={ICONS.file} size={3} />
                      <span className="text-xs text-gray-400 truncate">
                        {exam.original_filenames[activeSourceFile] ?? "Source Paper"}
                      </span>
                    </div>
                    <a href={currentUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors shrink-0">
                      <Icon d={ICONS.external} size={3} />
                      <span className="hidden sm:inline">Open full</span>
                    </a>
                  </div>
                  {/* Viewer */}
                  <div className="flex-1 overflow-hidden bg-gray-900">
                    {isImage(currentPath) ? (
                      <div className="h-full overflow-y-auto flex items-start justify-center p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={currentUrl} alt={exam.original_filenames[activeSourceFile]}
                          className="max-w-full h-auto rounded-lg shadow-lg" />
                      </div>
                    ) : (
                      <iframe src={currentUrl} className="w-full h-full border-0"
                        title={exam.original_filenames[activeSourceFile]} />
                    )}
                  </div>
                </>
              );
            })()}
            {activeTab === "marking" && (
              hasMarking ? (
                <div ref={markingContentRef}>
                  <ExamOutput content={markingContent} isStreaming={isGeneratingMarking} />
                </div>
              ) : isOwner ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20">
                  <div className="w-14 h-14 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center">
                    <Icon d={ICONS.book} size={6} />
                  </div>
                  <div>
                    <p className="text-gray-300 font-medium mb-1">{V.noMarkingYet}</p>
                    <p className="text-sm text-gray-600 mb-4">{V.noMarkingSub}</p>
                    <button onClick={generateMarking}
                      className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors">
                      <Icon d={ICONS.book} />{V.generateMarking}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-gray-600">{V.notAvailable}</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* RIGHT — chat (full-width on mobile when chat tab, hidden otherwise) */}
        <div className={`flex-col min-h-0 overflow-hidden md:w-full md:max-w-md lg:max-w-lg md:shrink-0 ${
          activeTab === "chat" ? "flex w-full" : "hidden md:flex"
        }`}>
          <div className="border-b border-gray-800 shrink-0">
            <div className="px-4 py-3 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                <Icon d={ICONS.sparkle} size={3} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-200">{V.chatTitle}</p>
                <p className="text-xs text-gray-600 truncate">
                  {isOwner ? V.chatPrivate : V.chatPublic}
                </p>
              </div>
            </div>
            {sourceSignedUrls.length > 0 && (
              <div className="px-4 pb-3 flex items-center gap-2">
                <span className="text-xs text-gray-600 shrink-0">Ask about:</span>
                <div className="flex rounded-lg bg-gray-900 border border-gray-800 p-0.5 gap-px">
                  <button
                    onClick={() => setChatContext("predicted")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                      chatContext === "predicted"
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <Icon d={ICONS.sparkle} size={3} />
                    Predicted Exam
                  </button>
                  <button
                    onClick={() => setChatContext("source")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                      chatContext === "source"
                        ? "bg-amber-500/20 text-amber-300"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <Icon d={ICONS.file} size={3} />
                    Source Paper
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center">
                  <Icon d={ICONS.sparkle} size={5} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-1">{V.readyToHelp}</p>
                  <p className="text-xs text-gray-600 mb-4">{V.chatPrivateSub}</p>
                </div>
                <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => { setChatInput(s); textareaRef.current?.focus(); }}
                      className="text-left text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-600 rounded-lg px-3 py-2 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => {
              const isUser = msg.role === "user";
              const isStreamingThis = msg.id === streamingMsgId;
              return (
                <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && (
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-1 mr-2">
                      <Icon d={ICONS.sparkle} size={3} />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    isUser ? "bg-indigo-600 text-white text-sm" : "bg-gray-800/80 text-gray-100 text-sm"
                  }`}>
                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : msg.content ? (
                      <ExamOutput content={msg.content} isStreaming={isStreamingThis} />
                    ) : (
                      <LoadingDots />
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-gray-800 p-3 shrink-0">
            <div className="flex items-end gap-2">
              <textarea ref={textareaRef} value={chatInput} onChange={autoResize}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                disabled={isChatStreaming}
                placeholder={V.chatPlaceholder}
                rows={1}
                className="flex-1 bg-gray-900 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 resize-none overflow-hidden outline-none transition-colors disabled:opacity-50"
                style={{ minHeight: "42px", maxHeight: "160px" }} />
              <button onClick={sendMessage} disabled={!chatInput.trim() || isChatStreaming}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white transition-colors shrink-0"
                aria-label="Send">
                {isChatStreaming
                  ? <span className="w-4 h-4 border-2 border-gray-500 border-t-indigo-400 rounded-full animate-spin" />
                  : <Icon d={ICONS.send} />}
              </button>
            </div>
            <p className="text-xs text-gray-700 mt-1.5 text-center">
              {V.aiDisclaimer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

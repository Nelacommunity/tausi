"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ExamPaper } from "@/app/lib/types";
import { ExamOutput } from "@/app/components/ExamOutput";
import { useT } from "@/app/lib/language-context";

interface PaperViewProps {
  paper: ExamPaper;
  signedUrls: string[];
}

type GenPhase = "idle" | "generating" | "done" | "error";
type PanelTab = "generate" | "chat";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const TYPE_LABELS: Record<string, string> = {
  NECTA: "NECTA", KCSE: "KCSE", KCPE: "KCPE",
  IGCSE: "IGCSE", CAMBRIDGE_ALEVEL: "A-Level", IEB: "IEB", NSC: "NSC / Matric",
  WAEC: "WAEC", NECO: "NECO", ZIMSEC: "ZIMSEC", UNEB: "UNEB", UACE: "UACE",
  JC: "Junior Cert", OTHER: "Other",
};

const TYPE_COLORS: Record<string, string> = {
  NECTA: "bg-blue-950 text-blue-300 border-blue-800",
  KCSE:  "bg-emerald-950 text-emerald-300 border-emerald-800",
  KCPE:  "bg-emerald-950 text-emerald-300 border-emerald-800",
  IGCSE: "bg-violet-950 text-violet-300 border-violet-800",
  CAMBRIDGE_ALEVEL: "bg-violet-950 text-violet-300 border-violet-800",
  IEB:   "bg-amber-950 text-amber-300 border-amber-800",
  NSC:   "bg-amber-950 text-amber-300 border-amber-800",
  WAEC:  "bg-orange-950 text-orange-300 border-orange-800",
  NECO:  "bg-orange-950 text-orange-300 border-orange-800",
  ZIMSEC:"bg-cyan-950 text-cyan-300 border-cyan-800",
  UNEB:  "bg-pink-950 text-pink-300 border-pink-800",
  UACE:  "bg-pink-950 text-pink-300 border-pink-800",
};

function isImage(path: string) {
  return /\.(png|jpg|jpeg|webp)$/i.test(path);
}

const Icon = ({ d, size = 4 }: { d: string; size?: number }) => (
  <svg className={`w-${size} h-${size} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
  </svg>
);

const ICONS = {
  back:    "M10 19l-7-7m0 0l7-7m-7 7h18",
  sparkle: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
  eye:     "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  external:"M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25",
  file:    "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  check:   "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  warn:    "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
  arrow:   "M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3",
  chat:    "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z",
  send:    "M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5",
};

export function PaperView({ paper, signedUrls }: PaperViewProps) {
  const { T } = useT();
  const V = T.paperView;
  const [activeFile, setActiveFile]   = useState(0);
  const [phase, setPhase]             = useState<GenPhase>("idle");
  const [preview, setPreview]         = useState("");
  const [examId, setExamId]           = useState<string | null>(null);
  const [genError, setGenError]       = useState("");
  const [activePanel, setActivePanel] = useState<PanelTab>("generate");

  // Chat state
  const [chatMsgs, setChatMsgs]         = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput]       = useState("");
  const [chatStreaming, setChatStreaming] = useState(false);
  const [chatLoading, setChatLoading]   = useState(true);
  const chatBottomRef                   = useRef<HTMLDivElement>(null);
  const chatTextareaRef                 = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`/api/papers/${paper.id}/chat`)
      .then(r => r.ok ? r.json() : [])
      .then(msgs => { if (Array.isArray(msgs)) setChatMsgs(msgs); })
      .finally(() => setChatLoading(false));
  }, [paper.id]);

  const typeBadgeClass = TYPE_COLORS[paper.exam_type] ?? "bg-gray-800 text-gray-400 border-gray-700";
  const typeLabel      = TYPE_LABELS[paper.exam_type] ?? paper.exam_type;

  const startGenerate = async () => {
    if (phase === "generating") return;
    setPhase("generating");
    setPreview("");
    setExamId(null);
    setGenError("");

    try {
      const res = await fetch(`/api/papers/${paper.id}/generate`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Generation failed");
      }

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setPreview(full.replace(/<!--EXAM_ID:[^-]*-->/g, ""));
      }

      const match = full.match(/<!--EXAM_ID:([a-z0-9-]+)-->/);
      if (match?.[1]) {
        setExamId(match[1]);
        setPhase("done");
      } else {
        throw new Error("Generation completed but exam could not be saved.");
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
      setPhase("error");
    }
  };

  const sendChat = async (text?: string) => {
    const msg = (text ?? chatInput).trim();
    if (!msg || chatStreaming) return;
    setChatInput("");
    if (chatTextareaRef.current) chatTextareaRef.current.style.height = "auto";

    const uid = `u-${Date.now()}`;
    const aid = `a-${Date.now()}`;

    setChatMsgs(p => [
      ...p,
      { id: uid, role: "user", content: msg },
      { id: aid, role: "assistant", content: "" },
    ]);
    setChatStreaming(true);

    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const res = await fetch(`/api/papers/${paper.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        setChatMsgs(p => p.map(m => m.id === aid ? { ...m, content: m.content + chunk } : m));
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed";
      setChatMsgs(p => p.map(m => m.id === aid ? { ...m, content: `**Error:** ${errMsg}` } : m));
    } finally {
      setChatStreaming(false);
    }
  };

  const chatAutoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const currentUrl  = signedUrls[activeFile] ?? "";
  const currentPath = paper.file_paths[activeFile] ?? "";
  const fileIsImage = isImage(currentPath);

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <header className="shrink-0 border-b border-gray-800 bg-gray-950 z-20">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 min-w-0">
          <Link
            href="/papers"
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors shrink-0"
          >
            <Icon d={ICONS.back} />
            <span className="font-bold text-indigo-400 hidden sm:block">Tausi</span>
          </Link>
          <span className="text-gray-700 select-none">/</span>
          <span className="text-gray-500 text-sm hidden sm:block">{V.papersCrumb}</span>
          <span className="text-gray-700 select-none hidden sm:block">/</span>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-200 truncate">{paper.name}</h1>
            <span className={`hidden md:inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${typeBadgeClass}`}>
              {typeLabel}
            </span>
            <span className="hidden md:block text-xs text-gray-500 shrink-0">{paper.year}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <span className="text-xs text-gray-600 hidden sm:block">{paper.subject}</span>
            <span className="text-xs text-gray-700">·</span>
            <span className="text-xs text-gray-600">
              {paper.original_filenames.length} file{paper.original_filenames.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden flex-col md:flex-row">

        {/* ── LEFT: Original paper viewer ── */}
        <div className="flex flex-col flex-1 min-h-0 border-b md:border-b-0 md:border-r border-gray-800 overflow-hidden">

          {/* File tabs */}
          {paper.original_filenames.length > 1 && (
            <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-800 bg-gray-950 shrink-0 overflow-x-auto">
              {paper.original_filenames.map((name, i) => (
                <button
                  key={i}
                  onClick={() => setActiveFile(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                    activeFile === i
                      ? "bg-gray-800 text-white"
                      : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
                  }`}
                >
                  <Icon d={ICONS.file} size={3} />
                  {name}
                </button>
              ))}
            </div>
          )}

          {/* File header bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900/60 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Icon d={ICONS.eye} size={3} />
              <span className="text-xs text-gray-400 truncate">
                {paper.original_filenames[activeFile] ?? "File"}
              </span>
            </div>
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors shrink-0"
            >
              <Icon d={ICONS.external} size={3} />
              <span className="hidden sm:inline">{V.openFull}</span>
            </a>
          </div>

          {/* File content */}
          <div className="flex-1 overflow-hidden bg-gray-900">
            {currentUrl ? (
              fileIsImage ? (
                <div className="h-full overflow-y-auto flex items-start justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentUrl}
                    alt={paper.original_filenames[activeFile]}
                    className="max-w-full h-auto rounded-lg shadow-lg"
                  />
                </div>
              ) : (
                <iframe
                  src={currentUrl}
                  className="w-full h-full border-0"
                  title={paper.original_filenames[activeFile]}
                />
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-600">{V.fileNotAvailable}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Panel ── */}
        <div className="flex flex-col min-h-0 overflow-hidden md:w-[400px] md:shrink-0 bg-gray-950">

          {/* Tab bar */}
          <div className="flex shrink-0 border-b border-gray-800">
            <button
              onClick={() => setActivePanel("generate")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-colors ${
                activePanel === "generate"
                  ? "text-indigo-400 border-b-2 border-indigo-500 bg-gray-900/40"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon d={ICONS.sparkle} size={3} />

            </button>
            <button
              onClick={() => setActivePanel("chat")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-colors ${
                activePanel === "chat"
                  ? "text-indigo-400 border-b-2 border-indigo-500 bg-gray-900/40"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon d={ICONS.chat} size={3} />
              Ask AI
            </button>
          </div>

          {/* ── CHAT PANEL ── */}
          {activePanel === "chat" && (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-4">
                  {chatLoading && (
                    <div className="flex items-center justify-center min-h-[50vh]">
                      <span className="w-6 h-6 border-2 border-indigo-500/40 border-t-indigo-400 rounded-full animate-spin" />
                    </div>
                  )}
                  {!chatLoading && chatMsgs.length === 0 && (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-2">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Icon d={ICONS.chat} size={5} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-300 mb-1">{V.chatTitle}</p>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Ask questions about the exam content, get explanations, or discuss topics.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 w-full">
                        {[
                          "What topics does this exam cover?",
                          "Explain question 1 step by step",
                          "What formulas should I know?",
                          "What are common mistakes on this paper?",
                        ].map(s => (
                          <button
                            key={s}
                            onClick={() => sendChat(s)}
                            className="text-left text-xs text-gray-500 hover:text-gray-200 border border-gray-800 hover:border-gray-600 rounded-xl px-3 py-2.5 transition-all leading-relaxed"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {chatMsgs.map(msg => {
                    const isUser = msg.role === "user";
                    return (
                      <div key={msg.id} className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
                        {!isUser && (
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-1">
                            <Icon d={ICONS.sparkle} size={3} />
                          </div>
                        )}
                        <div className={`rounded-2xl px-3.5 py-2.5 text-sm max-w-[85%] ${
                          isUser ? "bg-indigo-600 text-white" : "bg-gray-800/80 text-gray-100"
                        }`}>
                          {isUser ? (
                            <p className="whitespace-pre-wrap leading-relaxed text-xs">{msg.content}</p>
                          ) : msg.content ? (
                            <ExamOutput content={msg.content} isStreaming={chatStreaming && msg.id === chatMsgs[chatMsgs.length - 1]?.id} />
                          ) : (
                            <span className="inline-flex gap-1">
                              {[0, 1, 2].map(i => (
                                <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                                  style={{ animationDelay: `${i * 0.15}s` }} />
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div ref={chatBottomRef} />
                </div>
              </div>

              {/* Input */}
              <div className="shrink-0 border-t border-gray-800 p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={chatTextareaRef}
                    value={chatInput}
                    onChange={chatAutoResize}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                    disabled={chatStreaming}
                    placeholder={V.chatPlaceholder}
                    rows={1}
                    className="flex-1 bg-gray-900 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-600 resize-none overflow-hidden outline-none transition-colors disabled:opacity-50"
                    style={{ minHeight: "36px", maxHeight: "120px" }}
                  />
                  <button
                    onClick={() => sendChat()}
                    disabled={!chatInput.trim() || chatStreaming}
                    className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white transition-colors shrink-0"
                  >
                    {chatStreaming
                      ? <span className="w-3.5 h-3.5 border-2 border-gray-500 border-t-indigo-400 rounded-full animate-spin" />
                      : <Icon d={ICONS.send} size={3} />
                    }
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── GENERATE PANEL ── */}
          {activePanel === "generate" && (
          <div className="flex-1 overflow-y-auto">

            {/* ── Idle: paper summary + generate button ── */}
            {phase === "idle" && (
              <div className="p-5 flex flex-col gap-5">

                {/* Paper info card */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border ${typeBadgeClass}`}>
                      {typeLabel}
                    </span>
                    <span className="text-sm font-bold text-gray-300">{paper.year}</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{paper.name}</p>
                  <p className="text-xs text-gray-500">{paper.subject}</p>
                  <div className="flex items-center gap-2 pt-1 border-t border-gray-800">
                    <Icon d={ICONS.file} size={3} />
                    <span className="text-xs text-gray-600">
                      {paper.original_filenames.join(", ")}
                    </span>
                  </div>
                </div>

                {/* What happens note */}
                <div className="bg-indigo-950/40 border border-indigo-900/50 rounded-xl p-3.5 space-y-1.5">
                  <p className="text-xs font-semibold text-indigo-300">{V.whatThisDoes}</p>
                  <ul className="space-y-1">
                    {[
                      V.does1, V.does2, V.does3,
                    ].map(t => (
                      <li key={t} className="flex items-start gap-1.5 text-xs text-gray-400">
                        <span className="text-indigo-400 mt-0.5 shrink-0">·</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Generate button */}
                <button
                  onClick={startGenerate}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm transition-colors"
                >
                  <Icon d={ICONS.sparkle} size={4} />

                </button>
              </div>
            )}

            {/* ── Generating: spinner + streaming preview ── */}
            {phase === "generating" && (
              <div className="p-5 flex flex-col gap-4">

                {/* Status */}
                <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl p-3.5">
                  <span className="w-5 h-5 border-2 border-indigo-500/40 border-t-indigo-400 rounded-full animate-spin shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-200">{V.generatingTitle}</p>
                    <p className="text-xs text-gray-600">{V.generatingSub}</p>
                  </div>
                </div>

                {/* Live preview */}
                {preview && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-gray-900/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                      <span className="text-xs text-indigo-400 font-medium">{V.livePreview}</span>
                    </div>
                    <div className="p-4 max-h-[400px] overflow-y-auto">
                      <ExamOutput content={preview} isStreaming />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Done: success + view link ── */}
            {phase === "done" && (
              <div className="p-5 flex flex-col gap-4">

                {/* Success banner */}
                <div className="flex items-start gap-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl p-4">
                  <Icon d={ICONS.check} size={5} />
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">{V.examGenerated}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">{V.savedToLibrary}</p>
                  </div>
                </div>

                {/* View exam button */}
                {examId && (
                  <Link
                    href={`/exams/${examId}`}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
                  >

                    <Icon d={ICONS.arrow} size={4} />
                  </Link>
                )}

                {/* Generate again */}
                <button
                  onClick={() => { setPhase("idle"); setPreview(""); setExamId(null); }}
                  className="w-full py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-sm transition-colors"
                >
                  {T.paperView.generateAnother}
                </button>

                {/* Preview */}
                {preview && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
                      <span className="text-xs text-gray-500 font-medium">{V.preview}</span>
                    </div>
                    <div className="p-4 max-h-[400px] overflow-y-auto">
                      <ExamOutput content={preview} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Error ── */}
            {phase === "error" && (
              <div className="p-5 flex flex-col gap-4">
                <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon d={ICONS.warn} size={4} />
                    <p className="text-sm font-semibold text-red-300">{V.generationFailed}</p>
                  </div>
                  <p className="text-xs text-red-400">{genError}</p>
                </div>
                <button
                  onClick={() => { setPhase("idle"); setGenError(""); }}
                  className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors"
                >

                </button>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ExamOutput } from "@/app/components/ExamOutput";
import type { StudySession, StudyMessage } from "@/app/lib/types";
import { useT } from "@/app/lib/language-context";

function LoadingDots() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

function relativeDate(iso: string) {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString("en-GB", { weekday: "long" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function StudySessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { T } = useT();
  const S = T.study;

  const [session, setSession] = useState<StudySession | null>(null);
  const [messages, setMessages] = useState<StudyMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`/api/study/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(({ session, messages }) => { setSession(session); setMessages(messages); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetch("/api/study")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSessions(d); });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isStreaming) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const uid = `u-${Date.now()}`;
    const aid = `a-${Date.now()}`;
    const now = new Date().toISOString();

    setMessages(p => [
      ...p,
      { id: uid, session_id: id, user_id: "", role: "user", content: msg, created_at: now },
      { id: aid, session_id: id, user_id: "", role: "assistant", content: "", created_at: now },
    ]);
    setIsStreaming(true);
    setStreamingId(aid);

    try {
      const res = await fetch(`/api/study/${id}`, {
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
        setMessages(p => p.map(m => m.id === aid ? { ...m, content: m.content + chunk } : m));
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed";
      setMessages(p => p.map(m => m.id === aid ? { ...m, content: `**Error:** ${errMsg}` } : m));
    } finally {
      setIsStreaming(false);
      setStreamingId(null);
    }
  }, [input, isStreaming, id]);

  const copyMessage = useCallback((msgId: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const regenerate = useCallback(async (assistantMsgId: string) => {
    if (isStreaming) return;
    const idx = messages.findIndex(m => m.id === assistantMsgId);
    if (idx < 1 || messages[idx - 1].role !== "user") return;
    const userContent = messages[idx - 1].content;
    const newAid = `a-${Date.now()}`;
    const now = new Date().toISOString();

    setMessages(p => [
      ...p.slice(0, idx),
      { id: newAid, session_id: id, user_id: "", role: "assistant", content: "", created_at: now },
    ]);
    setIsStreaming(true);
    setStreamingId(newAid);

    try {
      const res = await fetch(`/api/study/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userContent }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        setMessages(p => p.map(m => m.id === newAid ? { ...m, content: m.content + chunk } : m));
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed";
      setMessages(p => p.map(m => m.id === newAid ? { ...m, content: `**Error:** ${errMsg}` } : m));
    } finally {
      setIsStreaming(false);
      setStreamingId(null);
    }
  }, [messages, isStreaming, id]);

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  if (loading) return (
    <div className="h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="h-screen bg-gray-950 flex flex-col items-center justify-center gap-3">
      <p className="text-gray-400 text-sm">Session not found.</p>
      <Link href="/study" className="text-cyan-400 text-sm hover:underline">Back to Study Room</Link>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden text-white">

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        flex flex-col w-64 shrink-0
        bg-gray-900 border-r border-gray-800
        transition-transform duration-200 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* New session */}
        <div className="p-3 border-b border-gray-800 shrink-0">
          <Link
            href="/study"
            className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Session
          </Link>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          {sessions.length > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 px-4 pt-1 pb-2">
                Recent
              </p>
              <nav className="space-y-px px-2">
                {sessions.map(s => (
                  <Link
                    key={s.id}
                    href={`/study/${s.id}`}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex flex-col rounded-lg px-3 py-2.5 transition-colors group ${
                      s.id === id
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:text-white hover:bg-gray-800/60"
                    }`}
                  >
                    <span className="text-sm leading-snug truncate">{s.title}</span>
                    <span className="text-[11px] text-gray-600 group-hover:text-gray-500 mt-0.5">
                      {relativeDate(s.created_at)}
                    </span>
                  </Link>
                ))}
              </nav>
            </>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm shrink-0">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="lg:hidden p-1.5 -ml-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-200 truncate">{session?.title}</h1>
            <p className="text-xs text-gray-600 truncate leading-tight">{session?.original_filenames?.join(", ")}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            {S.heading}
          </div>
        </header>

        {/* Messages — scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">

            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-300 mb-1">I&apos;ve reviewed your documents</p>
                  <p className="text-sm text-gray-500 mb-5">
                    Ask me anything about the exam — I&apos;ll explain concepts, walk through questions, and help you prepare.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {S.suggestions.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="text-left text-xs text-gray-500 hover:text-gray-200 border border-gray-800 hover:border-gray-600 rounded-xl px-4 py-3 transition-all leading-relaxed">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => {
              const isUser = msg.role === "user";
              const isThisStreaming = msg.id === streamingId;
              return (
                <div key={msg.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center shrink-0 mt-1">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                  )}
                  <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"} max-w-[80%]`}>
                    <div className={`rounded-2xl px-4 py-3 text-sm w-full ${
                      isUser ? "bg-cyan-700 text-white" : "bg-gray-800/80 text-gray-100"
                    }`}>
                      {isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : msg.content ? (
                        <ExamOutput content={msg.content} isStreaming={isThisStreaming} />
                      ) : (
                        <LoadingDots />
                      )}
                    </div>
                    {!isUser && msg.content && !isThisStreaming && (
                      <div className="flex items-center gap-1 px-1">
                        <button
                          onClick={() => copyMessage(msg.id, msg.content)}
                          title="Copy"
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-cyan-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copy
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => regenerate(msg.id)}
                          disabled={isStreaming}
                          title="Regenerate"
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 disabled:opacity-40 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Regenerate
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input — fixed at bottom */}
        <div className="shrink-0 border-t border-gray-800 bg-gray-950 px-4 sm:px-6 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={autoResize}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                disabled={isStreaming}
                placeholder={S.chatPlaceholder}
                rows={1}
                className="flex-1 bg-gray-900 border border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 resize-none overflow-hidden outline-none transition-colors disabled:opacity-50"
                style={{ minHeight: "42px", maxHeight: "160px" }}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || isStreaming}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-800 disabled:text-gray-600 text-white transition-colors shrink-0"
                aria-label="Send"
              >
                {isStreaming
                  ? <span className="w-4 h-4 border-2 border-gray-500 border-t-cyan-400 rounded-full animate-spin" />
                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                }
              </button>
            </div>
            <p className="text-xs text-gray-700 mt-1.5 text-center">{S.disclaimer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ExamOutput } from "@/app/components/ExamOutput";
import { Header } from "@/app/components/Header";
import type { StudySession, StudyMessage } from "@/app/lib/types";
import { useT } from "@/app/lib/language-context";

function LoadingDots() {
  return <span className="inline-flex gap-1">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</span>;
}

// suggestions are loaded from translations inside the component

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
      if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error ?? res.statusText);
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        setMessages(p => p.map(m => m.id === aid ? { ...m, content: m.content + chunk } : m));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      setMessages(p => p.map(m => m.id === aid ? { ...m, content: `**Error:** ${msg}` } : m));
    } finally {
      setIsStreaming(false);
      setStreamingId(null);
    }
  }, [input, isStreaming, id]);

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-gray-400 text-sm">Session not found.</p>
        <Link href="/study" className="text-cyan-400 text-sm hover:underline">Back to Study Room</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 max-w-4xl mx-auto">
          <Link href="/study" className="text-gray-400 hover:text-white transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-200 truncate">{session?.title}</h1>
            <p className="text-xs text-gray-600 truncate">{session?.original_filenames?.join(", ")}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            {S.heading}
          </div>
        </div>
      </header>

      {/* Chat */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full" style={{ height: "calc(100vh - 57px)" }}>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5">

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold text-gray-300 mb-1">I&apos;ve reviewed your documents</p>
                <p className="text-sm text-gray-600 mb-5">Ask me anything about the exam — I&apos;ll explain concepts, walk through questions, and help you prepare.</p>
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
            return (
              <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"} gap-3`}>
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center shrink-0 mt-1">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${isUser ? "bg-cyan-700 text-white" : "bg-gray-800/80 text-gray-100"}`}>
                  {isUser ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : msg.content ? (
                    <ExamOutput content={msg.content} isStreaming={msg.id === streamingId} />
                  ) : (
                    <LoadingDots />
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-800 px-4 sm:px-6 py-3">
          <div className="flex items-end gap-2">
            <textarea ref={textareaRef} value={input} onChange={autoResize}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              disabled={isStreaming}
              placeholder={S.chatPlaceholder}
              rows={1}
              className="flex-1 bg-gray-900 border border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 resize-none overflow-hidden outline-none transition-colors disabled:opacity-50"
              style={{ minHeight: "42px", maxHeight: "160px" }} />
            <button onClick={() => send()} disabled={!input.trim() || isStreaming}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-800 disabled:text-gray-600 text-white transition-colors shrink-0"
              aria-label="Send">
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
  );
}

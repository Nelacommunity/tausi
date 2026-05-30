"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/app/components/Header";
import type { StudySession } from "@/app/lib/types";
import { useT } from "@/app/lib/language-context";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function LoadingDots() {
  return <span className="inline-flex gap-1 ml-1">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</span>;
}

export default function StudyPage() {
  const router = useRouter();
  const { T } = useT();
  const S = T.study;
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/study").then(r => r.json()).then(d => { if (Array.isArray(d)) setSessions(d); }).finally(() => setLoadingSessions(false));
  }, []);

  const addFiles = useCallback((newFiles: File[]) => {
    const valid = newFiles.filter(f => ["application/pdf","image/png","image/jpeg","image/webp"].includes(f.type));
    setFiles(p => { const ex = new Set(p.map(f => f.name+f.size)); return [...p, ...valid.filter(f => !ex.has(f.name+f.size))]; });
  }, []);

  const startSession = async () => {
    if (!files.length) { setError("Upload at least one exam paper or study document."); return; }
    setError(""); setIsCreating(true);
    const fd = new FormData();
    files.forEach(f => fd.append("files", f));
    fd.append("title", title || files[0].name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
    try {
      const res = await fetch("/api/study", { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error || res.statusText); }
      const { id } = await res.json();
      router.push(`/study/${id}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); setIsCreating(false); }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{S.heading}</h1>
          <p className="text-sm text-gray-500">{S.subtitle}</p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 space-y-5">

          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1.5">{S.sessionTitle} <span className="text-gray-600">({T.common.optional})</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} disabled={isCreating}
              placeholder={S.titlePlaceholder}
              className="w-full rounded-xl bg-gray-900 border border-gray-700 focus:border-cyan-500 text-gray-200 placeholder-gray-600 text-sm px-4 py-2.5 outline-none transition-colors disabled:opacity-50" />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1.5">Exam paper(s) or study documents <span className="text-red-400">*</span></label>
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={e => { e.preventDefault(); setIsDragging(false); addFiles(Array.from(e.dataTransfer.files)); }}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${isDragging ? "border-cyan-400 bg-cyan-950/20" : "border-gray-700 hover:border-gray-500 bg-gray-900/40"}`}>
              <svg className="w-9 h-9 text-gray-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-sm text-gray-300 font-medium">{T.dashboard.dropFiles} <span className="text-cyan-400 underline">{T.dashboard.browse}</span></p>
              <p className="text-xs text-gray-600 mt-1">{S.filesHint} — {S.files}</p>
              <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" multiple
                onChange={e => { if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = ""; } }}
                className="hidden" />
            </div>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {files.map((f, i) => (
                  <li key={f.name+f.size} className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2">
                    <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="flex-1 truncate">{f.name}</span>
                    <button onClick={() => setFiles(p => p.filter((_,j)=>j!==i))} disabled={isCreating}
                      className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50">✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-2.5 text-sm text-red-300">{error}</div>}

          <button onClick={startSession} disabled={isCreating || !files.length}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-3 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            {isCreating ? <>{S.starting}<LoadingDots /></> : S.startSession}
          </button>
        </div>

        {/* Past sessions */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-300">{S.prevSessions}</h2>
          {loadingSessions ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1,2].map(i => <div key={i} className="h-20 rounded-xl bg-gray-900/50 border border-gray-800 animate-pulse" />)}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-6 text-center text-sm text-gray-600">
              {S.noSessions}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sessions.map(s => (
                <a key={s.id} href={`/study/${s.id}`}
                  className="block rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-900 hover:border-gray-600 p-4 transition-all group">
                  <h3 className="text-sm font-semibold text-gray-200 group-hover:text-white truncate mb-1">{s.title}</h3>
                  <p className="text-xs text-gray-600 truncate mb-1">{s.original_filenames?.join(", ")}</p>
                  <p className="text-xs text-gray-700">{formatDate(s.created_at)}</p>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
